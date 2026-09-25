'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, AlertCircle, ArrowLeft, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || busy) return;

    setBusy(true);
    setError('');

    try {
      const res = await api<{ user?: { roles?: string[] }; roles?: string[] }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const roles = res?.roles ?? res?.user?.roles ?? [];
      const isAdmin = roles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r));

      if (isAdmin) {
        toast.success('Welcome, Administrator', 'Entering administration console...');
        window.location.href = '/admin';
      } else {
        // Immediately revoke session so simple user session doesn't linger on admin portal
        await api('/auth/logout', { method: 'POST' }).catch(() => {});
        const msg = 'Access Denied: This account does not possess administrative privileges. Customers must use the storefront login.';
        setError(msg);
        toast.error('Administrative access denied', msg);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
      toast.error('Sign in failed', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#080d0a] text-[#f7f5f0] flex flex-col justify-center items-center px-4 py-12 selection:bg-accent selection:text-white">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block transition-opacity hover:opacity-90 mb-4" aria-label="Storefront">
            <Image
              src="/logo-white.png"
              alt="The Burujan"
              width={200}
              height={60}
              priority
              className="h-12 w-auto object-contain mx-auto brightness-110"
            />
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-1 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent">
              Administration Portal
            </span>
          </div>
          <p className="mt-1 text-xs text-white/50 tracking-wide">
            Restricted access. Authorized store personnel only.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f1713]/90 p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-start gap-3 leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label 
                htmlFor="admin-email" 
                className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2"
              >
                Administrator Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@theburujan.shop"
                className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-accent focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-accent transition"
              />
            </div>

            <div>
              <label 
                htmlFor="admin-password" 
                className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2"
              >
                Security Key / Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-accent focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-accent transition"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent/90 hover:shadow-accent/30 disabled:opacity-50 active:scale-[0.99]"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Enter Administration</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.08] text-center">
            <p className="text-xs text-white/40 mb-3">
              Looking for your customer account or orders?
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-accent hover:underline tracking-wide transition"
            >
              <span>Customer Sign In</span>
            </Link>
          </div>
        </div>

        {/* Back to storefront */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-white/40 hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to storefront</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
