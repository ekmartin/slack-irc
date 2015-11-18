import chai from 'chai';
import Bot from '../lib/bot';
import config from './fixtures/single-test-config.json';
import caseConfig from './fixtures/case-sensitivity-config.json';
import { validateChannelMapping } from '../lib/validators';

chai.should();

describe('Channel Mapping', () => {
  it('should fail when not given proper JSON', () => {
    const wrongMapping = 'not json';
    const wrap = () => validateChannelMapping(wrongMapping);
    (wrap).should.throw('Invalid channel mapping given');
  });

  it('should not fail if given a proper channel list as JSON', () => {
    const correctMapping = { '#channel': '#otherchannel' };
    const wrap = () => validateChannelMapping(correctMapping);
    (wrap).should.not.throw();
  });

  it('should clear channel keys from the mapping', () => {
    const bot = new Bot(config);
    bot.channelMapping['#slack'].should.equal('#irc');
    bot.invertedMapping['#irc'].should.equal('#slack');
    bot.channels[0].should.equal('#irc channelKey');
  });

  it('should lowercase IRC channel names', () => {
    const bot = new Bot(caseConfig);
    bot.channelMapping['#slack'].should.equal('#irc');
    bot.channelMapping['#OtherSlack'].should.equal('#otherirc');
  });
});
