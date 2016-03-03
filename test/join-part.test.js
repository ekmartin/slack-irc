/* eslint-disable prefer-arrow-callback, no-unused-expressions */
import _ from 'lodash';
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

describe('Join/Part/Quit Notices', function() {
  const sandbox = sinon.sandbox.create({
    useFakeTimers: false,
    useFakeServer: false
  });

  beforeEach(function() {
    this.infoStub = sandbox.stub(logger, 'info');
    this.debugStub = sandbox.stub(logger, 'debug');
    this.errorStub = sandbox.stub(logger, 'error');
    sandbox.stub(irc, 'Client', ClientStub);
    SlackStub.prototype.login = sandbox.stub();
    ClientStub.prototype.send = sandbox.stub();
    ClientStub.prototype.join = sandbox.stub();
    this.bot = new Bot(_.cloneDeep(config));
    this.bot.sendToIRC = sandbox.stub();
    this.bot.sendToSlack = sandbox.stub();
    this.bot.slack = new SlackStub();
  });

  afterEach(function() {
    sandbox.restore();
    ChannelStub.prototype.postMessage.reset();
  });

  it('should send joins to slack if enabled', function() {
    this.bot.connect();
    const channel = '#channel';
    const nick = 'nick';
    const message = {};
    const expected = `*${nick}* has joined the IRC channel`;
    this.bot.ircClient.emit('join', channel, nick, message);
    this.bot.sendToSlack.should.have.been.calledWithExactly(config.nickname, channel, expected);
  });

  it('should not send joins to slack if disabled', function() {
    this.bot.ircStatusNotices.join = false;
    this.bot.connect();
    const channel = '#channel';
    const nick = 'nick';
    const message = {};
    this.bot.ircClient.emit('join', channel, nick, message);
    this.bot.sendToSlack.should.not.have.been.called;
  });

  it('should send parts to slack if enabled', function() {
    this.bot.connect();
    const channel = '#channel';
    const nick = 'nick';
    const message = {};
    const expected = `*${nick}* has left the IRC channel`;
    this.bot.ircClient.emit('part', channel, nick, message);
    this.bot.sendToSlack.should.have.been.calledWithExactly(config.nickname, channel, expected);
  });

  it('should not send parts to slack if disabled', function() {
    this.bot.ircStatusNotices.leave = false;
    this.bot.connect();
    const channel = '#channel';
    const nick = 'nick';
    const message = {};
    this.bot.ircClient.emit('part', channel, nick, message);
    this.bot.sendToSlack.should.not.have.been.called;
  });

  it('should send quits to slack if enabled', function() {
    this.bot.connect();
    const channels = ['#channel1', '#channel2'];
    const nick = 'nick';
    const message = {};
    this.bot.ircClient.emit('quit', nick, 'reason', channels, message);
    channels.forEach(channel => {
      const expected = `*${nick}* has quit the IRC channel`;
      this.bot.sendToSlack.should.have.been.calledWithExactly(config.nickname, channel, expected);
    });
  });

  it('should not send quits to slack if disabled', function() {
    this.bot.ircStatusNotices.leave = false;
    this.bot.connect();
    const channels = ['#channel1', '#channel2'];
    const nick = 'nick';
    const message = {};
    this.bot.ircClient.emit('quit', nick, 'reason', channels, message);
    this.bot.sendToSlack.should.not.have.been.called;
  });
});
