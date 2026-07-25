/**
 * The single reader of EverQuest log timestamps.
 *
 * Both the attendance parser and the call-time display need to know when a
 * `/who` was taken. When they each decided that independently they disagreed —
 * one accepting stamps the other rejected — which showed up as calls that had
 * attendees but no displayed time. Sharing one matcher makes that class of
 * divergence unrepresentable.
 *
 * @module
 */

/** EverQuest writes exactly one shape: `Thu May 25 22:10:50 2023`. */
const EQ_STAMP = /^[A-Za-z]{3} [A-Za-z]{3} {1,2}(\d{1,2}) (\d{2}):(\d{2}):(\d{2}) (\d{4})$/;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface EqTimestamp {
  /** Wall-clock `"HH:MM"`, exactly as the player saw it. */
  clock: string;
  /** The same instant as a Date, for storage. */
  date: Date;
}

/**
 * Parses the contents of a leading `[...]` from an EverQuest log line, or
 * returns null if it is not an EverQuest stamp.
 *
 * Deliberately stricter than `Date.parse`, which is far too permissive to use
 * as a validity test here. `Date.parse` accepts `"Thu May 25 22:10:50"` by
 * silently defaulting the year to 2001, and `"12"` as December 2001 — both land
 * a plausible-looking but absurd date in `attendance.date`, where it sinks to
 * the bottom of `MAX(date)` and makes the character read as never having
 * raided. A wrong date is worse than a missing one, because only the missing
 * one is visible.
 *
 * The Date is built from parts rather than from the string. EQ stamps carry no
 * timezone, so handing the raw text to `Date` invites the runtime to apply its
 * own zone and shift the clock the player actually saw.
 */
export function parseEqTimestamp(raw: string): EqTimestamp | null {
  const match = raw.match(EQ_STAMP);
  if (!match) return null;

  const monthIndex = MONTHS.indexOf(raw.slice(4, 7));
  if (monthIndex === -1) return null;

  const [, day, hour, minute, second, year] = match;
  const date = new Date(
    Number(year), monthIndex, Number(day),
    Number(hour), Number(minute), Number(second),
  );
  if (Number.isNaN(date.getTime())) return null;

  return { clock: `${hour}:${minute}`, date };
}
