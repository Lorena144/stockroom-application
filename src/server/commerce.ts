import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ApiError } from './auth';
import { db } from './db';
import type { Cart, CartItem, Order, OrderSummary, OrderResult } from '@/shared/types';

export const productIdSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .max(100);
const quantitySchema = z.number().int().min(1).max(99);
export const addItemSchema = z
  .object({ productId: productIdSchema, quantity: quantitySchema })
  .strict();
export const quantityBodySchema = z.object({ quantity: quantitySchema }).strict();
export const checkoutSchema = z
  .object({
    cartVersion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    checkoutToken: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const idempotencySchema = z.string().uuid();
const ordersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.enum(['6', '12', '24']).default('6'),
  })
  .strict();

export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      'Check the supplied values.',
      result.error.flatten().fieldErrors as Record<string, string[]>,
    );
  return result.data;
}
export function noQuery(params: URLSearchParams) {
  if (params.size)
    throw new ApiError(422, 'VALIDATION_ERROR', 'This operation does not accept query parameters.');
}
function transaction<T>(work: () => T): T {
  const database = db();
  database.exec('BEGIN IMMEDIATE');
  try {
    const value = work();
    database.exec('COMMIT');
    return value;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
function amount(value: number) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new ApiError(
      409,
      'PRICE_UNAVAILABLE',
      'A product price cannot be used. Please contact the administrator.',
    );
  return value;
}
function quote(userId: string, version: number, items: CartItem[]) {
  const secret = process.env.CSRF_SECRET;
  if (!secret || secret.length < 64) throw new Error('Configure CSRF_SECRET using npm run setup.');
  return createHmac('sha256', secret)
    .update(
      JSON.stringify({
        userId,
        version,
        lines: items.map((i) => [i.productId, i.quantity, i.unitPriceCents]),
      }),
    )
    .digest('hex');
}
export function getCart(userId: string): Cart {
  const version =
    (
      db().prepare('SELECT revision FROM carts WHERE user_id=?').get(userId) as
        { revision: number } | undefined
    )?.revision ?? 0;
  const rows = db()
    .prepare(
      `SELECT p.id AS productId,p.sku,p.name,p.art,p.color,p.stock,
    p.price_cents AS unitPriceCents,c.quantity,c.added_price_cents AS addedPriceCents
    FROM cart_items c JOIN products p ON p.id=c.product_id WHERE c.user_id=? ORDER BY p.id`,
    )
    .all(userId) as unknown as Omit<CartItem, 'subtotalCents' | 'priceChanged' | 'available'>[];
  const items: CartItem[] = rows.map((row) => ({
    ...row,
    subtotalCents: amount(row.unitPriceCents * row.quantity),
    priceChanged: row.unitPriceCents !== row.addedPriceCents,
    available: row.quantity <= row.stock,
  }));
  return {
    version,
    currency: 'EUR',
    items,
    itemCount: items.length,
    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
    totalCents: amount(items.reduce((sum, i) => sum + i.subtotalCents, 0)),
    canCheckout: items.length > 0 && items.every((i) => i.available),
    checkoutToken: quote(userId, version, items),
  };
}
function productForCart(id: string) {
  const product = db().prepare('SELECT stock,price_cents FROM products WHERE id=?').get(id) as
    { stock: number; price_cents: number } | undefined;
  if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'This product could not be found.');
  return product;
}
function stockCheck(id: string, quantity: number, stock: number) {
  if (quantity > stock)
    throw new ApiError(
      409,
      'INSUFFICIENT_STOCK',
      'The requested quantity is no longer available.',
      {
        [id]: [`Only ${stock} units are available. Reduce the quantity or remove this product.`],
      },
    );
}
export function addItem(userId: string, productId: string, quantity: number) {
  return transaction(() => {
    const product = productForCart(productId);
    db().prepare('INSERT OR IGNORE INTO carts(user_id) VALUES(?)').run(userId);
    const existing = db()
      .prepare('SELECT quantity FROM cart_items WHERE user_id=? AND product_id=?')
      .get(userId, productId) as { quantity: number } | undefined;
    const next = (existing?.quantity ?? 0) + quantity;
    if (next > 99)
      throw new ApiError(
        422,
        'QUANTITY_LIMIT',
        'A cart can contain at most 99 units of one product.',
      );
    const count = (
      db().prepare('SELECT COUNT(*) AS n FROM cart_items WHERE user_id=?').get(userId) as {
        n: number;
      }
    ).n;
    if (!existing && count >= 50)
      throw new ApiError(422, 'CART_LIMIT', 'A cart can contain at most 50 different products.');
    stockCheck(productId, next, product.stock);
    db()
      .prepare(
        `INSERT INTO cart_items(user_id,product_id,quantity,added_price_cents) VALUES(?,?,?,?)
      ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=excluded.quantity`,
      )
      .run(userId, productId, next, product.price_cents);
    db().prepare('UPDATE carts SET revision=revision+1 WHERE user_id=?').run(userId);
    return getCart(userId);
  });
}
export function changeItem(userId: string, productId: string, quantity?: number) {
  return transaction(() => {
    const existing = db()
      .prepare('SELECT quantity FROM cart_items WHERE user_id=? AND product_id=?')
      .get(userId, productId);
    if (!existing)
      throw new ApiError(404, 'CART_ITEM_NOT_FOUND', 'This item could not be found in your cart.');
    if (quantity === undefined)
      db()
        .prepare('DELETE FROM cart_items WHERE user_id=? AND product_id=?')
        .run(userId, productId);
    else {
      stockCheck(productId, quantity, productForCart(productId).stock);
      db()
        .prepare('UPDATE cart_items SET quantity=? WHERE user_id=? AND product_id=?')
        .run(quantity, userId, productId);
    }
    db().prepare('UPDATE carts SET revision=revision+1 WHERE user_id=?').run(userId);
    return getCart(userId);
  });
}
type OrderRow = {
  id: string;
  number: string;
  status: 'placed';
  total_cents: number;
  created_at: number;
  cart_revision: number;
  request_fingerprint: string;
  item_count: number;
  total_quantity: number;
};
const orderSelect = `SELECT o.*,COUNT(i.product_id) AS item_count,COALESCE(SUM(i.quantity),0) AS total_quantity
  FROM orders o JOIN order_items i ON i.order_id=o.id`;
function summary(row: OrderRow): OrderSummary {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    currency: 'EUR',
    totalCents: row.total_cents,
    itemCount: row.item_count,
    totalQuantity: row.total_quantity,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
export function getOrder(userId: string, id: string): Order {
  const row = db()
    .prepare(`${orderSelect} WHERE o.id=? AND o.user_id=? GROUP BY o.id`)
    .get(id, userId) as OrderRow | undefined;
  if (!row) throw new ApiError(404, 'ORDER_NOT_FOUND', 'This order could not be found.');
  const items = db()
    .prepare(
      `SELECT product_id AS productId,sku,name,quantity,unit_price_cents AS unitPriceCents,
    subtotal_cents AS subtotalCents FROM order_items WHERE order_id=? ORDER BY product_id`,
    )
    .all(id) as unknown as Order['items'];
  return { ...summary(row), items };
}
export function listOrders(userId: string, params: URLSearchParams): OrderResult {
  for (const key of new Set(params.keys()))
    if (params.getAll(key).length > 1)
      throw new ApiError(422, 'VALIDATION_ERROR', 'Query parameters must not be repeated.');
  const query = validate(ordersQuerySchema, Object.fromEntries(params));
  const pageSize = Number(query.pageSize);
  const total = (
    db().prepare('SELECT COUNT(*) AS total FROM orders WHERE user_id=?').get(userId) as {
      total: number;
    }
  ).total;
  const rows = db()
    .prepare(
      `${orderSelect} WHERE o.user_id=? GROUP BY o.id ORDER BY o.created_at DESC,o.id DESC LIMIT ? OFFSET ?`,
    )
    .all(userId, pageSize, (query.page - 1) * pageSize) as OrderRow[];
  return {
    items: rows.map(summary),
    total,
    page: query.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
export function placeOrder(
  userId: string,
  key: string,
  input: z.infer<typeof checkoutSchema>,
): { order: Order; replayed: boolean } {
  const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return transaction(() => {
    const previous = db()
      .prepare(
        'SELECT order_id,request_fingerprint FROM order_requests WHERE user_id=? AND idempotency_key=?',
      )
      .get(userId, key) as { order_id: string; request_fingerprint: string } | undefined;
    if (previous) {
      if (previous.request_fingerprint !== fingerprint)
        throw new ApiError(
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'This request key was already used for different order details.',
        );
      return { order: getOrder(userId, previous.order_id), replayed: true };
    }
    const consumed = db()
      .prepare('SELECT id,request_fingerprint FROM orders WHERE user_id=? AND cart_revision=?')
      .get(userId, input.cartVersion) as { id: string; request_fingerprint: string } | undefined;
    if (consumed) {
      if (consumed.request_fingerprint !== fingerprint)
        throw new ApiError(
          409,
          'CART_CHANGED',
          'This cart version has already been ordered. Refresh your cart.',
        );
      db()
        .prepare(
          'INSERT INTO order_requests(user_id,idempotency_key,request_fingerprint,order_id) VALUES(?,?,?,?)',
        )
        .run(userId, key, fingerprint, consumed.id);
      return { order: getOrder(userId, consumed.id), replayed: true };
    }
    const cart = getCart(userId);
    if (!cart.items.length)
      throw new ApiError(
        409,
        'EMPTY_CART',
        'Your cart is empty. Add a product before placing an order.',
      );
    if (cart.version !== input.cartVersion)
      throw new ApiError(
        409,
        'CART_CHANGED',
        'Your cart changed in another request. Refresh it and review the quantities.',
      );
    if (
      !timingSafeEqual(
        Buffer.from(cart.checkoutToken, 'hex'),
        Buffer.from(input.checkoutToken, 'hex'),
      )
    )
      throw new ApiError(
        409,
        'PRICE_CHANGED',
        'Prices changed since your cart was displayed. Refresh the cart and review the new total.',
      );
    const unavailable = cart.items.filter((i) => !i.available);
    if (unavailable.length)
      throw new ApiError(
        409,
        'STOCK_CHANGED',
        'Some products no longer have enough stock. No order was created.',
        Object.fromEntries(
          unavailable.map((i) => [
            i.productId,
            [`Only ${i.stock} units of ${i.name} are available. Reduce the quantity or remove it.`],
          ]),
        ),
      );
    const id = `ord-${randomUUID()}`;
    const number = `SR-${randomBytes(6).toString('hex').toUpperCase()}`;
    db()
      .prepare(
        `INSERT INTO orders(id,number,user_id,cart_revision,request_fingerprint,status,total_cents,created_at)
      VALUES(?,?,?,?,?,'placed',?,?)`,
      )
      .run(id, number, userId, cart.version, fingerprint, cart.totalCents, Date.now());
    for (const item of cart.items) {
      const result = db()
        .prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock>=?')
        .run(item.quantity, item.productId, item.quantity);
      if (Number(result.changes) !== 1)
        throw new ApiError(
          409,
          'STOCK_CHANGED',
          'Stock changed. No order was created; refresh your cart.',
        );
      db()
        .prepare(
          `INSERT INTO order_items(order_id,product_id,sku,name,quantity,unit_price_cents,subtotal_cents) VALUES(?,?,?,?,?,?,?)`,
        )
        .run(
          id,
          item.productId,
          item.sku,
          item.name,
          item.quantity,
          item.unitPriceCents,
          item.subtotalCents,
        );
    }
    db()
      .prepare(
        'INSERT INTO order_requests(user_id,idempotency_key,request_fingerprint,order_id) VALUES(?,?,?,?)',
      )
      .run(userId, key, fingerprint, id);
    db().prepare('DELETE FROM cart_items WHERE user_id=?').run(userId);
    db().prepare('UPDATE carts SET revision=revision+1 WHERE user_id=?').run(userId);
    return { order: getOrder(userId, id), replayed: false };
  });
}
