/* eslint no-unused-expressions: 0 */
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

describe('Bot', function() {
  const sandbox = sinon.sandbox.create({
    useFakeTimers: false,
    useFakeServer: false
  });

  beforeEach(function() {
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'debug');
    sandbox.stub(logger, 'error');
    sandbox.stub(irc, 'Client', ClientStub);
    ClientStub.prototype.say = sandbox.stub();
    ClientStub.prototype.send = sandbox.stub();
    ClientStub.prototype.join = sandbox.stub();
    SlackStub.prototype.login = sandbox.stub();
    this.bot = new Bot(config);
    this.bot.slack = new SlackStub();
    this.bot.connect();
  });

  afterEach(function() {
    sandbox.restore();
    ChannelStub.prototype.postMessage.reset();
  });

  it('should invert the channel mapping', function() {
    this.bot.invertedMapping['#irc'].should.equal('#slack');
  });

  it('should send correct message objects to slack', function() {
    const message = {
      text: 'testmessage',
      username: 'testuser',
      parse: 'full',
      icon_url: 'http://api.adorable.io/avatars/48/testuser.png'
    };

    this.bot.sendToSlack(message.username, '#irc', message.text);
    ChannelStub.prototype.postMessage.should.have.been.calledWith(message);
  });

  it('should lowercase channel names before sending to slack', function() {
    const message = {
      text: 'testmessage',
      username: 'testuser',
      parse: 'full',
      icon_url: 'http://api.adorable.io/avatars/48/testuser.png'
    };

    this.bot.sendToSlack(message.username, '#IRC', message.text);
    ChannelStub.prototype.postMessage.should.have.been.calledWith(message);
  });

  it('should not send messages to slack if the channel isn\'t in the channel mapping',
  function() {
    this.bot.sendToSlack('user', '#wrongchan', 'message');
    ChannelStub.prototype.postMessage.should.not.have.been.called;
  });

  it('should not send messages to slack if the bot isn\'t in the channel', function() {
    this.bot.slack.getChannelGroupOrDMByName = function() {
      return null;
    };

    this.bot.sendToSlack('user', '#irc', 'message');
    ChannelStub.prototype.postMessage.should.not.have.been.called;
  });

  it('should send correct messages to irc', function() {
    const text = 'testmessage';
    const message = {
      channel: 'slack',
      getBody() {
        return text;
      }
    };

    this.bot.sendToIRC(message);
    const ircText = `<testuser> ${text}`;
    ClientStub.prototype.say.should.have.been.calledWith('#irc', ircText);
  });

  it('should send /me messages to irc', function() {
    const text = 'testmessage';
    const message = {
      channel: 'slack',
      subtype: 'me_message',
      getBody() {
        return text;
      }
    };

    this.bot.sendToIRC(message);
    const ircText = `Action: testuser ${text}`;
    ClientStub.prototype.say.should.have.been.calledWith('#irc', ircText);
  });

  it('should not send messages to irc if the channel isn\'t in the channel mapping',
  function() {
    this.bot.slack.getChannelGroupOrDMByID = () => null;
    const message = {
      channel: 'wrongchannel'
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.should.not.have.been.called;
  });

  it('should parse text from slack when sending messages', function() {
    const text = '<@USOMEID> <@USOMEID|readable>';
    const message = {
      channel: 'slack',
      getBody() {
        return text;
      }
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.should.have.been.calledWith('#irc', '<testuser> @testuser readable');
  });

  it('should parse text from slack', function() {
    this.bot.parseText('hi\nhi\r\nhi\r').should.equal('hi hi hi ');
    this.bot.parseText('>><<').should.equal('>><<');
    this.bot.parseText('<!channel> <!group> <!everyone>')
      .should.equal('@channel @group @everyone');
    this.bot.parseText('<#CSOMEID> <#CSOMEID|readable>')
      .should.equal('#slack readable');
    this.bot.parseText('<@USOMEID> <@USOMEID|readable>')
      .should.equal('@testuser readable');
    this.bot.parseText('<https://example.com>').should.equal('https://example.com');
    this.bot.parseText('<!somecommand> <!somecommand|readable>')
      .should.equal('<somecommand> <readable>');
  });

  it('should parse emojis correctly', function() {
    this.bot.parseText(':smile:').should.equal(':)');
    this.bot.parseText(':train:').should.equal(':train:');
  });

  it('should hide usernames for commands', function() {
    const text = '!test command';
    const message = {
      channel: 'slack',
      getBody() {
        return text;
      }
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.getCall(0).args.should.deep.equal([
      '#irc', 'Command sent from Slack by testuser:'
    ]);
    ClientStub.prototype.say.getCall(1).args.should.deep.equal(['#irc', text]);
  });
});
