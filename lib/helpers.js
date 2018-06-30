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
    configFile.forEach((config) => {
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
  const words = text.split(' ');
  const userRegExp = new RegExp(`^${user}[,.:!?]?$`);

  return words.map((word) => {
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

/**
 * Takes a plain username and returns it surrounded by color codes
 * @param {string} user username to colourize
 * @returns {string} colourized username string with mIRC color codes
 */
export function colourizeUsername(user) {
  let hash = 5381;
  for (let i = 0; i < user.length; i += 1) {
    hash = (hash * 33) + user.charCodeAt(i);
    // hash = ((hash << 5) + hash) + user.charCodeAt(i);
  }
  hash = Math.abs(hash);
  return `\x03${hash % 16}${user}\x0F`;
}
