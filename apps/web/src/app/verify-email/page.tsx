import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { VerifyEmailClient } from './verify-email-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Verify Your Email | The Burujan',
  description: 'Confirm your email address to activate your account on The Burujan.',
};

function LoadingFallback() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-16 px-4 bg-secondary/30">
      <div className="w-full max-w-md bg-surface p-8 sm:p-10 rounded-2xl border border-border shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <h2 className="mt-5 text-xl font-bold tracking-tight text-foreground">
          Loading Verification...
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Preparing secure validation...
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailClient />
    </Suspense>
  );
}
