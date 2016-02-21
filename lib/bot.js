import _ from 'lodash';
import fs from 'fs';
import irc from 'irc';
import logger from 'winston';
import md5 from 'md5';
import Slack from 'slack-client';
import { ConfigurationError } from './errors';
import emojis from '../assets/emoji.json';
import { validateChannelMapping } from './validators';
import { highlightUsername } from './helpers';

const ALLOWED_SUBTYPES = ['me_message'];
const REQUIRED_FIELDS = ['server', 'nickname', 'channelMapping', 'token'];

/**
 * An IRC bot, works as a middleman for all communication
 * @param {object} options
 */
class Bot {
  constructor(options) {
    REQUIRED_FIELDS.forEach(field => {
      if (!options[field]) {
        throw new ConfigurationError('Missing configuration field ' + field);
      }
    });

    validateChannelMapping(options.channelMapping);

    this.slack = new Slack(options.token);

    this.server = options.server;
    this.nickname = options.nickname;
    this.ircOptions = options.ircOptions;
    this.ircStatusNotices = options.ircStatusNotices || {};
    this.commandCharacters = options.commandCharacters || [];
    this.channels = _.values(options.channelMapping);
    this.muteSlackbot = options.muteSlackbot || false;

    this.channelMapping = {};

    // Remove channel passwords from the mapping and lowercase IRC channel names
    _.forOwn(options.channelMapping, (ircChan, slackChan) => {
      this.channelMapping[slackChan] = ircChan.split(' ')[0].toLowerCase();
    }, this);

    this.invertedMapping = _.invert(this.channelMapping);
    this.autoSendCommands = options.autoSendCommands || [];

    if (options.gravatars) {
      const updateGravatars = () => {
        logger.debug('Updating gravatars: ', options.gravatars);
        this.gravatars = [];
        JSON.parse(fs.readFileSync(options.gravatars, 'utf8')).forEach(pair => {
          this.gravatars.push({
            re: new RegExp(pair[0], 'i'),
            email: pair[1]
          });
        });
      };

      fs.watch(options.gravatars, updateGravatars);
      updateGravatars();
    } else {
      this.gravatars = [];
    }
  }

  connect() {
    logger.debug('Connecting to IRC and Slack');
    this.slack.login();

    const ircOptions = {
      userName: this.nickname,
      realName: this.nickname,
      channels: this.channels,
      floodProtection: true,
      floodProtectionDelay: 500,
      ...this.ircOptions
    };

    this.ircClient = new irc.Client(this.server, this.nickname, ircOptions);
    this.attachListeners();
  }

  attachListeners() {
    this.slack.on('open', () => {
      logger.debug('Connected to Slack');
    });

    this.ircClient.on('registered', message => {
      logger.debug('Registered event: ', message);
      this.autoSendCommands.forEach(element => {
        this.ircClient.send(...element);
      });
    });

    this.ircClient.on('error', error => {
      logger.error('Received error event from IRC', error);
    });

    this.slack.on('error', error => {
      logger.error('Received error event from Slack', error);
    });

    this.slack.on('message', message => {
      // Ignore bot messages and people leaving/joining
      if (message.type === 'message' &&
        (!message.subtype || ALLOWED_SUBTYPES.indexOf(message.subtype) > -1)) {
        this.sendToIRC(message);
      }
    });

    this.ircClient.on('message', this.sendToSlack.bind(this));

    this.ircClient.on('notice', (author, to, text) => {
      const formattedText = '*' + text + '*';
      this.sendToSlack(author, to, formattedText);
    });

    this.ircClient.on('action', (author, to, text) => {
      const formattedText = '_' + text + '_';
      this.sendToSlack(author, to, formattedText);
    });

    this.ircClient.on('invite', (channel, from) => {
      logger.debug('Received invite:', channel, from);
      if (!this.invertedMapping[channel]) {
        logger.debug('Channel not found in config, not joining:', channel);
      } else {
        this.ircClient.join(channel);
        logger.debug('Joining channel:', channel);
      }
    });

    if (this.ircStatusNotices.join) {
      this.ircClient.on('join', (channel, nick) => {
        if (nick !== this.nickname) {
          this.sendToSlack(this.nickname, channel, `*${nick}* has joined the IRC channel`);
        }
      });
    }

    if (this.ircStatusNotices.leave) {
      this.ircClient.on('part', (channel, nick) => {
        this.sendToSlack(this.nickname, channel, `*${nick}* has left the IRC channel`);
      });

      this.ircClient.on('quit', (nick, reason, channels) => {
        channels.forEach(channel => {
          this.sendToSlack(this.nickname, channel, `*${nick}* has quit the IRC channel`);
        });
      });
    }
  }

  parseText(text) {
    return text
      .replace(/\n|\r\n|\r/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/<!channel>/g, '@channel')
      .replace(/<!group>/g, '@group')
      .replace(/<!everyone>/g, '@everyone')
      .replace(/<#(C\w+)\|?(\w+)?>/g, (match, channelId, readable) => {
        const { name } = this.slack.getChannelByID(channelId);
        return readable || `#${name}`;
      })
      .replace(/<@(U\w+)\|?(\w+)?>/g, (match, userId, readable) => {
        const { name } = this.slack.getUserByID(userId);
        return readable || `@${name}`;
      })
      .replace(/<(?!!)(\S+)>/g, (match, link) => link)
      .replace(/<!(\w+)\|?(\w+)?>/g, (match, command, label) =>
        `<${label || command}>`
      )
      .replace(/\:(\w+)\:/g, (match, emoji) => {
        if (emoji in emojis) {
          return emojis[emoji];
        }

        return match;
      });
  }

  isCommandMessage(message) {
    return this.commandCharacters.indexOf(message[0]) !== -1;
  }

  sendToIRC(message) {
    const channel = this.slack.getChannelGroupOrDMByID(message.channel);
    if (!channel) {
      logger.info('Received message from a channel the bot isn\'t in:',
        message.channel);
      return;
    }

    if (this.muteSlackbot && message.user === 'USLACKBOT') {
      logger.debug(`Muted message from Slackbot: "${message.text}"`);
      return;
    }

    const channelName = channel.is_channel ? `#${channel.name}` : channel.name;
    const ircChannel = this.channelMapping[channelName];

    logger.debug('Channel Mapping', channelName, this.channelMapping[channelName]);
    if (ircChannel) {
      const user = this.slack.getUserByID(message.user);
      let text = this.parseText(message.getBody());

      if (this.isCommandMessage(text)) {
        const prelude = `Command sent from Slack by ${user.name}:`;
        this.ircClient.say(ircChannel, prelude);
      } else if (!message.subtype) {
        text = `<${user.name}> ${text}`;
      } else if (message.subtype === 'me_message') {
        text = `Action: ${user.name} ${text}`;
      }
      logger.debug('Sending message to IRC', channelName, text);
      this.ircClient.say(ircChannel, text);
    }
  }

  findGravatar(author) {
    for (let i = 0; i < this.gravatars.length; i++) {
      const pair = this.gravatars[i];
      if (pair.re.test(author)) {
        const sum = md5(pair.email);
        return `http://www.gravatar.com/avatar/${sum}?s=48`;
      }
    }

    return false;
  }

  sendToSlack(author, channel, text) {
    const slackChannelName = this.invertedMapping[channel.toLowerCase()];
    if (slackChannelName) {
      const slackChannel = this.slack.getChannelGroupOrDMByName(slackChannelName);

      // If it's a private group and the bot isn't in it, we won't find anything here.
      // If it's a channel however, we need to check is_member.
      if (!slackChannel || (!slackChannel.is_member && !slackChannel.is_group)) {
        logger.info('Tried to send a message to a channel the bot isn\'t in: ',
          slackChannelName);
        return;
      }

      const currentChannelUsernames = slackChannel.members.map(member =>
        this.slack.getUserByID(member).name
      );

      const mappedText = currentChannelUsernames.reduce((current, username) =>
        highlightUsername(username, current)
      , text);

      let icon = this.findGravatar(author);
      if (!icon) {
        icon = `http://api.adorable.io/avatars/48/${author}.png`;
      }

      const message = {
        text: mappedText,
        username: author,
        parse: 'full',
        icon_url: author !== this.nickname ? icon : undefined
      };

      logger.debug('Sending message to Slack', message, channel, '->', slackChannelName);
      slackChannel.postMessage(message);
    }
  }
}

export default Bot;
