# slack-irc [![Join the chat at https://gitter.im/ekmartin/slack-irc](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ekmartin/slack-irc?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Build Status](https://travis-ci.org/ekmartin/slack-irc.svg?branch=travis)](https://travis-ci.org/ekmartin/slack-irc) [![Coverage status](https://ci.frigg.io/badges/coverage/ekmartin/slack-irc/)](https://ci.frigg.io/ekmartin/slack-irc/last/)

> Connects Slack and IRC channels by sending messages back and forth. Read more [here](https://ekmartin.com/2015/slack-irc/).

## Demo
![Slack IRC](http://i.imgur.com/58H6HgO.gif)

## Installation and usage
Either by installing through npm:
```bash
$ npm install -g slack-irc
$ slack-irc --config /path/to/config.json
```

or by cloning the repository:

```bash
$ git clone https://github.com/ekmartin/slack-irc.git && cd slack-irc
$ npm install
$ npm run build
$ npm start -- --config /path/to/config.json # Note the extra -- here
```

It can also be used as a node module:
```js
var slackIRC = require('slack-irc');
var config = require('./config.json');
slackIRC(config);
```

## Configuration

slack-irc uses Slack's [bot users](https://api.slack.com/bot-users).
This means you'll have to set up a bot user as a Slack integration, and invite it
to the Slack channels you want it to listen in on. This can be done using Slack's `/invite <botname>`
command. This has to be done manually as there's no way to do it through the Slack bot user API at
the moment.

slack-irc requires a JSON-configuration file, whose path can be given either through
the CLI-option `--config` or the environment variable `CONFIG_FILE`. The configuration
file needs to be an object or an array, depending on the number of IRC bots you want to run.

This allows you to use one instance of slack-irc for multiple Slack teams if wanted, even
if the IRC channels are on different networks.

To set the log level to debug, export the environment variable `NODE_ENV` as `development`.

slack-irc also supports invite-only IRC channels, and will join any channels it's invited to
as long as they're present in the channel mapping.

### Example configuration
Valid JSON cannot contain comments, so remember to remove them first!
```js
[
  // Bot 1 (minimal configuration):
  {
    "nickname": "test2",
    "server": "irc.testbot.org",
    "token": "slacktoken2",
    "channelMapping": {
      "#other-slack": "#new-irc-channel"
    }
  },

  // Bot 2 (advanced options):
  {
    "nickname": "test",
    "server": "irc.bottest.org",
    "token": "slacktoken", // Your bot user's token
    "autoSendCommands": [ // Commands that will be sent on connect
      ["PRIVMSG", "NickServ", "IDENTIFY password"],
      ["MODE", "test", "+x"],
      ["AUTH", "test", "password"]
    ],
    "channelMapping": { // Maps each Slack-channel to an IRC-channel, used to direct messages to the correct place
      "#slack": "#irc channel-password", // Add channel keys after the channel name
      "privategroup": "#other-channel" // No hash in front of private groups
    },
    "ircOptions": { // Optional node-irc options
      "floodProtection": false, // On by default
      "floodProtectionDelay": 1000 // 500 by default
    },
    // Makes the bot hide the username prefix for messages that start
    // with one of these characters (commands):
    "commandCharacters": ["!", "."],
    // Prevent messages posted by Slackbot (e.g. Slackbot responses)
    // from being posted into the IRC channel:
    "muteSlackbot": true, // Off by default
    // Sends messages to Slack whenever a user joins/leaves an IRC channel:
    "ircStatusNotices": {
      "join": false, // Don't send messages about joins
      "leave": true
    }
    // Use Gravatars in Slack rather than Adorable Avatars.
    // The file should contain an array of arrays, each with
    // a regular expression to match IRC nicknames and a Gravatar
    // email address:
    // [["someuser_*", "gravatar-email@foo.com"], ...]
    "gravatars": "/path/to/gravatars.json"
  }
]
```

`ircOptions` is passed directly to node-irc ([available options](http://node-irc.readthedocs.org/en/latest/API.html#irc.Client)).

## Development
To be able to use the latest ES2015+ features, slack-irc uses [Babel](https://babeljs.io).

Build the source with:
```bash
$ npm run build
```

### Tests
Run the tests with:
```bash
$ npm test
```

### Style Guide
slack-irc uses a slightly modified version of the
[Airbnb Style Guide](https://github.com/airbnb/javascript/tree/master/es5).
[ESLint](http://eslint.org/) is used to make sure this is followed correctly, which can be run with:

```bash
$ npm run lint
```

The deviations from the Airbnb Style Guide can be seen in  the [.eslintrc](.eslintrc) file.

## Docker
A third-party Docker container can be found [here](https://github.com/caktux/slackbridge/).

## License

(The MIT License)

Copyright (c) 2015 Martin Ek <mail@ekmartin.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
