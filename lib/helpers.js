import _ from 'lodash';
import Bot from './bot';
import { ConfigurationError } from './errors';

/**
 * Reads from the provided config file and returns an array of bots
 * @return {object[]}
 */
export function createBots(configFile) {
  const bots = [];

  // The config file can be both an array and an object
  if (Array.isArray(configFile)) {
    configFile.forEach(config => {
      const bot = new Bot(config);
      bot.connect();
      bots.push(bot);
    });
  } else if (_.isObject(configFile)) {
    const bot = new Bot(configFile);
    bot.connect();
    bots.push(bot);
  } else {
    throw new ConfigurationError();
  }

  return bots;
}

/**
 * Returns occurances of a current channel member's name with `@${name}`
 * @return {string}
 */
export function highlightUsername(user, text) {
  // if the username is "a", "an", "it", or "the", don't replace
  if (user === 'a' || user === 'an' || user === 'the' || user === 'it') {
    return text;
  }
  const words = text.split(' ');
  const userRegExp = new RegExp(`^${user}[,.:!?]?$`);
  return words.map(word => {
    // if the user is already prefixed by @, don't replace
    if (word.indexOf(`@${user}`) === 0) {
      return word;
    }

    // username match (with some chars)
    if (userRegExp.test(word)) {
      return `@${word}`;
    }

    return word;
  }).join(' ');
}
