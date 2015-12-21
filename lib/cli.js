#!/usr/bin/env node

import fs from 'fs';
import program from 'commander';
import path from 'path';
import checkEnv from 'check-env';
import stripJsonComments from 'strip-json-comments';
import * as helpers from './helpers';
import { version } from '../package.json';

function run() {
  program
    .version(version)
    .option('-c, --config <path>',
      'Sets the path to the config file, otherwise read from the env variable CONFIG_FILE.'
    )
    .parse(process.argv);

  // If no config option is given, try to use the env variable:
  if (!program.config) checkEnv(['CONFIG_FILE']);
  else process.env.CONFIG_FILE = program.config;


  let config;
  const completePath = path.resolve(process.cwd(), process.env.CONFIG_FILE);
  if (process.env.CONFIG_FILE.endsWith('.js')) {
    config = require(completePath);
  } else {
    const configFile = fs.readFileSync(completePath, { encoding: 'utf8' });
    config = JSON.parse(stripJsonComments(configFile));
  }

  helpers.createBots(config);
}

export default run;
