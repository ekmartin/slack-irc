import { EventEmitter } from 'events';
import DataStoreStub from './data-store-stub';

export default function createSlackStub() {
  const rtm = new EventEmitter();
  rtm.dataStore = new DataStoreStub();
  const web = {
    chat: {}
  };

  return { rtm, web };
}
