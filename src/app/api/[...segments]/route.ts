import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ApiError,
  SESSION_COOKIE,
  CSRF_COOKIE,
  newCsrf,
  validCsrf,
  setCookie,
  checkCsrf,
  requireUser,
  verifyPassword,
  createSession,
  revokeSession,
  takeLoginAttempt,
  clearAccountAttempts,
  ABSOLUTE_MS,
} from '@/server/auth';
import { db } from '@/server/db';
import {
  addItem,
  changeItem,
  getCart,
  getOrder,
  listOrders,
  placeOrder,
  addItemSchema,
  quantityBodySchema,
  checkoutSchema,
  idempotencySchema,
  productIdSchema,
  validate,
  noQuery,
} from '@/server/commerce';
import { listProducts, getProduct, categoryCounts, inventorySummary } from '@/server/catalog';
import type { User } from '@/shared/types';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict();
async function jsonBody(req: NextRequest) {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send an application/json request body.');
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, 'INVALID_JSON', 'A JSON body is required.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) {
      await reader.cancel();
      throw new ApiError(413, 'BODY_TOO_LARGE', 'The request body is too large.');
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Send a valid JSON request body.');
  }
}
async function dispatch(req: NextRequest) {
  const p = req.nextUrl.pathname;
  const method = req.method;
  if (method === 'GET') {
    if (p === '/api/health') return NextResponse.json({ status: 'ok', release: '0.2.0' });
    if (p === '/api/auth/csrf') {
      const old = req.cookies.get(CSRF_COOKIE)?.value;
      const token = old && validCsrf(old) ? old : newCsrf();
      const res = NextResponse.json({ csrfToken: token });
      setCookie(res, CSRF_COOKIE, token, ABSOLUTE_MS / 1000);
      return res;
    }
    if (p === '/api/auth/session') return NextResponse.json({ user: requireUser(req) });
    if (p === '/api/products') {
      requireUser(req);
      return NextResponse.json(listProducts(req.nextUrl.searchParams));
    }
    if (p === '/api/categories') {
      requireUser(req);
      return NextResponse.json({ items: categoryCounts() });
    }
    if (p.startsWith('/api/products/') && p.split('/').length === 4) {
      requireUser(req);
      return NextResponse.json({
        product: getProduct(decodeURIComponent(p.split('/')[3])),
      });
    }
    if (p === '/api/inventory') {
      requireUser(req, 'staff');
      return NextResponse.json({
        ...listProducts(req.nextUrl.searchParams, true),
        summary: inventorySummary(),
      });
    }
  }
  if (
    p === '/api/cart' ||
    p === '/api/cart/items' ||
    /^\/api\/cart\/items\/[^/]+$/.test(p) ||
    p === '/api/orders' ||
    /^\/api\/orders\/[^/]+$/.test(p)
  ) {
    const allowed =
      p === '/api/cart'
        ? ['GET']
        : p === '/api/cart/items'
          ? ['POST']
          : p.startsWith('/api/cart/items/')
            ? ['PATCH', 'DELETE']
            : p === '/api/orders'
              ? ['GET', 'POST']
              : ['GET'];
    if (!allowed.includes(method))
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'This operation is not supported.');
    const user = requireUser(req, 'customer');
    if (method !== 'GET') checkCsrf(req);
    if (!(p === '/api/orders' && method === 'GET')) noQuery(req.nextUrl.searchParams);
    if (p === '/api/cart') return NextResponse.json({ cart: getCart(user.id) });
    if (p === '/api/cart/items') {
      const input = validate(addItemSchema, await jsonBody(req));
      return NextResponse.json({
        cart: addItem(user.id, input.productId, input.quantity),
      });
    }
    if (p.startsWith('/api/cart/items/')) {
      const id = validate(productIdSchema, decodeURIComponent(p.split('/')[4]));
      const quantity =
        method === 'PATCH' ? validate(quantityBodySchema, await jsonBody(req)).quantity : undefined;
      return NextResponse.json({ cart: changeItem(user.id, id, quantity) });
    }
    if (p === '/api/orders' && method === 'GET')
      return NextResponse.json(listOrders(user.id, req.nextUrl.searchParams));
    if (p === '/api/orders') {
      const key = validate(idempotencySchema, req.headers.get('Idempotency-Key'));
      const input = validate(checkoutSchema, await jsonBody(req));
      const result = placeOrder(user.id, key, input);
      return NextResponse.json(result, {
        status: result.replayed ? 200 : 201,
        headers: { Location: `/api/orders/${result.order.id}` },
      });
    }
    return NextResponse.json({
      order: getOrder(user.id, decodeURIComponent(p.split('/')[3])),
    });
  }
  if (method === 'POST' && p === '/api/auth/login') {
    checkCsrf(req);
    const parsed = loginSchema.safeParse(await jsonBody(req));
    if (!parsed.success)
      throw new ApiError(
        422,
        'VALIDATION_ERROR',
        'Check your email and password.',
        parsed.error.flatten().fieldErrors,
      );
    const { email, password } = parsed.data;
    takeLoginAttempt(email);
    const row = db()
      .prepare('SELECT id,email,name,role,password_hash FROM users WHERE email=?')
      .get(email) as (User & { password_hash: string }) | undefined;
    const dummy = db().prepare('SELECT password_hash FROM users LIMIT 1').get() as {
      password_hash: string;
    };
    const verified = await verifyPassword(password, row?.password_hash ?? dummy.password_hash);
    if (!row || !verified)
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
    clearAccountAttempts(email);
    const { id, name, role } = row;
    const csrfToken = newCsrf();
    const res = NextResponse.json({
      user: { id, email, name, role },
      csrfToken,
    });
    setCookie(
      res,
      SESSION_COOKIE,
      createSession(id, req.cookies.get(SESSION_COOKIE)?.value),
      ABSOLUTE_MS / 1000,
    );
    setCookie(res, CSRF_COOKIE, csrfToken, ABSOLUTE_MS / 1000);
    return res;
  }
  if (method === 'POST' && p === '/api/auth/logout') {
    checkCsrf(req);
    requireUser(req);
    revokeSession(req.cookies.get(SESSION_COOKIE)!.value);
    const res = new NextResponse(null, { status: 204 });
    setCookie(res, SESSION_COOKIE, '', 0);
    setCookie(res, CSRF_COOKIE, '', 0);
    return res;
  }
  const known =
    /^\/api\/(health|auth\/(csrf|session|login|logout)|products(?:\/[^/]+)?|categories|inventory)$/.test(
      p,
    );
  if (known) throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'This operation is not supported.');
  throw new ApiError(404, 'ENDPOINT_NOT_FOUND', 'This endpoint could not be found.');
}
async function handle(req: NextRequest) {
  const requestId = crypto.randomUUID();
  let res: NextResponse;
  try {
    res = await dispatch(req);
  } catch (error) {
    const e =
      error instanceof ApiError
        ? error
        : new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
    if (!(error instanceof ApiError))
      console.error('Request failed', {
        requestId,
        type: error instanceof Error ? error.name : 'UnknownError',
      });
    res = NextResponse.json(
      {
        error: {
          code: e.code,
          message: e.message,
          ...(e.fields ? { fields: e.fields } : {}),
        },
        requestId,
      },
      { status: e.status },
    );
    if (e.retryAfter) res.headers.set('Retry-After', String(e.retryAfter));
    if (e.status === 405)
      res.headers.set(
        'Allow',
        req.nextUrl.pathname === '/api/cart/items'
          ? 'POST'
          : req.nextUrl.pathname.startsWith('/api/cart/items/')
            ? 'PATCH, DELETE'
            : req.nextUrl.pathname === '/api/orders'
              ? 'GET, POST'
              : /\/auth\/(login|logout)$/.test(req.nextUrl.pathname)
                ? 'POST'
                : 'GET',
      );
  }
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('X-Request-ID', requestId);
  return res;
}
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
