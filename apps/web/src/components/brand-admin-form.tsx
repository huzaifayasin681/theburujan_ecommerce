'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export function BrandAdminForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(form: FormData) {
    setBusy(true);
    setError('');
    const raw = Object.fromEntries(form) as Record<string, string>;
    
    try {
      const payload = {
        ...raw,
        active: raw.active === 'true',
      };

      await api('/admin/brands', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push('/admin/brands');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Brand could not be saved');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={submit} className="card mt-8 grid gap-4 p-6">
      <label>
        Name
        <input className="field mt-1" name="name" required minLength={2} />
      </label>
      <label>
        Slug
        <input className="field mt-1" name="slug" required pattern="[a-z0-9-]+" />
      </label>
      <label>
        Description
        <textarea className="field mt-1" name="description" />
      </label>
      <label>
        Website
        <input className="field mt-1" name="website" type="url" />
      </label>
      <label>
        Active
        <select className="field mt-1" name="active" defaultValue="true">
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
      {error && <p className="text-red-700" role="alert">{error}</p>}
      <button className="button" disabled={busy}>
        {busy ? 'Saving…' : 'Create brand'}
      </button>
    </form>
  );
}
