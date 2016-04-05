import { EventEmitter } from 'events';
import sinon from 'sinon';

class ChannelStub extends EventEmitter {
  constructor() {
    super();
    this.id = 1;
    this.name = 'slack';
    this.is_channel = true;
    this.is_member = true;
    this.members = ['testuser'];
  }
}

ChannelStub.prototype.postMessage = sinon.stub();

export default ChannelStub;
