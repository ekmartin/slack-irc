/* eslint-disable prefer-arrow-callback, no-unused-expressions */
import chai from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import irc from 'irc';
import logger from 'winston';
import Bot from '../lib/bot';
import SlackStub from './stubs/slack-stub';
import ChannelStub from './stubs/channel-stub';
import ClientStub from './stubs/irc-client-stub';
import config from './fixtures/single-test-config.json';

chai.should();
chai.use(sinonChai);

describe('Bot Events', function () {
  const sandbox = sinon.sandbox.create({
    useFakeTimers: false,
    useFakeServer: false
  });

  beforeEach(function () {
    this.infoStub = sandbox.stub(logger, 'info');
    this.debugStub = sandbox.stub(logger, 'debug');
    this.errorStub = sandbox.stub(logger, 'error');
    sandbox.stub(irc, 'Client', ClientStub);
    SlackStub.prototype.login = sandbox.stub();
    ClientStub.prototype.send = sandbox.stub();
    ClientStub.prototype.join = sandbox.stub();
    this.bot = new Bot(config);
    this.bot.sendToIRC = sandbox.stub();
    this.bot.sendToSlack = sandbox.stub();
    this.bot.slack = new SlackStub();
    this.bot.slack.rtm.start = sandbox.stub();
    this.bot.connect();
  });

  afterEach(function () {
    sandbox.restore();
    ChannelStub.prototype.postMessage.reset();
  });

  it('should log on slack open event', function () {
    this.bot.slack.rtm.emit('open');
    this.debugStub.should.have.been.calledWithExactly('Connected to Slack');
  });

  it('should try to send autoSendCommands on registered IRC event', function () {
    this.bot.ircClient.emit('registered');
    ClientStub.prototype.send.should.have.been.calledTwice;
    ClientStub.prototype.send.getCall(0).args.should.deep.equal(config.autoSendCommands[0]);
    ClientStub.prototype.send.getCall(1).args.should.deep.equal(config.autoSendCommands[1]);
  });

  it('should error log on error events', function () {
    const slackError = new Error('slack');
    const ircError = new Error('irc');
    this.bot.slack.rtm.emit('error', slackError);
    this.bot.ircClient.emit('error', ircError);
    this.errorStub.getCall(0).args[0].should.equal('Received error event from Slack');
    this.errorStub.getCall(0).args[1].should.equal(slackError);
    this.errorStub.getCall(1).args[0].should.equal('Received error event from IRC');
    this.errorStub.getCall(1).args[1].should.equal(ircError);
  });

  it('should crash on irc abort events', function () {
    sandbox.stub(process, 'exit');
    this.bot.ircClient.emit('abort', 10);
    process.exit.should.have.been.calledWith(1);
  });

  it('should send messages to irc if correct', function () {
    const message = {
      type: 'message'
    };
    this.bot.slack.rtm.emit('message', message);
    this.bot.sendToIRC.should.have.been.calledWithExactly(message);
  });

  it('should send files to irc if correct', function () {
    const message = {
      type: 'message',
      subtype: 'file_share',
      file: {
        permalink: 'test',
        permalink_public: 'test'
      }
    };
    this.bot.slack.rtm.emit('message', message);
    this.bot.sendToIRC.should.have.been.calledWithExactly(message);
  });

  it('should not send messages to irc if the type isn\'t message', function () {
    const message = {
      type: 'notmessage'
    };
    this.bot.slack.rtm.emit('message', message);
    this.bot.sendToIRC.should.have.not.have.been.called;
  });

  it('should not send messages to irc if it has an invalid subtype', function () {
    const message = {
      type: 'message',
      subtype: 'bot_message'
    };
    this.bot.slack.rtm.emit('message', message);
    this.bot.sendToIRC.should.have.not.have.been.called;
  });

  it('should send messages to slack', function () {
    const channel = '#channel';
    const author = 'user';
    const text = 'hi';
    this.bot.ircClient.emit('message', author, channel, text);
    this.bot.sendToSlack.should.have.been.calledWithExactly(author, channel, text);
  });

  it('should send notices to slack', function () {
    const channel = '#channel';
    const author = 'user';
    const text = 'hi';
    const formattedText = `*${text}*`;
    this.bot.ircClient.emit('notice', author, channel, text);
    this.bot.sendToSlack.should.have.been.calledWithExactly(author, channel, formattedText);
  });

  it('should send actions to slack', function () {
    const channel = '#channel';
    const author = 'user';
    const text = 'hi';
    const formattedText = '_hi_';
    const message = {};
    this.bot.ircClient.emit('action', author, channel, text, message);
    this.bot.sendToSlack.should.have.been.calledWithExactly(author, channel, formattedText);
  });

  it('should join channels when invited', function () {
    const channel = '#irc';
    const author = 'user';
    this.debugStub.reset();
    this.bot.ircClient.emit('invite', channel, author);
    const firstCall = this.debugStub.getCall(0);
    firstCall.args[0].should.equal('Received invite:');
    firstCall.args[1].should.equal(channel);
    firstCall.args[2].should.equal(author);

    ClientStub.prototype.join.should.have.been.calledWith(channel);
    const secondCall = this.debugStub.getCall(1);
    secondCall.args[0].should.equal('Joining channel:');
    secondCall.args[1].should.equal(channel);
  });

  it('should not join channels that aren\'t in the channel mapping', function () {
    const channel = '#wrong';
    const author = 'user';
    this.debugStub.reset();
    this.bot.ircClient.emit('invite', channel, author);
    const firstCall = this.debugStub.getCall(0);
    firstCall.args[0].should.equal('Received invite:');
    firstCall.args[1].should.equal(channel);
    firstCall.args[2].should.equal(author);

    ClientStub.prototype.join.should.not.have.been.called;
    const secondCall = this.debugStub.getCall(1);
    secondCall.args[0].should.equal('Channel not found in config, not joining:');
    secondCall.args[1].should.equal(channel);
  });
});
