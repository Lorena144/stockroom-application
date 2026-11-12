import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
const reset = process.argv.includes('--reset');
if (process.env.NODE_ENV === 'production')
  throw new Error('Demo setup and reset are disabled in production.');
if (reset && !process.argv.includes('--confirm-reset'))
  throw new Error('Reset requires --confirm-reset.');
if (!existsSync('.env.local'))
  writeFileSync(
    '.env.local',
    `APP_ORIGIN=http://127.0.0.1:3000\nDATABASE_PATH=var/order-inventory.sqlite\nCSRF_SECRET=${randomBytes(32).toString('hex')}\n`,
    { mode: 0o600 },
  );
loadEnvFile('.env.local');
if (!process.env.CSRF_SECRET || process.env.CSRF_SECRET.length < 64)
  throw new Error('CSRF_SECRET must contain at least 64 characters.');
const databasePath = path.resolve(process.env.DATABASE_PATH || 'var/order-inventory.sqlite');
mkdirSync(path.dirname(databasePath), { recursive: true });
mkdirSync('.local', { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
for (const file of readdirSync('migrations')
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort()) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(readFileSync(path.join('migrations', file), 'utf8'));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
const existing = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
if (existing && !reset) {
  if (!existsSync('.local/demo-accounts.txt'))
    throw new Error(
      'Credential file is missing. Run npm run demo:reset to generate new local accounts.',
    );
  console.log('Existing demo data preserved. Credentials: .local/demo-accounts.txt');
  db.close();
  process.exit(0);
}
const accounts = [
  {
    id: 'usr-customer-01',
    email: 'customer@stockroom.test',
    name: 'Alex Morgan',
    role: 'customer',
  },
  {
    id: 'usr-customer-02',
    email: 'second@stockroom.test',
    name: 'Jamie Reed',
    role: 'customer',
  },
  {
    id: 'usr-staff-01',
    email: 'staff@stockroom.test',
    name: 'Sam Taylor',
    role: 'staff',
  },
];
const credentials = [];
db.exec('BEGIN IMMEDIATE');
try {
  if (reset)
    db.exec(
      'DELETE FROM order_requests; DELETE FROM order_items; DELETE FROM orders; DELETE FROM cart_items; DELETE FROM carts; DELETE FROM sessions; DELETE FROM login_limits; DELETE FROM products; DELETE FROM users;',
    );
  const insertUser = db.prepare(
    'INSERT INTO users(id,email,name,role,password_hash) VALUES(?,?,?,?,?)',
  );
  for (const account of accounts) {
    const password = randomBytes(18).toString('base64url');
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64, {
      N: 131072,
      r: 8,
      p: 1,
      maxmem: 256 * 1024 * 1024,
    }).toString('hex');
    insertUser.run(account.id, account.email, account.name, account.role, `scrypt:${salt}:${hash}`);
    credentials.push(
      `${account.role.toUpperCase()}\nEmail: ${account.email}\nPassword: ${password}`,
    );
  }
  const products = JSON.parse(readFileSync('src/data/products.json', 'utf8'));
  const insert = db.prepare(
    'INSERT INTO products(id,sku,name,category,description,price_cents,stock,cost_cents,supplier,art,color,specs) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
  );
  for (const p of products)
    insert.run(
      p.id,
      p.sku,
      p.name,
      p.category,
      p.description,
      p.priceCents,
      p.stock,
      p.costCents,
      p.supplier,
      p.art,
      p.color,
      JSON.stringify(p.specs),
    );
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}
writeFileSync(
  '.local/demo-accounts.txt',
  `STOCKROOM LOCAL DEMO ACCOUNTS\nGenerated for this installation. Keep this file out of Git.\n\n${credentials.join('\n\n')}\n`,
  { mode: 0o600 },
);
db.close();
console.log('Demo data ready. Open .local/demo-accounts.txt for your generated passwords.');
