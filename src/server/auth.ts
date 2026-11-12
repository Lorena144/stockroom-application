import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest, NextResponse } from 'next/server';
import type { User } from '@/shared/types';
import { db } from './db';
export const SESSION_COOKIE = 'stockroom_session';
export const CSRF_COOKIE = 'stockroom_csrf';
export const IDLE_MS = 30 * 60 * 1000;
export const ABSOLUTE_MS = 8 * 60 * 60 * 1000;
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const equal = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
    public retryAfter?: number,
  ) {
    super(message);
  }
}
export function origin() {
  return process.env.APP_ORIGIN || 'http://127.0.0.1:3000';
}
function secret() {
  const value = process.env.CSRF_SECRET;
  if (!value || value.length < 64) throw new Error('Configure CSRF_SECRET using npm run setup.');
  return value;
}
export function newCsrf() {
  const token = randomBytes(32).toString('hex');
  return `${token}.${createHmac('sha256', secret()).update(token).digest('hex')}`;
}
export function validCsrf(token: string) {
  if (!/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token)) return false;
  const [random, signature] = token.split('.');
  return equal(createHmac('sha256', secret()).update(random).digest('hex'), signature);
}
export function setCookie(res: NextResponse, name: string, value: string, maxAge: number) {
  res.cookies.set(name, value, {
    httpOnly: true,
    secure: origin().startsWith('https:'),
    sameSite: 'strict',
    path: '/',
    maxAge,
  });
}
export function checkCsrf(req: NextRequest) {
  if (req.headers.get('origin') !== origin())
    throw new ApiError(
      403,
      'ORIGIN_REJECTED',
      'This request must come from the application origin.',
    );
  const cookie = req.cookies.get(CSRF_COOKIE)?.value || '';
  const header = req.headers.get('x-csrf-token') || '';
  if (!cookie || !validCsrf(cookie) || !equal(cookie, header))
    throw new ApiError(403, 'CSRF_INVALID', 'Refresh your session and try again.');
}
export function sessionUser(token?: string): User | null {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const now = Date.now();
  const row = db()
    .prepare(
      `SELECT u.id,u.email,u.name,u.role,s.last_seen_at,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=?`,
    )
    .get(hash(token)) as (User & { last_seen_at: number; expires_at: number }) | undefined;
  if (!row) return null;
  if (row.expires_at <= now || now - row.last_seen_at >= IDLE_MS) {
    db().prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));
    return null;
  }
  db().prepare('UPDATE sessions SET last_seen_at=? WHERE token_hash=?').run(now, hash(token));
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}
export function requireUser(req: NextRequest, role?: User['role']) {
  const user = sessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  if (role && user.role !== role)
    throw new ApiError(
      403,
      'FORBIDDEN',
      role === 'customer'
        ? 'This area is available to customers only.'
        : 'This area is available to operations staff only.',
    );
  return user;
}
export async function pageUser() {
  const user = sessionUser((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) redirect('/login');
  return user;
}
export async function verifyPassword(password: string, stored: string) {
  const [, salt, expected] = stored.split(':');
  const actual = await new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
export function createSession(userId: string, oldToken?: string) {
  if (oldToken) revokeSession(oldToken);
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  db()
    .prepare('DELETE FROM sessions WHERE expires_at <= ? OR last_seen_at <= ?')
    .run(now, now - IDLE_MS);
  db()
    .prepare(
      'INSERT INTO sessions(token_hash,user_id,created_at,last_seen_at,expires_at) VALUES(?,?,?,?,?)',
    )
    .run(hash(token), userId, now, now, now + ABSOLUTE_MS);
  return token;
}
export function revokeSession(token: string) {
  db().prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));
}
export function takeLoginAttempt(email: string) {
  const now = Date.now();
  db().prepare('DELETE FROM login_limits WHERE resets_at <= ?').run(now);
  for (const [key, limit, duration] of [
    [hash(`account:${email}`), 5, 15 * 60 * 1000],
    ['installation', 30, 60 * 1000],
  ] as const) {
    const row = db().prepare('SELECT count,resets_at FROM login_limits WHERE key=?').get(key) as
      { count: number; resets_at: number } | undefined;
    if (row && row.count >= limit)
      throw new ApiError(
        429,
        'LOGIN_RATE_LIMITED',
        'Too many sign-in attempts. Please try again later.',
        undefined,
        Math.ceil((row.resets_at - now) / 1000),
      );
  }
  for (const [key, duration] of [
    [hash(`account:${email}`), 15 * 60 * 1000],
    ['installation', 60 * 1000],
  ] as const) {
    db()
      .prepare(
        'INSERT INTO login_limits(key,count,resets_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',
      )
      .run(key, now + duration);
  }
}
export function clearAccountAttempts(email: string) {
  db()
    .prepare('DELETE FROM login_limits WHERE key=?')
    .run(hash(`account:${email}`));
}
