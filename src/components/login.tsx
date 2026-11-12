'use client';
import { useState } from 'react';
import { Brand, ProductArt } from './art';
export function Login() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const csrf = await fetch('/api/auth/csrf', { cache: 'no-store' });
      if (!csrf.ok) throw new Error();
      const { csrfToken } = await csrf.json();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error.message);
        setBusy(false);
        return;
      }
      window.location.assign('/catalog');
    } catch {
      setError('We could not connect. Check your connection and try again.');
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <Brand />
        <div className="login-story-content">
          <p className="eyebrow">A little more considered</p>
          <h1>
            Make room
            <br />
            for good work.
          </h1>
          <p>
            Thoughtful essentials for the way you work.
            <br />
            Find your everyday, beautifully equipped.
          </p>
          <div className="login-illustration">
            <ProductArt kind="monitor" color="sage" large />
            <ProductArt kind="keyboard" color="sand" large />
          </div>
        </div>
        <span className="story-footnote">Your workspace starts here.</span>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <span className="tiny-label">WELCOME TO STOCKROOM</span>
          <h2>Good to see you.</h2>
          <p className="muted">Sign in to explore your next workspace essential.</p>
          <form onSubmit={submit} aria-label="Sign in">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              placeholder="you@example.com"
              disabled={busy}
            />
            <label htmlFor="login-password">Password</label>
            <div className="password-field">
              <input
                id="login-password"
                name="password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                required
                maxLength={128}
                disabled={busy}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShow(!show)}
                aria-label={show ? 'Hide password' : 'Show password'}
                aria-pressed={show}
              >
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
            {error && (
              <p className="form-error" role="alert" data-testid="login-error">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="button primary login-submit"
              disabled={busy}
              data-testid="sign-in-button"
            >
              {busy ? 'Signing in…' : 'Sign in'}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="login-assistance">Need access? Contact your account administrator.</p>
        </div>
        <p className="login-copyright">
          © {new Date().getFullYear()} Stockroom. Made for your workday.
        </p>
      </section>
    </main>
  );
}
