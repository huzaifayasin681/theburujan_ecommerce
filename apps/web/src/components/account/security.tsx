'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { Loader2 } from 'lucide-react';

type Session = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
};

export function AccountSecurity() {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');
  const [message, setMessage] = useState('');
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  
  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['account', 'sessions'],
    queryFn: () => api<Session[]>('/account/sessions'),
  });

  const passwordMutation = useMutation({
    mutationFn: (form: FormData) => api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(form))
    }),
    onSuccess: () => {
      setErrorMsg('');
      toast.success('Password changed successfully!', 'You may need to log in again on other devices.');
      const formElement = document.getElementById('password-form') as HTMLFormElement;
      if (formElement) formElement.reset();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      toast.error('Password change failed', err.message);
    }
  });

  const revokeSession = useMutation({
    mutationFn: (id: string) => api(`/account/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'sessions'] });
      toast.success('Session revoked');
    },
    onError: (err: Error) => {
      toast.error('Revoke failed', err.message);
    }
  });
  const emailMutation = useMutation({
    mutationFn: (form: FormData) => api<{ message: string }>('/auth/update-email', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) }),
    onSuccess: (result) => {
      setMessage(result.message);
      setErrorMsg('');
      toast.success('Verification link sent', result.message);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      toast.error('Email update failed', err.message);
    }
  });
  const setupTwoFactor = useMutation({
    mutationFn: () => api<{ secret: string; otpauthUrl: string }>('/auth/2fa/setup', { method: 'POST' }),
    onSuccess: setTwoFactorSetup,
    onError: (err: Error) => {
      setErrorMsg(err.message);
      toast.error('2FA setup failed', err.message);
    }
  });
  const confirmTwoFactor = useMutation({
    mutationFn: (form: FormData) => api<{ recoveryCodes: string[] }>('/auth/2fa/confirm', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) }),
    onSuccess: (result) => {
      setRecoveryCodes(result.recoveryCodes);
      setTwoFactorSetup(null);
      setMessage('Two-factor authentication is enabled. Save the recovery codes now.');
      toast.success('Two-factor authentication enabled');
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      toast.error('2FA verification failed', err.message);
    }
  });
  const disableTwoFactor = useMutation({
    mutationFn: (form: FormData) => api('/auth/2fa/disable', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) }),
    onSuccess: () => {
      setMessage('Two-factor authentication is disabled.');
      setRecoveryCodes([]);
      toast.info('Two-factor authentication disabled');
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      toast.error('Failed to disable 2FA', err.message);
    }
  });

  if (isLoading) return <p>Loading security details…</p>;
  if (error) return <p className="text-red-700">{error.message}</p>;

  return (
    <div className="grid gap-12 mt-8 max-w-4xl">
      {message && <p className="rounded-md bg-green-50 p-4 text-green-800" aria-live="polite">{message}</p>}
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Change Password</h2>
        <form id="password-form" action={(f) => passwordMutation.mutate(f)} className="grid gap-4 max-w-md">
          <label>Current Password <input type="password" name="currentPassword" required className="field mt-1" minLength={8} /></label>
          <label>New Password <input type="password" name="newPassword" required className="field mt-1" minLength={8} /></label>
          {errorMsg && <p className="text-red-700 text-sm">{errorMsg}</p>}
          <button className="button w-fit mt-2" disabled={passwordMutation.isPending}>{passwordMutation.isPending ? 'Updating...' : 'Update password'}</button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Change email</h2>
        <form action={(form) => emailMutation.mutate(form)} className="grid max-w-md gap-4">
          <label>New email<input className="field mt-1" type="email" name="email" required /></label>
          <label>Current password<input className="field mt-1" type="password" name="password" required /></label>
          <button className="button w-fit flex items-center gap-2" disabled={emailMutation.isPending}>
            {emailMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {emailMutation.isPending ? 'Sending...' : 'Send verification link'}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-bold mb-2">Authenticator app</h2>
        <p className="mb-4 text-sm text-muted-foreground">Use a time-based authenticator and keep the one-time recovery codes offline.</p>
        {!twoFactorSetup && (
          <button className="button flex items-center gap-2" onClick={() => setupTwoFactor.mutate()} disabled={setupTwoFactor.isPending}>
            {setupTwoFactor.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {setupTwoFactor.isPending ? 'Setting up...' : 'Set up authenticator'}
          </button>
        )}
        {twoFactorSetup && <div className="grid gap-4"><p className="break-all rounded bg-secondary p-3 font-mono text-sm">Secret: {twoFactorSetup.secret}</p><a className="break-all text-sm underline" href={twoFactorSetup.otpauthUrl}>Open in authenticator</a><form action={(form) => confirmTwoFactor.mutate(form)} className="flex gap-3"><input className="field max-w-48" name="code" inputMode="numeric" minLength={6} maxLength={6} required placeholder="6-digit code"/><button className="button">Confirm</button></form></div>}
        {recoveryCodes.length > 0 && <div className="mt-5"><h3 className="font-semibold">Recovery codes</h3><ul className="mt-2 grid grid-cols-2 gap-2 rounded bg-secondary p-4 font-mono">{recoveryCodes.map((code) => <li key={code}>{code}</li>)}</ul></div>}
        <details className="mt-6"><summary className="cursor-pointer text-sm text-red-700">Disable two-factor authentication</summary><form action={(form) => disableTwoFactor.mutate(form)} className="mt-4 grid max-w-md gap-3"><input className="field" name="password" type="password" required placeholder="Current password"/><input className="field" name="code" required minLength={6} maxLength={6} placeholder="Authenticator code"/><button className="button bg-red-700">Disable</button></form></details>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Active Sessions</h2>
        <div className="space-y-4">
          {sessions?.map(session => (
            <div key={session.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{session.userAgent || 'Unknown Device'}</p>
                <p className="text-sm text-black/60">IP: {session.ipAddress || 'Unknown'} · Last active: {new Date(session.lastUsedAt).toLocaleString()}</p>
              </div>
              <button 
                className="text-sm text-red-700 font-medium underline"
                onClick={() => { if(confirm('Revoke this session?')) revokeSession.mutate(session.id) }}
                disabled={revokeSession.isPending}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
