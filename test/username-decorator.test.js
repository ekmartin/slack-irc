import chai from 'chai';
import { highlightUsername } from '../lib/helpers';
chai.should();

describe('Bare Slack Username Replacement', () => {
  ['', ',', '.', ':', '!', '?'].forEach(c => {
    it(`should replace \`username${c}\` with \`@username${c}\``, () => {
      const message = `hey username${c} check this out`;
      const expected = `hey @username${c} check this out`;
      highlightUsername('username', message).should.equal(expected);
    });
  });

  it('should not replace `username\'` with `@username\'`', () => {
    const message = 'username\' go check this out';
    highlightUsername('username', message).should.equal(message);
  });

  it('should not replace `username` in a url with a protocol', () => {
    const message = 'the repo is https://github.com/username/foo';
    highlightUsername('username', message).should.equal(message);
  });

  it('should not replace `username` in a url without a protocol', () => {
    const message = 'the repo is github.com/username/foo';
    highlightUsername('username', message).should.equal(message);
  });

  it('should not replace a @-prefixed username', () => {
    const message = 'hey @username, check this out';
    highlightUsername('username', message).should.equal(message);
  });
});
