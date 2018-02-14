# Changelog
This project adheres to [Semantic Versioning](http://semver.org/).

## [3.11.1] - 2018-02-14
### Fixed
- Replaced node-irc with @Throne3d's fork, [irc-upd](https://github.com/Throne3d/node-irc).

## [3.11.0] - 2017-05-12
### Added
- `muteUsers` config option for muting users on Slack and IRC -
 [#174](https://github.com/ekmartin/slack-irc/pull/174).

## [3.10.1] - 2017-04-30
### Changed
- Upgrade @slack/client to 3.9.0.

## [3.10.0] - 2017-04-30
### Added
- Report file uploads to IRC - [#193](https://github.com/ekmartin/slack-irc/pull/193).

## [3.9.0] - 2016-11-07
### Added
- Config option `slackUsernameFormat`, which allows for
customization of the username that will be used when posting
to Slack (thanks to @laughinghan!).

### Changed
- Default Slack username changed to `$username (IRC)`
(see the `(IRC)` suffix). This can be changed to the
old default by setting the new `slackUsernameFormat`,
to `'$username'`.

## [3.8.7] - 2016-10-04
### Fixed
- Make sure the CLI works with babel-plugin-add-
module-exports

## [3.8.6] - 2016-09-27
### Fixed
- Added babel-plugin-add-module-exports so that slack-irc
can be required without needing `.default` after.

## [3.8.5] - 2016-09-27
### Fixed
- Correctly handle entity escaping in messages, fixed by @jlaunonen.

## [3.8.4] - 2016-09-26
### Fixed
- Make sure multiple links works for readable representation as well.

## [3.8.3] - 2016-09-25
### Fixed
- A bug where multiple links would be parsed wrongly, see
https://github.com/ekmartin/slack-irc/issues/160
- Upgraded linter.

## [3.8.2] - 2016-09-05
### Fixed
- Upgraded dependencies.
ESLint has dropped support for older Node.js versions,
which means you'll require at least Node.js 4.0 to develop
on slack-irc. It'll still be possible to run the application
with older Node.js versions.
- Removed unused `emoji.json` file.

## [3.8.1] - 2016-05-21
### Fixed
- Exit the application if the maximum retry count for IRC is reached.

## [3.8.0] - 2016-04-30
### Added
- The configuration option `avatarUrl`, which lets you decide
how IRC users' messages should be presented on Slack.
This can be set to `false` to disable them altogether, or
a custom URL to change the avatar.

Example: `'https://robohash.org/$username.png'`, where
$username will be replaced with the IRC author's username.

### Fixed
- Upgraded dependencies.

## [3.7.8] - 2016-04-06
### Fixed
- Set node-irc's retryCount to 10, so that the bot attempts to reconnect
to IRC upon disconnects.
- Upgraded dependencies, including an upgrade of node-slack-client from
version 1 to 2.

## [3.7.7] - 2016-03-09
### Fixed
- Upgraded dependencies.
- Pin ESLint to 2.2.0 so it works with babel-eslint 6.

## [3.7.6] - 2016-03-03
### Fixed
- Upgraded dependencies.
- Update ESLint config to use preset eslint-config-webkom.

## [3.7.5] - 2016-01-26
### Fixed
- Make sure Don doesn't get highlighted for messages containing "don't", fixed by @Ibuprofen.

## [3.7.4] - 2016-01-21
### Fixed
- Fix a bug where the bot-in-channel check would fail for private groups.

## [3.7.3] - 2016-01-12
### Fixed
- Don't crash when trying to send a message to a Slack channel the bot
isn't a member of.

## [3.7.2] - 2016-01-12
### Changed
- Remove babel-polyfill, use functions available in Node 0.10 and above instead.

## [3.7.1] - 2016-01-10
### Changed
- Added babel-polyfill, fixes #70.
- Updated dependencies.

## [3.7.0] - 2015-12-21
### Added
- Valid usernames are now highlighted with an @ before messages are posted to Slack, thanks to @grahamb.
- `muteSlackbot` option that stops Slackbot messages from being forwarded to IRC, also courtesy of @grahamb.
- `ircStatusNotices` option that makes slack-irc send status updates to Slack whenever an IRC user
joins/parts/quits. See README.md for example.

### Changed
- Upgraded dependencies.
- Comments are now stripped from JSON configs before they're parsed.
- Configurations with invalid JSON now throws a ConfigurationError.

## [3.6.2] - 2015-12-01
### Changed
- Upgraded dependencies.

## [3.6.1] - 2015-11-18
### Changed
- Refactor to use ES2015+ with Babel.
- Refactor tests.

## [3.6.0] - 2015-09-14
### Added
- Support for actions from IRC to Slack and vice versa (/me messages).
- Support for sending notices from IRC to Slack (/notice #channel message).

## [3.5.2] - 2015-06-26
### Fixed
- Remove old unused dependencies.

## [3.5.1] - 2015-06-26
### Fixed
- A bug introduced in 3.5.0 where Slack messages sent to IRC wouldn't get parsed.
Adds a test to confirm correct behavior.

## [3.5.0] - 2015-06-22
### Added
- `commandCharacters` option - makes the bot hide the username prefix for
messages that start with one of the provided characters when posting to IRC.
A `Command sent from Slack by username:` message will be posted to the IRC
channel before the command is submitted.

## [3.4.0] - 2015-05-22
### Added
- Made it possible to require slack-irc as a node module.

## [3.3.2] - 2015-05-17
### Fixed
- Upgrade dependencies.

## [3.3.1] - 2015-05-17
### Fixed
- Make IRC channel names case insensitive in the channel mapping.
Relevant issue: [#31](https://github.com/ekmartin/slack-irc/issues/31)

## [3.3.0] - 2015-04-17
### Added
- Conversion of emojis to text smileys from Slack to IRC, by [andebor](https://github.com/andebor).
Relevant issue: [#10](https://github.com/ekmartin/slack-irc/issues/10)

## [3.2.1] - 2015-04-07
### Fixed
- Convert newlines sent from Slack to spaces to prevent the bot from sending multiple messages.

## [3.2.0] - 2015-04-03
### Added
- Support for passing [node-irc](http://node-irc.readthedocs.org/en/latest/API.html#irc.Client)
options directly by adding an `ircOptions` object to the config. Also sets `floodProtection` on
by default, with a delay of 500 ms.

## [3.1.0] - 2015-03-27
### Added
- Make the bot able to join password protected IRC channels. Example:

```json
"channelMapping": {
  "#slack": "#irc channel-password",
}
```

## [3.0.0] - 2015-03-24
### Changed
Move from using outgoing/incoming integrations to Slack's
[bot users](https://api.slack.com/bot-users). See
[README.md](https://github.com/ekmartin/slack-irc/blob/master/README.md)
for a new example configuration. This mainly means slack-irc won't need
to listen on a port anymore, as it uses websockets to receive the messages
from Slack's [RTM API](https://api.slack.com/rtm).

To change from version 2 to 3, do the following:
- Create a new Slack bot user (under integrations)
- Add its token to your slack-irc config, and remove
the `outgoingToken` and `incomingURL` config options.

### Added
- Message formatting, follows Slack's [rules](https://api.slack.com/docs/formatting).

## [2.0.1]- 2015-03-03
### Added
- MIT License

## [2.0.0] - 2015-02-22
### Changed
- Post URL changed from `/send` to `/`.

## [1.1.0] - 2015-02-12
### Added
- Icons from [Adorable Avatars](http://avatars.adorable.io/).
- Command-line interface

### Changed
- Status code from 202 to 200.

## [1.0.0] - 2015-02-09
### Added
- Support for running multiple bots (on different Slacks)

### Changed
- New configuration format, example
[here](https://github.com/ekmartin/slack-irc/blob/44f6079b5da597cd091e8a3582e34617824e619e/README.md#configuration).

## [0.2.0] - 2015-02-06
### Added
- Add support for channel mapping.

### Changed
- Use winston for logging.
