/**
 * better-sqlite3 returns SQLite's 0/1 INTEGER booleans as raw JS numbers, not
 * booleans. Left uncoerced, that's a footgun on both sides: JSON callers see
 * `0`/`1` instead of `false`/`true`, and frontend code doing
 * `{cond && row.isPopular && <Badge/>}` renders a stray literal "0" when the
 * value is 0 (falsy-but-not-boolean, so the && chain doesn't short-circuit
 * to nothing). Coerce known boolean columns to real booleans right where
 * each repository reads them, so nothing downstream has to know SQLite's
 * storage representation.
 */
export function boolify(row, keys) {
  if (!row) return row;
  for (const key of keys) {
    if (key in row) row[key] = row[key] === 1 || row[key] === true;
  }
  return row;
}

export function boolifyAll(rows, keys) {
  for (const row of rows) boolify(row, keys);
  return rows;
}
