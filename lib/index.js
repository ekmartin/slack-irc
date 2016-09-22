#!/usr/bin/env node
/* eslint-disable import/newline-after-import */
import logger from 'winston';
import { createBots } from './helpers';

/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
  logger.level = 'debug';
}

/* istanbul ignore next */
if (!module.parent) {
  const { default: cli } = require('./cli');
  cli();
}

export default createBots;
