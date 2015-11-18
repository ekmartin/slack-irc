var util = require('util');
var events = require('events');
var ChannelStub = require('./channel-stub');

function SlackStub() {}

util.inherits(SlackStub, events.EventEmitter);

function getChannelStub() {
  return new ChannelStub();
}

SlackStub.prototype.getChannelByID = getChannelStub;
SlackStub.prototype.getChannelGroupOrDMByName = getChannelStub;
SlackStub.prototype.getChannelGroupOrDMByID = getChannelStub;

SlackStub.prototype.getUserByID = function() {
  return {
    name: 'testuser'
  };
};

module.exports = SlackStub;
