'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function NewsletterForm() {
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(false);

  async function subscribe(form: FormData) {
    setLoading(true);
    try {
      await api('/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email') })
      });
      setState('Subscribed. Please check your inbox if verification is enabled.');
    } catch (e) {
      setState(e instanceof Error ? e.message : 'Subscription failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={subscribe} className="w-full">
      <div className="flex gap-2 w-full max-w-md relative">
        <Input 
          id="newsletter" 
          name="email" 
          className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40 focus-visible:ring-primary-foreground/30 h-11" 
          type="email" 
          required 
          placeholder="Email address"
        />
        <Button 
          className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 h-11 px-6" 
          type="submit"
          disabled={loading}
        >
          {loading ? '...' : 'Subscribe'}
        </Button>
      </div>
      {state && (
        <p className="mt-3 text-sm text-primary-foreground/80 font-medium" aria-live="polite">
          {state}
        </p>
      )}
    </form>
  );
}
