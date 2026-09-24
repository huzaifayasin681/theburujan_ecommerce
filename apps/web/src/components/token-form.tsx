'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function TokenFormInner({ kind }: { kind: 'forgot' | 'reset' | 'verify' }) {
  const searchParams = useSearchParams();
  const urlToken = searchParams?.get('token') || '';
  const [token, setToken] = useState(urlToken);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlToken) {
      setToken(urlToken);
    }
  }, [urlToken]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (kind === 'forgot') {
        await api('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email: email.trim() }),
        });
        setMessage('If an account with that email exists, password reset instructions have been dispatched.');
      } else if (kind === 'reset') {
        await api('/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ token: token.trim(), password }),
        });
        setMessage('Your password has been successfully updated! You can now sign in with your new credentials.');
      } else {
        await api('/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token: token.trim() }),
        });
        setMessage('Your email has been verified successfully.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-surface py-8 px-6 sm:px-8 rounded-2xl border border-border shadow-sm mx-auto max-w-md space-y-4">
      {kind === 'forgot' && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Email Address
          </label>
          <input
            className="w-full rounded-xl border border-input bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="name@example.com"
          />
        </div>
      )}

      {kind === 'reset' && !urlToken && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Reset Token
          </label>
          <input
            className="w-full rounded-xl border border-input bg-surface px-3.5 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            name="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            minLength={32}
            placeholder="Paste secure token"
          />
        </div>
      )}

      {kind === 'reset' && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            New Password
          </label>
          <input
            className="w-full rounded-xl border border-input bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={12}
            required
            placeholder="Minimum 12 characters"
          />
        </div>
      )}

      {kind === 'verify' && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Verification Token
          </label>
          <input
            className="w-full rounded-xl border border-input bg-surface px-3.5 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            name="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            minLength={32}
            placeholder="Paste secure token"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 disabled:opacity-50 shadow-sm"
      >
        {loading
          ? 'Processing...'
          : kind === 'forgot'
          ? 'Send Reset Link'
          : kind === 'reset'
          ? 'Reset Password'
          : 'Verify Email'}
      </button>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 space-y-2">
          <p>{message}</p>
          {kind === 'reset' && (
            <Link href="/login" className="inline-block font-bold underline">
              Proceed to Sign In &rarr;
            </Link>
          )}
        </div>
      )}

      {error && (
        <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function TokenForm(props: { kind: 'forgot' | 'reset' | 'verify' }) {
  return (
    <Suspense fallback={<div className="text-center py-6 text-sm text-muted-foreground">Loading form...</div>}>
      <TokenFormInner {...props} />
    </Suspense>
  );
}
