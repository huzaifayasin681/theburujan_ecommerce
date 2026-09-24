import Link from 'next/link';
import { TokenForm } from '@/components/token-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reset Your Password | The Burujan',
  description: 'Request a password reset link for your Burujan account.',
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-16 sm:px-6 lg:px-8 bg-secondary/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <h1 className="text-center text-3xl font-extrabold tracking-tight text-foreground">
          Reset your password
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your email address and we will send you instructions to reset your password.
        </p>

        <div className="mt-8">
          <TokenForm kind="forgot" />
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition underline"
          >
            Remember your password? Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
