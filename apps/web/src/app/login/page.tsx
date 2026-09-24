import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';

export const metadata = { title: 'Sign In' };

export default function Login() {
  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-secondary/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-3 text-center text-muted-foreground">
          Sign in to your account to manage orders and checkout faster.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 shadow-sm border border-border sm:rounded-2xl sm:px-10">
          <AuthForm mode="login" />
          
          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-surface text-muted-foreground">
                New to Burujan?
              </span>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <Link href="/register" className="font-semibold text-foreground hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
