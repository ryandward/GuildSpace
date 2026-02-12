import { ViewColumn, ViewEntity } from 'typeorm';

/**
 * Read-only view of distinct census status values.
 *
 * Defined as `SELECT DISTINCT status FROM census`.
 * Used to populate autocomplete dropdowns for status-based filters.
 */
@ViewEntity({
  expression: `
    SELECT DISTINCT status
    FROM census
  `,
})
export class Status {
  /** A unique census status value (e.g. `"Main"`, `"Alt"`, `"Dropped"`). */
  @ViewColumn({ name: 'status' })
  Status: string;
}
