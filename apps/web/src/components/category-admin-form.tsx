'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export function CategoryAdminForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(form: FormData) {
    setBusy(true);
    setError('');
    const raw = Object.fromEntries(form) as Record<string, string>;
    
    try {
      const payload = {
        name: raw.name,
        slug: raw.slug,
        description: raw.description,
        parentId: raw.parentId,
        active: raw.active === 'true',
        sortOrder: parseInt(raw.sortOrder || '0', 10),
      };
      const normalized = payload.parentId ? payload : { ...payload, parentId: undefined };

      await api('/admin/categories', {
        method: 'POST',
        body: JSON.stringify(normalized),
      });
      router.push('/admin/categories');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Category could not be saved');
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
        Parent Category ID (optional)
        <input className="field mt-1" name="parentId" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Sort Order
          <input className="field mt-1" name="sortOrder" type="number" defaultValue="0" required />
        </label>
        <label>
          Active
          <select className="field mt-1" name="active" defaultValue="true">
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
      </div>
      {error && <p className="text-red-700" role="alert">{error}</p>}
      <button className="button" disabled={busy}>
        {busy ? 'Saving…' : 'Create category'}
      </button>
    </form>
  );
}
