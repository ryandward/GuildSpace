import { describe, it, expect } from 'vitest';
import { validateComment, COMMENT_MAX_LENGTH } from './validateComment.js';

describe('validateComment', () => {
  it('accepts an ordinary comment', () => {
    expect(validateComment('I was on Gigabroms for calls 2-3')).toEqual({
      ok: true,
      content: 'I was on Gigabroms for calls 2-3',
    });
  });

  it('stores the trimmed text', () => {
    expect(validateComment('  spare a tick?  ')).toEqual({ ok: true, content: 'spare a tick?' });
  });

  it('keeps newlines inside the comment', () => {
    const content = 'was on Gigabroms\nthen swapped to Broms';
    expect(validateComment(content)).toEqual({ ok: true, content });
  });

  it('accepts exactly the limit', () => {
    const content = 'x'.repeat(COMMENT_MAX_LENGTH);
    expect(validateComment(content)).toEqual({ ok: true, content });
  });

  it('measures after trimming, so trailing spaces do not push it over', () => {
    const content = 'x'.repeat(COMMENT_MAX_LENGTH);
    expect(validateComment(`${content}    `)).toEqual({ ok: true, content });
  });

  it('rejects one character past the limit', () => {
    expect(validateComment('x'.repeat(COMMENT_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: 'Comment must be 300 characters or fewer',
    });
  });

  it('rejects an empty or whitespace-only comment', () => {
    expect(validateComment('')).toEqual({ ok: false, error: 'Comment cannot be empty' });
    expect(validateComment('   \n  ')).toEqual({ ok: false, error: 'Comment cannot be empty' });
  });

  it('rejects anything that is not text', () => {
    for (const bad of [undefined, null, 42, {}, [], true]) {
      expect(validateComment(bad)).toEqual({ ok: false, error: 'Comment must be text' });
    }
  });

  it('states the rule in plain language, with no implementation detail', () => {
    const messages = [
      validateComment(42),
      validateComment(''),
      validateComment('x'.repeat(COMMENT_MAX_LENGTH + 1)),
    ].map(r => (r.ok ? '' : r.error));

    for (const message of messages) {
      expect(message).not.toMatch(/string|null|undefined|type|validation|invalid input/i);
      expect(message.startsWith('Comment')).toBe(true);
    }
  });
});
