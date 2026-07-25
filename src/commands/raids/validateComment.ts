/**
 * Validation for raid event comments.
 *
 * @module
 */

/** Matches the bio limit — a comment is a note, not an essay. */
export const COMMENT_MAX_LENGTH = 300;

export type CommentValidation =
  | { ok: true; content: string }
  | { ok: false; error: string };

/**
 * Checks a submitted comment body and returns the text to store.
 *
 * Trims before measuring, so trailing whitespace cannot push an otherwise
 * acceptable comment over the limit.
 */
export function validateComment(raw: unknown): CommentValidation {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Comment must be text' };
  }

  const content = raw.trim();

  if (content.length === 0) {
    return { ok: false, error: 'Comment cannot be empty' };
  }
  if (content.length > COMMENT_MAX_LENGTH) {
    return { ok: false, error: `Comment must be ${COMMENT_MAX_LENGTH} characters or fewer` };
  }

  return { ok: true, content };
}
