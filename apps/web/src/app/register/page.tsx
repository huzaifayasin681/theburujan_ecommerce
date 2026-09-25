import Link from 'next/link';
import Image from 'next/image';
import { AuthForm } from '@/components/auth-form';

export const metadata = { title: 'Create Account' };

export default function Register() {
  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-secondary/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block mx-auto mb-4 hover:opacity-90 transition" aria-label="The Burujan Home">
          <Image src="/logo.png" alt="The Burujan" width={170} height={52} priority className="h-10 w-auto object-contain mx-auto" />
        </Link>
        <h1 className="text-center text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          Create an account
        </h1>
        <p className="mt-3 text-center text-muted-foreground">
          Join us to track orders, save items to your wishlist, and checkout faster.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 shadow-sm border border-border sm:rounded-2xl sm:px-10">
          <AuthForm mode="register" />
          
          <div className="mt-8 text-center text-sm">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-foreground hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
