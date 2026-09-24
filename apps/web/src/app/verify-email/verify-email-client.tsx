'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  ArrowRight,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { api } from '@/lib/api';

type Status = 'verifying' | 'success' | 'error' | 'manual';

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  
  // Default to verifying so we don't flash the manual token form while reading params
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Resend state
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');

  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (hasTriggeredRef.current) return;

    // Resolve token from searchParams, window.location.search, or window.location.hash
    let activeToken = searchParams.get('token') || searchParams.get('code');

    if (!activeToken && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      activeToken = urlParams.get('token') || urlParams.get('code');

      if (!activeToken && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        activeToken = hashParams.get('token') || hashParams.get('code');
      }
    }

    if (!activeToken || !activeToken.trim()) {
      setStatus('manual');
      return;
    }

    hasTriggeredRef.current = true;
    const cleanToken = activeToken.trim();

    setStatus('verifying');
    setErrorMessage('');

    api('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token: cleanToken }),
    })
      .then(() => {
        setStatus('success');
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'The verification link is invalid or has expired.'
        );
      });
  }, [searchParams]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    setIsSubmittingManual(true);
    setErrorMessage('');

    try {
      await api('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: manualToken.trim() }),
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'The token provided is invalid or has expired.'
      );
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setIsResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      await api('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
      setResendSuccess(true);
      setResendEmail('');
    } catch (err) {
      setResendError(
        err instanceof Error ? err.message : 'Unable to send verification link.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-16 sm:px-6 lg:px-8 bg-secondary/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* State: Automatically Verifying */}
        {status === 'verifying' && (
          <div className="bg-surface py-10 px-6 sm:px-10 rounded-2xl border border-border shadow-sm text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/5 text-primary">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>

            <span className="mt-5 inline-block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Security Authentication
            </span>

            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Verifying Your Email
            </h1>

            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Please wait a moment while we validate your credentials with The Burujan...
            </p>

            <div className="mt-6 mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-full bg-foreground rounded-full animate-pulse" />
            </div>
          </div>
        )}

        {/* State: Successfully Verified */}
        {status === 'success' && (
          <div className="bg-surface py-10 px-6 sm:px-10 rounded-2xl border border-border shadow-sm text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <span className="mt-5 inline-block text-[11px] font-bold uppercase tracking-widest text-emerald-700">
              Account Activated
            </span>

            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Email Verified Successfully
            </h1>

            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Welcome to The Burujan. Your email has been confirmed. You now have full access to order tracking, saved preferences, and private releases.
            </p>

            <div className="mt-8 space-y-3">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 shadow-sm"
              >
                Sign In to Your Account
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/shop"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-xs font-bold uppercase tracking-widest text-foreground transition hover:bg-secondary/50"
              >
                Explore Collections
              </Link>
            </div>
          </div>
        )}

        {/* State: Verification Error */}
        {status === 'error' && (
          <div className="bg-surface py-10 px-6 sm:px-10 rounded-2xl border border-border shadow-sm text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-8 ring-rose-50/50">
              <AlertCircle className="h-8 w-8" />
            </div>

            <span className="mt-5 inline-block text-[11px] font-bold uppercase tracking-widest text-rose-700">
              Link Expired or Invalid
            </span>

            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Verification Notice
            </h1>

            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {errorMessage || 'This verification link is invalid or has expired.'}
            </p>

            <div className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border/60 text-left text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Have you already verified?</p>
              <p>
                If you already verified this account, you can proceed directly to sign in.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 shadow-sm"
              >
                Continue to Sign In
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Resend Section */}
            <div className="mt-8 pt-6 border-t border-border text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Need a new verification link?
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter your email address and we will dispatch a fresh verification link.
              </p>

              <form onSubmit={handleResend} className="mt-3 space-y-2">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full rounded-xl border border-input bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={isResending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-secondary/60 disabled:opacity-50 transition"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Send New Link
                    </>
                  )}
                </button>
              </form>

              {resendSuccess && (
                <p className="mt-2 text-xs font-medium text-emerald-600">
                  A new verification link has been sent if that account exists.
                </p>
              )}
              {resendError && (
                <p className="mt-2 text-xs font-medium text-rose-600">
                  {resendError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* State: Manual Token (When no token query param was passed) */}
        {status === 'manual' && (
          <div className="bg-surface py-10 px-6 sm:px-10 rounded-2xl border border-border shadow-sm text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/5 text-primary">
              <Mail className="h-8 w-8" />
            </div>

            <span className="mt-5 inline-block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Account Security
            </span>

            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Verify Your Email
            </h1>

            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              We sent a verification link to your email address. Clicking the link in your email will verify your account automatically.
            </p>

            <form onSubmit={handleManualSubmit} className="mt-6 space-y-3 text-left">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Security Token
                </label>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste secure token here"
                  required
                  className="w-full rounded-xl border border-input bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring font-mono text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingManual}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-primary-foreground transition hover:opacity-90 disabled:opacity-50 shadow-sm"
              >
                {isSubmittingManual ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Verify Token
                  </>
                )}
              </button>
            </form>

            {/* Resend Section */}
            <div className="mt-8 pt-6 border-t border-border text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Didn't receive the email?
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter your email address below to request another verification message.
              </p>

              <form onSubmit={handleResend} className="mt-3 space-y-2">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full rounded-xl border border-input bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={isResending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground hover:bg-secondary/60 disabled:opacity-50 transition"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Resend Verification Email
                    </>
                  )}
                </button>
              </form>

              {resendSuccess && (
                <p className="mt-2 text-xs font-medium text-emerald-600">
                  A fresh verification link has been sent to your inbox.
                </p>
              )}
              {resendError && (
                <p className="mt-2 text-xs font-medium text-rose-600">
                  {resendError}
                </p>
              )}
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition underline"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
