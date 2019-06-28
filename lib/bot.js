import _ from 'lodash';
import irc from 'irc-upd';
import logger from 'winston';
import { MemoryDataStore, RtmClient, WebClient } from '@slack/client';
import { ConfigurationError } from './errors';
import emojis from '../assets/emoji.json';
import { validateChannelMapping } from './validators';
import { highlightUsername } from './helpers';

const ALLOWED_SUBTYPES = ['me_message', 'file_share'];
const REQUIRED_FIELDS = ['server', 'nickname', 'channelMapping', 'token'];

/**
 * An IRC bot, works as a middleman for all communication
 * @param {object} options
 */
class Bot {
  constructor(options) {
    REQUIRED_FIELDS.forEach((field) => {
      if (!options[field]) {
        throw new ConfigurationError(`Missing configuration field ${field}`);
      }
    });

    validateChannelMapping(options.channelMapping);

    const web = new WebClient(options.token);
    const rtm = new RtmClient(options.token, { dataStore: new MemoryDataStore() });
    if (options.user_token) {
      const web_user = new WebClient(options.user_token);
      this.slack = { web, web_user, rtm };
      }
    else {
      this.slack = { web, rtm };
      }
    this.server = options.server;
    this.nickname = options.nickname;
    this.ircOptions = options.ircOptions;
    this.ircStatusNotices = options.ircStatusNotices || {};
    this.commandCharacters = options.commandCharacters || [];
    this.channels = _.values(options.channelMapping);
    this.muteSlackbot = options.muteSlackbot || false;
    this.muteUsers = {
      slack: [],
      irc: [],
      ...options.muteUsers
    };

    const defaultUrl = 'http://api.adorable.io/avatars/48/$username.png';
    // Disable if it's set to false, override default with custom if available:
    this.avatarUrl = options.avatarUrl !== false && (options.avatarUrl || defaultUrl);
    this.slackUsernameFormat = options.slackUsernameFormat || '$username (IRC)';
    this.ircUsernameFormat = options.ircUsernameFormat == null ? '<$username> ' : options.ircUsernameFormat;
    this.channelMapping = {};

    // Remove channel passwords from the mapping and lowercase IRC channel names
    _.forOwn(options.channelMapping, (ircChan, slackChan) => {
      this.channelMapping[slackChan] = ircChan.split(' ')[0].toLowerCase();
    }, this);

    this.invertedMapping = _.invert(this.channelMapping);
    this.autoSendCommands = options.autoSendCommands || [];
  }

  connect() {
    logger.debug('Connecting to IRC and Slack');
    this.slack.rtm.start();

    const ircOptions = {
      userName: this.nickname,
      realName: this.nickname,
      channels: this.channels,
      floodProtection: true,
      floodProtectionDelay: 500,
      retryCount: 10,
      ...this.ircOptions
    };

    this.ircClient = new irc.Client(this.server, this.nickname, ircOptions);
    this.attachListeners();
  }

  attachListeners() {
    this.slack.rtm.on('open', () => {
      logger.debug('Connected to Slack');
    });

    this.ircClient.on('registered', (message) => {
      logger.debug('Registered event: ', message);
      this.autoSendCommands.forEach((element) => {
        this.ircClient.send(...element);
      });
    });

    this.ircClient.on('error', (error) => {
      logger.error('Received error event from IRC', error);
    });

    this.ircClient.on('abort', () => {
      logger.error('Maximum IRC retry count reached, exiting.');
      process.exit(1);
    });

    this.slack.rtm.on('error', (error) => {
      logger.error('Received error event from Slack', error);
    });

    this.slack.rtm.on('message', (message) => {
      // Ignore bot messages and people leaving/joining
      if (message.type === 'message' &&
        (!message.subtype || ALLOWED_SUBTYPES.indexOf(message.subtype) > -1)) {
        this.sendToIRC(message);
      }
    });

    this.ircClient.on('message', this.sendToSlack.bind(this));

    this.ircClient.on('notice', (author, to, text) => {
      const formattedText = `*${text}*`;
      this.sendToSlack(author, to, formattedText);
    });

    this.ircClient.on('action', (author, to, text) => {
      const formattedText = `_${text}_`;
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
        channels.forEach((channel) => {
          this.sendToSlack(this.nickname, channel, `*${nick}* has quit the IRC channel`);
        });
      });
    }
  }

  parseText(text) {
    const { dataStore } = this.slack.rtm;
    return text
      .replace(/\n|\r\n|\r/g, ' ')
      .replace(/<!channel>/g, '@channel')
      .replace(/<!group>/g, '@group')
      .replace(/<!everyone>/g, '@everyone')
      .replace(/<#(C\w+)\|?(\w+)?>/g, (match, channelId, readable) => {
        const { name } = dataStore.getChannelById(channelId);
        return readable || `#${name}`;
      })
      .replace(/<@(U\w+)\|?(\w+)?>/g, (match, userId, readable) => {
        const { name } = dataStore.getUserById(userId);
        return readable || `@${name}`;
      })
      .replace(/<(?!!)([^|]+?)>/g, (match, link) => link)
      .replace(/<!(\w+)\|?(\w+)?>/g, (match, command, label) =>
        `<${label || command}>`
      )
      .replace(/:(\w+):/g, (match, emoji) => {
        if (emoji in emojis) {
          return emojis[emoji];
        }

        return match;
      })
      .replace(/<.+?\|(.+?)>/g, (match, readable) => readable)
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  isCommandMessage(message) {
    return this.commandCharacters.indexOf(message[0]) !== -1;
  }

  sendToIRC(message) {
    const { dataStore } = this.slack.rtm;
    const channel = dataStore.getChannelGroupOrDMById(message.channel);
    if (!channel) {
      logger.info('Received message from a channel the bot isn\'t in:',
        message.channel);
      return;
    }

    if (this.muteSlackbot && message.user === 'USLACKBOT') {
      logger.debug(`Muted message from Slackbot: "${message.text}"`);
      return;
    }

    const user = dataStore.getUserById(message.user);
    const username = this.ircUsernameFormat.replace(/\$username/g, user.name);

    if (this.muteUsers.slack.indexOf(user.name) !== -1) {
      logger.debug(`Muted message from Slack ${user.name}: ${message.text}`);
      return;
    }

    const channelName = channel.is_channel ? `#${channel.name}` : channel.name;
    const ircChannel = this.channelMapping[channelName];

    logger.debug('Channel Mapping', channelName, this.channelMapping[channelName]);
    if (ircChannel) {
      let text = this.parseText(message.text);
      //logger.debug(message.subtype);
      //debugger;
      if (this.isCommandMessage(text)) {
        const prelude = `Command sent from Slack by ${user.name}:`;
        this.ircClient.say(ircChannel, prelude);
      } else if (!message.files) {
        text = `${username}${text}`;
      } else if (message.files.length > 0) {
                //logger.debug(this.slack.web_user);
		if (this.slack.web_user)
			this.slack.web_user.files.sharedPublicURL(message.files[0].id);

		var real_comment="";
		var real_url="";
		text = "";
		try {
			var https = require('https');
			var request = https.get(message.files[0].permalink_public, (res) => {
				const { statusCode } = res;
                                //logger.debug(statusCode);
				if (statusCode !== 200) {
					logger.info('Received non-200 status code when requesting:',
					message.files[0].permalink_public);
					return;
				}

				res.setEncoding('utf8');
				let rawData = '';
				res.on('data', (chunk) => { rawData += chunk; });
				res.on('end', () => {
                                        //logger.info(rawData);
					try {
						real_comment = rawData.match(/<meta property=\"og:title\" content=\"([^"]*)\">/im)[1];
						real_url = rawData.match(/<a class=\"file_(?:header|body)\b[^"]*\".*\bhref=\"([^"]*)\">/im)[1];
					} catch (e) {
						logger.info(e.message);
					}
					if (real_url == "")
						text = `[file] ${username}failed uploading`;
					else
						text = `[file] ${username}${text} ${real_url}`;

					//if (message.files[0].initial_comment) {
					//	text += ` - ${message.files[0].initial_comment.comment}`;
					//}
					logger.debug('Sending message to IRC', channelName, text);
					this.ircClient.say(ircChannel, text);
				});
			}).on('error', (e) => {
				logger.info(`Got error: ${e.message}`);
			});
		}
		catch(err) {
			logger.info(`Caught unhandled error: ${err.message}`);
		}

      } else if (message.subtype === 'me_message') {
        text = `[action] ${user.name} ${text}`;
      }
      if (text != ""){
		logger.debug('Sending message to IRC', channelName, text);
		this.ircClient.say(ircChannel, text);
	  }
    }
  }

  sendToSlack(author, channel, text) {
    const slackChannelName = this.invertedMapping[channel.toLowerCase()];
    if (slackChannelName) {
      const { dataStore } = this.slack.rtm;
      const name = slackChannelName.replace(/^#/, '');
      const slackChannel = dataStore.getChannelOrGroupByName(name);

      // If it's a private group and the bot isn't in it, we won't find anything here.
      // If it's a channel however, we need to check is_member.
      if (!slackChannel || (!slackChannel.is_member && !slackChannel.is_group)) {
        logger.info('Tried to send a message to a channel the bot isn\'t in: ',
          slackChannelName);
        return;
      }

      if (this.muteUsers.irc.indexOf(author) !== -1) {
        logger.debug(`Muted message from IRC ${author}: ${text}`);
        return;
      }

      const currentChannelUsernames = slackChannel.members.map(member =>
        dataStore.getUserById(member).name
      );

      const mappedText = currentChannelUsernames.reduce((current, username) =>
        highlightUsername(username, current)
      , text);

      let iconUrl;
      if (author !== this.nickname && this.avatarUrl) {
        iconUrl = this.avatarUrl.replace(/\$username/g, author);
      }

      const options = {
        username: this.slackUsernameFormat.replace(/\$username/g, author),
        parse: 'full',
        icon_url: iconUrl
      };

      logger.debug('Sending message to Slack', mappedText, channel, '->', slackChannelName);
      this.slack.web.chat.postMessage(slackChannel.id, mappedText, options);
    }
  }
}

export default Bot;
