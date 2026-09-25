import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';
import { Loader2 } from 'lucide-react';

export const metadata = { title: 'Sign In' };

export default function Login() {
  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-stone-50/50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block mx-auto mb-4 hover:opacity-90 transition" aria-label="The Burujan Home">
          <Image src="/logo.png" alt="The Burujan" width={170} height={52} priority className="h-10 w-auto object-contain mx-auto" />
        </Link>
        <h1 className="text-center font-serif text-3xl md:text-4xl font-medium tracking-tight text-stone-900">
          Welcome back
        </h1>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Sign in to manage your orders, saved pieces, and checkout faster.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 shadow-xs border border-stone-200/80 rounded-3xl sm:px-9">
          <Suspense fallback={<div className="h-48 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-stone-500" /></div>}>
            <AuthForm mode="login" />
          </Suspense>
          
          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-muted-foreground">
                New to The Burujan?
              </span>
            </div>
          </div>
          
          <div className="mt-5 text-center">
            <Link href="/register" className="text-xs font-semibold text-stone-900 hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
