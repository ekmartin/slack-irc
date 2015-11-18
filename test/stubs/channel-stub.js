import { EventEmitter } from 'events';
import sinon from 'sinon';

class ChannelStub extends EventEmitter {
  constructor() {
    super();
    this.name = 'slack';
    this.is_channel = true;
  }
}

ChannelStub.prototype.postMessage = sinon.stub();

export default ChannelStub;
