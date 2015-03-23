var _ = require('lodash');
var irc = require('irc');
var logger = require('winston');
var Slack = require('slack-client');
var errors = require('./errors');
var validateChannelMapping = require('./validators').validateChannelMapping;

var REQUIRED_FIELDS = ['server', 'nickname', 'channelMapping', 'token'];

/**
 * An IRC bot, works as a middleman for all communication
 * @param {object} options - server, nickname, channelMapping, outgoingToken, incomingURL
 */
function Bot(options) {
  REQUIRED_FIELDS.forEach(function(field) {
    if (!options[field]) {
      throw new errors.ConfigurationError('Missing configuration field ' + field);
    }
  });
  validateChannelMapping(options.channelMapping);

  this.slack = new Slack(options.token);

  this.server = options.server;
  this.nickname = options.nickname;
  this.channelMapping = validateChannelMapping(options.channelMapping);
  this.invertedMapping = _.invert(this.channelMapping);
  this.channels = _.values(this.channelMapping);
  this.autoSendCommands = options.autoSendCommands || [];

  logger.debug('Connecting to IRC and Slack');
  this.slack.login();
  this.ircClient = new irc.Client(this.server, this.nickname, {
    userName: this.nickname,
    realName: this.nickname,
    channels: this.channels
  });

  this.attachListeners();
}

Bot.prototype.sendRawToSlack = function(obj){
    var slackChannelName = this.invertedMapping[obj.args[0]];
    if (slackChannelName) {
        var slackChannel = this.slack.getChannelGroupOrDMByName(slackChannelName);

        if (!slackChannel) {
            logger.info(
                'Tried to send a message to a channel the bot isn\'t in: ' + slackChannelName
            );
            return;
        }
        
        var msg = obj.args[1];
        if (! msg) {
            return;
        }
        
        var message = {
            text: obj.args[1].replace(/ACTION/, obj.nick),
            username: obj.nick,
            parse: 'full',
            icon_url: 'http://api.adorable.io/avatars/48/' + obj.nick + '.png'
        };
        
        logger.debug('Sending message to Slack', message);
        console.log(message);
        slackChannel.postMessage(message);
    }
}

Bot.prototype.sendToSlack = function(author, channel, text) {
  var slackChannelName = this.invertedMapping[channel];
  if (slackChannelName) {
    var slackChannel = this.slack.getChannelGroupOrDMByName(slackChannelName);

    if (!slackChannel) {
      logger.info(
        'Tried to send a message to a channel the bot isn\'t in: ' + slackChannelName
      );
      return;
    }

    var message = {
      text: text,
      username: author,
      parse: 'full',
      icon_url: 'http://api.adorable.io/avatars/48/' + author + '.png'
    };
    logger.debug('Sending message to Slack', message);
    slackChannel.postMessage(message);
  }
};

Bot.prototype.attachListeners = function() {
  this.slack.on('open', function() {
    logger.debug('Connected to Slack');
  });

  this.ircClient.on('registered', function(message) {
    logger.debug('Registered event: ', message);
    this.autoSendCommands.forEach(function(element) {
      this.ircClient.send.apply(this.ircClient, element);
    }, this);
  }.bind(this));

  this.ircClient.on('error', function(error) {
    logger.error('Received error event from IRC', error);
  });

  this.slack.on('error', function(error) {
    logger.error('Received error event from Slack', error);
  });

  this.slack.on('message', function(message) {
    if (message.type === 'message' && message.subtype !== 'bot_message') {
      this.sendMessage(message);
    }
  }.bind(this));

  this.ircClient.on('message', this.sendToSlack.bind(this));
  
  this.ircClient.on('raw', this.sendRawToSlack.bind(this));

  this.ircClient.on('invite', function(channel, from, message) {
    logger.debug('Received invite:', channel, from, message);
    if (this.channels.indexOf(channel) > -1) {
      this.ircClient.join(channel);
      logger.debug('Joining channel:', channel);
    } else {
      logger.debug('Channel not found in config, not joining:', channel);
    }
  }.bind(this));
};

Bot.prototype.sendMessage = function(message) {
  var channel = this.slack.getChannelGroupOrDMByID(message.channel);
  var channelName = channel.is_channel ? '#' + channel.name : channel.name;
  var ircChannel = this.channelMapping[channelName];
  if (ircChannel) {
    var user = this.slack.getUserByID(message.user);
    var text = '<' + user.name + '> ' + message.getBody();
    logger.debug('Sending message to IRC', channelName, text);
    this.ircClient.say(ircChannel, text);
  }
};

module.exports = Bot;
