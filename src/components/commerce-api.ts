'use client';
export class CommerceError extends Error {
  constructor(
    message: string,
    public code = 'NETWORK_ERROR',
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export async function commerceRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const method = (options.method ?? 'GET').toUpperCase();
  if (!['GET', 'HEAD'].includes(method)) {
    const tokenResponse = await fetch('/api/auth/csrf', { cache: 'no-store' });
    if (!tokenResponse.ok)
      throw new CommerceError('Unable to prepare this request. Please try again.');
    const { csrfToken } = await tokenResponse.json();
    headers.set('X-CSRF-Token', csrfToken);
    if (options.body) headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(url, { ...options, headers, cache: 'no-store' });
  if (response.status === 401) {
    window.location.assign('/login');
    throw new CommerceError('Please sign in again.', 'UNAUTHENTICATED');
  }
  const body = await response.json();
  if (!response.ok)
    throw new CommerceError(
      body.error?.message ?? 'This request could not be completed.',
      body.error?.code,
      body.error?.fields,
    );
  return body as T;
}
export function commerceMessage(error: unknown) {
  if (error instanceof CommerceError)
    return [error.message, ...Object.values(error.fields ?? {}).flat()].join(' ');
  return 'We could not connect. Please try again.';
}
