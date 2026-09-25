'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo');

  async function handleGoogleSignIn() {
    setGoogleBusy(true);
    setError('');
    try {
      const config = await api<{ clientId: string | null; enabled: boolean }>('/auth/google/config').catch(() => ({
        clientId: null,
        enabled: false,
      }));

      if (!config.enabled) {
        toast.info(
          'Google Sign-In Configuration',
          'Google authentication is configured in the code. To connect live Google accounts, please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server environment.'
        );
        setGoogleBusy(false);
        return;
      }

      const target = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/account';
      window.location.href = `/api/v1/auth/google?returnTo=${encodeURIComponent(target)}`;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in could not be initiated';
      setError(msg);
      toast.error('Google Sign-In', msg);
      setGoogleBusy(false);
    }
  }

  async function submit(formData: FormData) {
    setBusy(true);
    setError('');
    const body = Object.fromEntries(formData);

    try {
      const res = await api<{ expiresIn?: number; roles?: string[] }>(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (mode === 'register') {
        toast.success('Registration successful!', 'Please check your email to verify your account.');
        router.push(`/verify-email?email=${encodeURIComponent(String(body.email))}`);
        return;
      }

      const roles = res?.roles ?? [];
      const isAdmin = roles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r));

      if (isAdmin) {
        toast.success('Welcome back, Administrator!', 'Redirecting to your Admin Dashboard...');
        window.location.href = '/admin';
      } else {
        toast.success('Welcome back!', 'Signed in successfully.');
        const target = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/account';
        window.location.href = target;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Authentication failed';
      setError(msg);
      toast.error('Authentication failed', msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Continue with Google button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleBusy || busy}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 shadow-xs hover:bg-stone-50 hover:border-stone-300 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
      >
        {googleBusy ? (
          <Loader2 className="h-4 w-4 animate-spin text-stone-600" />
        ) : (
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
      </button>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="bg-surface px-3 text-muted-foreground font-medium">Or continue with email</span>
        </div>
      </div>

      <form action={submit} className="flex flex-col gap-4 w-full">
        {mode === 'register' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="firstName" className="text-xs font-semibold text-stone-700">First name</label>
              <Input id="firstName" name="firstName" required placeholder="Jane" className="h-11 rounded-xl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lastName" className="text-xs font-semibold text-stone-700">Last name</label>
              <Input id="lastName" name="lastName" required placeholder="Doe" className="h-11 rounded-xl" />
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-stone-700">Email address</label>
          <Input id="email" type="email" name="email" required placeholder="name@example.com" autoComplete="email" className="h-11 rounded-xl" />
        </div>
        
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label htmlFor="password" className="text-xs font-semibold text-stone-700">Password</label>
            {mode === 'login' && (
              <Link href="/forgot-password" className="text-xs font-medium text-muted-foreground hover:text-stone-900 transition-colors">
                Forgot password?
              </Link>
            )}
          </div>
          <Input 
            id="password" 
            type="password" 
            name="password" 
            minLength={12} 
            required 
            placeholder="••••••••••••" 
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} 
            className="h-11 rounded-xl"
          />
          {mode === 'register' && (
            <p className="text-[11px] text-muted-foreground mt-0.5">Password must be at least 12 characters.</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl flex items-start gap-2.5 text-xs animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
            <p className="leading-snug">{error}</p>
          </div>
        )}
        
        <Button size="lg" className="w-full h-12 text-xs font-semibold uppercase tracking-wider bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs mt-2" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Please wait...
            </>
          ) : mode === 'login' ? (
            'Sign in'
          ) : (
            'Create account'
          )}
        </Button>
      </form>
    </div>
  );
}
