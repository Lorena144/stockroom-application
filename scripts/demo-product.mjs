import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
if (process.env.NODE_ENV === 'production')
  throw new Error('Demo product changes are disabled in production.');
if (existsSync('.env.local')) loadEnvFile('.env.local');
const args = process.argv.slice(2);
const values = new Map();
for (let i = 0; i < args.length; i += 2) {
  const key = args[i],
    value = args[i + 1];
  if (
    !['--sku', '--stock', '--price-cents'].includes(key) ||
    value === undefined ||
    values.has(key)
  )
    throw new Error(
      'Usage: npm run demo:product -- --sku SR-101 [--stock 18] [--price-cents 12900]',
    );
  values.set(key, value);
}
if (!values.has('--sku') || (!values.has('--stock') && !values.has('--price-cents')))
  throw new Error('Supply --sku and at least --stock or --price-cents.');
const sets = [],
  parameters = [];
for (const [flag, column, maximum] of [
  ['--stock', 'stock', 100000],
  ['--price-cents', 'price_cents', 100000000],
]) {
  if (values.has(flag)) {
    const raw = values.get(flag),
      n = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(n) || n > maximum)
      throw new Error(`${flag} must be an integer from 0 to ${maximum}.`);
    sets.push(`${column}=?`);
    parameters.push(n);
  }
}
const file = process.env.DATABASE_PATH || 'var/order-inventory.sqlite';
if (!existsSync(file)) throw new Error('Run npm run setup first.');
const database = new DatabaseSync(file);
try {
  database.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  const result = database
    .prepare(`UPDATE products SET ${sets.join(',')} WHERE sku=?`)
    .run(...parameters, values.get('--sku'));
  if (Number(result.changes) !== 1)
    throw new Error('Product SKU not found; no product was changed.');
  console.log(
    'Demo product updated. Refresh the cart or catalog. Existing order snapshots were preserved.',
  );
} finally {
  database.close();
}
