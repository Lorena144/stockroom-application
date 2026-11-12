import { z } from 'zod';
import type { Product, InventoryProduct } from '@/shared/types';
import { db } from './db';
import { ApiError } from './auth';
export const categories = ['Accessories', 'Audio', 'Computers', 'Displays', 'Workspace'] as const;
export const querySchema = z
  .object({
    q: z.string().trim().max(100).default(''),
    category: z.enum(['all', ...categories]).default('all'),
    stock: z.enum(['all', 'available', 'low', 'out']).default('all'),
    sort: z
      .enum(['name-asc', 'name-desc', 'price-asc', 'price-desc', 'stock-asc', 'stock-desc'])
      .default('name-asc'),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.enum(['6', '12', '24']).default('6'),
  })
  .strict();
type Row = {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  price_cents: number;
  stock: number;
  cost_cents: number;
  supplier: string;
  art: string;
  color: string;
  specs: string;
};
export function publicProduct(row: Row): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    description: row.description,
    priceCents: row.price_cents,
    stock: row.stock,
    art: row.art,
    color: row.color,
    specs: JSON.parse(row.specs),
  };
}
function inventoryProduct(row: Row): InventoryProduct {
  return {
    ...publicProduct(row),
    costCents: row.cost_cents,
    supplier: row.supplier,
    stockStatus: row.stock === 0 ? 'out-of-stock' : row.stock <= 5 ? 'low-stock' : 'in-stock',
  };
}
export function listProducts(params: URLSearchParams, inventory = false) {
  for (const key of new Set(params.keys()))
    if (params.getAll(key).length > 1)
      throw new ApiError(422, 'VALIDATION_ERROR', 'Query parameters must not be repeated.');
  const parsed = querySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success)
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      'Check the supplied filters.',
      parsed.error.flatten().fieldErrors,
    );
  const q = parsed.data;
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  if (q.q) {
    conditions.push("(name LIKE ? ESCAPE '\\' OR sku LIKE ? ESCAPE '\\')");
    const pattern = `%${q.q.replace(/[\\%_]/g, '\\$&')}%`;
    values.push(pattern, pattern);
  }
  if (q.category !== 'all') {
    conditions.push('category=?');
    values.push(q.category);
  }
  if (q.stock === 'available') conditions.push('stock > 0');
  if (q.stock === 'low') conditions.push('stock BETWEEN 1 AND 5');
  if (q.stock === 'out') conditions.push('stock=0');
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const order = {
    'name-asc': 'name COLLATE NOCASE ASC',
    'name-desc': 'name COLLATE NOCASE DESC',
    'price-asc': 'price_cents ASC',
    'price-desc': 'price_cents DESC',
    'stock-asc': 'stock ASC',
    'stock-desc': 'stock DESC',
  }[q.sort];
  const pageSize = Number(q.pageSize);
  const total = (
    db()
      .prepare(`SELECT COUNT(*) AS count FROM products ${where}`)
      .get(...values) as { count: number }
  ).count;
  const rows = db()
    .prepare(`SELECT * FROM products ${where} ORDER BY ${order}, id ASC LIMIT ? OFFSET ?`)
    .all(...values, pageSize, (q.page - 1) * pageSize) as Row[];
  return {
    items: rows.map(inventory ? inventoryProduct : publicProduct),
    total,
    page: q.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
export function getProduct(id: string) {
  const row = db().prepare('SELECT * FROM products WHERE id=?').get(id) as Row | undefined;
  if (!row) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'This product could not be found.');
  return publicProduct(row);
}
export function categoryCounts() {
  return db()
    .prepare(
      'SELECT category AS name, COUNT(*) AS count FROM products GROUP BY category ORDER BY category',
    )
    .all();
}
export function inventorySummary() {
  return db()
    .prepare(
      'SELECT COUNT(*) AS products, SUM(stock) AS units, SUM(CASE WHEN stock BETWEEN 1 AND 5 THEN 1 ELSE 0 END) AS lowStock, SUM(CASE WHEN stock=0 THEN 1 ELSE 0 END) AS outOfStock FROM products',
    )
    .get();
}
