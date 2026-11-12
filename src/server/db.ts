import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { existsSync } from 'node:fs';
const state = globalThis as unknown as { stockroomDb?: DatabaseSync };
export function db() {
  if (!state.stockroomDb) {
    const file = path.resolve(
      /* turbopackIgnore: true */ process.env.DATABASE_PATH || 'var/order-inventory.sqlite',
    );
    if (!existsSync(/* turbopackIgnore: true */ file))
      throw new Error('Database missing. Run npm run setup.');
    state.stockroomDb = new DatabaseSync(file);
    state.stockroomDb.exec(
      'PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;',
    );
  }
  return state.stockroomDb;
}
