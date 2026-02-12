import { ViewEntity } from 'typeorm';
import { Census } from './Census.js';

/**
 * Read-only database view returning only non-dropped characters.
 *
 * Defined as `SELECT * FROM census WHERE status != 'Dropped'`.
 * Commands that need to list "current" characters (e.g. `/toons`, autocomplete
 * helpers) query this view instead of the raw `Census` table.
 */
@ViewEntity({
  expression: `
    SELECT *
    FROM census
    WHERE status != 'Dropped'
  `,
})
export class ActiveToons extends Census {}
