'use client';
import { useState } from 'react';
import type { User } from '@/shared/types';
import { Brand } from './art';
export function Shell({
  user,
  active,
  children,
}: {
  user: User;
  active: 'catalog' | 'inventory' | 'cart' | 'orders';
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    setBusy(true);
    setError('');
    try {
      const csrf = await fetch('/api/auth/csrf', { cache: 'no-store' });
      if (!csrf.ok) throw new Error();
      const { csrfToken } = await csrf.json();
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      if (!res.ok && res.status !== 401) throw new Error();
      window.location.assign('/login');
    } catch {
      setError('We could not sign you out. Please try again.');
      setBusy(false);
    }
  }
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav aria-label="Main navigation">
            <a href="/catalog" aria-current={active === 'catalog' ? 'page' : undefined}>
              Catalog
            </a>
            {user.role === 'customer' && (
              <>
                <a href="/cart" aria-current={active === 'cart' ? 'page' : undefined}>
                  Cart
                </a>
                <a href="/orders" aria-current={active === 'orders' ? 'page' : undefined}>
                  My orders
                </a>
              </>
            )}
            {user.role === 'staff' && (
              <a href="/inventory" aria-current={active === 'inventory' ? 'page' : undefined}>
                Inventory
              </a>
            )}
          </nav>
          <div className="account-menu">
            <span className="avatar" aria-hidden="true">
              {user.name
                .split(' ')
                .map((s) => s[0])
                .join('')}
            </span>
            <span className="account-name">
              {user.name}
              <small>{user.role === 'staff' ? 'Operations staff' : 'Customer account'}</small>
            </span>
            <button className="text-button signout" onClick={logout} disabled={busy}>
              {busy ? 'Signing out…' : 'Sign out'} <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
      </header>
      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}
      {children}
      <footer className="site-footer">
        <Brand />
        <p>Considered tools. Everyday possibilities.</p>
        <span>Prices in EUR · Stockroom</span>
      </footer>
    </>
  );
}
