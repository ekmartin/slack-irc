import { EventEmitter } from 'events';
import ChannelStub from './channel-stub';

class SlackStub extends EventEmitter {
  getUserByID() {
    return {
      name: 'testuser'
    };
  }
}

function getChannelStub() {
  return new ChannelStub();
}

SlackStub.prototype.getChannelByID = getChannelStub;
SlackStub.prototype.getChannelGroupOrDMByName = getChannelStub;
SlackStub.prototype.getChannelGroupOrDMByID = getChannelStub;

export default SlackStub;
