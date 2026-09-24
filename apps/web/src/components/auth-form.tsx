'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

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
        window.location.href = '/account';
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
    <form action={submit} className="flex flex-col gap-5 w-full">
      {mode === 'register' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="firstName" className="text-sm font-medium">First name</label>
            <Input id="firstName" name="firstName" required placeholder="Jane" className="h-12" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="lastName" className="text-sm font-medium">Last name</label>
            <Input id="lastName" name="lastName" required placeholder="Doe" className="h-12" />
          </div>
        </div>
      )}
      
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium">Email address</label>
        <Input id="email" type="email" name="email" required placeholder="name@example.com" autoComplete="email" className="h-12" />
      </div>
      
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          {mode === 'login' && (
            <Link href="/forgot-password" className="text-sm font-medium text-muted-foreground hover:text-foreground">
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
          className="h-12"
        />
        {mode === 'register' && (
          <p className="text-xs text-muted-foreground mt-1">Must be at least 12 characters.</p>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
      
      <Button size="lg" className="w-full h-14 text-base font-bold mt-2" disabled={busy}>
        {busy ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Please wait...
          </>
        ) : mode === 'login' ? (
          'Sign in'
        ) : (
          'Create account'
        )}
      </Button>
    </form>
  );
}
