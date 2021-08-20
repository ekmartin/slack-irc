#!/usr/bin/env node
import { createBots } from './helpers';

const winston = require('winston');

/* [REFACTOR] Do not hard code log file path. */

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: '/var/log/slack_irc' })
  ]
});

/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
  logger.level = 'debug';
}

/* istanbul ignore next */
if (!module.parent) {
  const cli = require('./cli');
  cli();
}

export default createBots;
