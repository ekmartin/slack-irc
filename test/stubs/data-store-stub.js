import { EventEmitter } from 'events';
import ChannelStub from './channel-stub';

class DataStoreStub extends EventEmitter {
  getUserById() {
    return {
      name: 'testuser'
    };
  }
}

function getChannelStub() {
  return new ChannelStub();
}

DataStoreStub.prototype.getChannelById = getChannelStub;
DataStoreStub.prototype.getChannelOrGroupByName = getChannelStub;
DataStoreStub.prototype.getChannelGroupOrDMById = getChannelStub;

export default DataStoreStub;
