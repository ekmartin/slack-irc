/* eslint-disable prefer-arrow-callback, no-unused-expressions */
import chai from 'chai';
import sinon from 'sinon';
import logger from 'winston';
import sinonChai from 'sinon-chai';
import irc from 'irc';
import Bot from '../lib/bot';
import SlackStub from './stubs/slack-stub';
import ChannelStub from './stubs/channel-stub';
import ClientStub from './stubs/irc-client-stub';
import config from './fixtures/single-test-config.json';

chai.should();
chai.use(sinonChai);

describe('Bot', function () {
  const sandbox = sinon.sandbox.create({
    useFakeTimers: false,
    useFakeServer: false
  });

  const createBot = (cfg = config) => {
    const bot = new Bot(cfg);
    bot.slack = new SlackStub();
    bot.slack.rtm.start = sandbox.stub();
    bot.slack.web.chat.postMessage = sandbox.stub();
    bot.connect();
    return bot;
  };

  beforeEach(function () {
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'debug');
    sandbox.stub(logger, 'error');
    sandbox.stub(irc, 'Client', ClientStub);
    ClientStub.prototype.say = sandbox.stub();
    ClientStub.prototype.send = sandbox.stub();
    ClientStub.prototype.join = sandbox.stub();
    this.bot = createBot();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should invert the channel mapping', function () {
    this.bot.invertedMapping['#irc'].should.equal('#slack');
  });

  it('should send correct message objects to slack', function () {
    const text = 'testmessage';
    const message = {
      username: 'testuser (IRC)',
      parse: 'full',
      icon_url: 'http://api.adorable.io/avatars/48/testuser.png'
    };

    this.bot.sendToSlack('testuser', '#irc', text);
    this.bot.slack.web.chat.postMessage.should.have.been.calledWith(1, text, message);
  });

  it('should send messages to slack groups if the bot is in the channel', function () {
    this.bot.slack.rtm.dataStore.getChannelOrGroupByName = () => {
      const channel = new ChannelStub();
      delete channel.is_member;
      channel.is_group = true;
      return channel;
    };

    const text = 'testmessage';
    const message = {
      username: 'testuser (IRC)',
      parse: 'full',
      icon_url: 'http://api.adorable.io/avatars/48/testuser.png'
    };

    this.bot.sendToSlack('testuser', '#irc', text);
    this.bot.slack.web.chat.postMessage.should.have.been.calledWith(1, text, message);
  });

  it('should not include an avatar for the bot\'s own messages',
  function () {
    const text = 'testmessage';
    const message = {
      username: `${config.nickname} (IRC)`,
      parse: 'full',
      icon_url: undefined
    };

    this.bot.sendToSlack(config.nickname, '#irc', text);
    this.bot.slack.web.chat.postMessage.should.have.been.calledWith(1, text, message);
  });

  it('should not include an avatar if avatarUrl is set to false', function () {
    const noAvatarConfig = {
      ...config,
      avatarUrl: false
    };
    const bot = createBot(noAvatarConfig);
    const text = 'testmessage';
    const message = {
      username: 'testuser (IRC)',
      parse: 'full',
      icon_url: undefined
    };

    bot.sendToSlack('testuser', '#irc', text);
    bot.slack.web.chat.postMessage.should.have.been.calledWith(1, text, message);
  });

  it('should use a custom icon url if given', function () {
    const avatarUrl = 'https://cat.com';
    const customAvatarConfig = {
      ...config,
      avatarUrl
    };
    const bot = createBot(customAvatarConfig);
    const text = 'testmessage';
    const message = {
      username: 'testuser (IRC)',
      parse: 'full',
      icon_url: avatarUrl
    };

    bot.sendToSlack('testuser', '#irc', text);
    bot.slack.web.chat.postMessage.should.have.been.calledWith(1, text, message);
  });

  it('should replace $username in the given avatarUrl', function () {
    const avatarUrl = 'https://robohash.org/$username.png';
    const customAvatarConfig = {
      ...config,
      avatarUrl
    };
    const bot = createBot(customAvatarConfig);
    const text = 'testmessage';
    const message = {
      username: 'testuser (IRC)',
      parse: 'full',
      icon_url: 'https://robohash.org/testuser.png'
    };

    bot.sendToSlack('testuser', '#irc', text);
    bot.slack.web.chat.postMessage.should.have.been.calledWith(1, text, message);
  });

  it('should lowercase channel names before sending to slack', function () {
    const text = 'testmessage';
    const message = {
      username: 'testuser (IRC)',
      parse: 'full',
      icon_url: 'http://api.adorable.io/avatars/48/testuser.png'
    };

    this.bot.sendToSlack('testuser', '#IRC', text);
    this.bot.slack.web.chat.postMessage.should.have.been.calledWith(1, text, message);
  });

  it('should not send messages to slack if the channel isn\'t in the channel mapping',
  function () {
    this.bot.sendToSlack('user', '#wrongchan', 'message');
    this.bot.slack.web.chat.postMessage.should.not.have.been.called;
  });

  it('should not send messages to slack if the bot isn\'t in the channel', function () {
    this.bot.slack.rtm.dataStore.getChannelOrGroupByName = () => null;
    this.bot.sendToSlack('user', '#irc', 'message');
    this.bot.slack.web.chat.postMessage.should.not.have.been.called;
  });

  it('should not send messages to slack if the channel\'s is_member is false', function () {
    this.bot.slack.rtm.dataStore.getChannelOrGroupByName = () => {
      const channel = new ChannelStub();
      channel.is_member = false;
      return channel;
    };

    this.bot.sendToSlack('user', '#irc', 'message');
    this.bot.slack.web.chat.postMessage.should.not.have.been.called;
  });

  it('should replace a bare username if the user is in-channel', function () {
    const message = {
      username: 'testuser (IRC)',
      parse: 'full',
      icon_url: 'http://api.adorable.io/avatars/48/testuser.png'
    };

    const before = 'testuser should be replaced in the message';
    const after = '@testuser should be replaced in the message';
    this.bot.sendToSlack('testuser', '#IRC', before);
    this.bot.slack.web.chat.postMessage.should.have.been.calledWith(1, after, message);
  });

  it('should allow disabling Slack username suffix', function () {
    const customSlackUsernameFormatConfig = {
      ...config,
      slackUsernameFormat: '$username'
    };
    const bot = createBot(customSlackUsernameFormatConfig);
    const text = 'textmessage';
    const message = {
      username: 'testuser',
      parse: 'full',
      icon_url: 'http://api.adorable.io/avatars/48/testuser.png'
    };

    bot.sendToSlack('testuser', '#irc', text);
    bot.slack.web.chat.postMessage.should.have.been.calledWith(1, text, message);
  });

  it('should replace $username in custom Slack username format if given', function () {
    const customSlackUsernameFormatConfig = {
      ...config,
      slackUsernameFormat: 'prefix $username suffix'
    };
    const bot = createBot(customSlackUsernameFormatConfig);
    const text = 'textmessage';
    const message = {
      username: 'prefix testuser suffix',
      parse: 'full',
      icon_url: 'http://api.adorable.io/avatars/48/testuser.png'
    };

    bot.sendToSlack('testuser', '#irc', text);
    bot.slack.web.chat.postMessage.should.have.been.calledWith(1, text, message);
  });

  it('should send correct messages to irc', function () {
    const text = 'testmessage';
    const message = {
      text,
      channel: 'slack'
    };

    this.bot.sendToIRC(message);
    const ircText = `<testuser> ${text}`;
    ClientStub.prototype.say.should.have.been.calledWith('#irc', ircText);
  });

  it('should send /me messages to irc', function () {
    const text = 'testmessage';
    const message = {
      text,
      channel: 'slack',
      subtype: 'me_message'
    };

    this.bot.sendToIRC(message);
    const ircText = `Action: testuser ${text}`;
    ClientStub.prototype.say.should.have.been.calledWith('#irc', ircText);
  });

  it('should send files to irc', function () {
    const link1 = 'test1';
    const link2 = 'test2';
    const text = 'testcomment';
    const message = {
      text: '',
      channel: 'slack',
      subtype: 'file_share',
      file: {
        permalink: link1,
        permalink_public: link2,
        initial_comment: {
          comment: text
        }
      }
    };

    this.bot.sendToIRC(message);
    const ircText = `<testuser> File uploaded ${link1} / ${link2} - ${text}`;
    ClientStub.prototype.say.should.have.been.calledWith('#irc', ircText);
  });

  it('should not send messages to irc if the channel isn\'t in the channel mapping',
  function () {
    this.bot.slack.rtm.dataStore.getChannelGroupOrDMById = () => null;
    const message = {
      channel: 'wrongchannel'
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.should.not.have.been.called;
  });

  it('should send messages from slackbot if slackbot muting is off',
  function () {
    const text = 'A message from Slackbot';
    const message = {
      text,
      user: 'USLACKBOT'
    };

    this.bot.sendToIRC(message);
    const ircText = `<testuser> ${text}`;
    ClientStub.prototype.say.should.have.been.calledWith('#irc', ircText);
  });

  it('should not send messages from slackbot to irc if slackbot muting is on',
  function () {
    this.bot.muteSlackbot = true;
    const message = {
      user: 'USLACKBOT',
      getBody() {
        return 'A message from Slackbot';
      }
    };
    this.bot.sendToIRC(message);
    ClientStub.prototype.say.should.not.have.been.called;
  });

  it('should parse text from slack when sending messages', function () {
    const text = '<@USOMEID> <@USOMEID|readable>';
    const message = {
      text,
      channel: 'slack'
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.should.have.been.calledWith('#irc', '<testuser> @testuser readable');
  });

  it('should parse text from slack', function () {
    this.bot.parseText('hi\nhi\r\nhi\r').should.equal('hi hi hi ');
    this.bot.parseText('>><<').should.equal('>><<');
    this.bot.parseText('<!channel> <!group> <!everyone>')
      .should.equal('@channel @group @everyone');
    this.bot.parseText('<#CSOMEID> <#CSOMEID|readable>')
      .should.equal('#slack readable');
    this.bot.parseText('<@USOMEID> <@USOMEID|readable>')
      .should.equal('@testuser readable');
    this.bot.parseText('<https://example.com>').should.equal('https://example.com');
    this.bot.parseText('<https://example.com> <https://ap.no>')
      .should.equal('https://example.com https://ap.no');
    this.bot.parseText('<https://example.com|example.com> <https://ap.no|ap.no>')
      .should.equal('example.com ap.no');
    this.bot.parseText('<!somecommand> <!somecommand|readable>')
      .should.equal('<somecommand> <readable>');
  });

  it('should handle entity-encoded messages from slack', function () {
    this.bot.parseText('&amp;lt;&amp;gt;').should.equal('&lt;&gt;');
    this.bot.parseText('&lt;@UNONEID&gt;').should.equal('<@UNONEID>');
    this.bot.parseText('&lt;#CNONEID&gt;').should.equal('<#CNONEID>');
    this.bot.parseText('&lt;!channel&gt;').should.equal('<!channel>');
    this.bot.parseText('&lt;<http://example.com|example.com>&gt;').should.equal('<example.com>');
    this.bot.parseText('java.util.List&lt;java.lang.String&gt;')
      .should.equal('java.util.List<java.lang.String>');
  });

  it('should parse emojis correctly', function () {
    this.bot.parseText(':smile:').should.equal(':)');
    this.bot.parseText(':train:').should.equal(':train:');
  });

  it('should hide usernames for commands', function () {
    const text = '!test command';
    const message = {
      text,
      channel: 'slack'
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.getCall(0).args.should.deep.equal([
      '#irc', 'Command sent from Slack by testuser:'
    ]);
    ClientStub.prototype.say.getCall(1).args.should.deep.equal(['#irc', text]);
  });

  it('should not forward messages from users in slack mute list', function () {
    this.bot.muteUsersSlack = ['testuser'];
    const text = 'testmessage';
    const message = {
      text,
      channel: 'slack'
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.should.not.have.been.called;
  });

  it('should not forward messages from users in irc mute list', function () {
    this.bot.muteUsersIrc = ['testuser'];
    const text = 'testmessage';

    this.bot.sendToSlack('testuser', '#irc', text);
    this.bot.slack.web.chat.postMessage.should.not.have.been.called;
  });
});
