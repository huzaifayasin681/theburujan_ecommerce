'use client';

import { useQuery } from '@tanstack/react-query';
import { api, uploadCustomerMedia } from '@/lib/api';
import { useState } from 'react';

type Return = {
  id: string;
  orderId: string;
  status: string;
  reason: string;
  explanation: string;
  createdAt: string;
  items: {
    quantity: number;
    orderItem: {
      productName: string;
      sku: string;
    }
  }[]
};

export function AccountReturns() {
  const { data: returns, isLoading, error } = useQuery({
    queryKey: ['account', 'returns'],
    queryFn: () => api<Return[]>('/returns'),
  });

  if (isLoading) return <p>Loading returns…</p>;
  if (error) return <p className="text-red-700">{error.message}</p>;

  return (
    <div className="mt-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Returns</h2>
        <p className="text-sm text-muted-foreground">Start a return from an eligible delivered order.</p>
      </div>

      <div className="grid gap-6">
        {returns?.length === 0 ? (
          <div className="card p-8 text-center">You have no returns.</div>
        ) : (
          returns?.map(ret => (
            <div key={ret.id} className="card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">Return for Order (ID: {ret.orderId.split('-')[0]})</h3>
                  <p className="text-sm text-black/60">{new Date(ret.createdAt).toLocaleString()} · Reason: {ret.reason}</p>
                </div>
                <span className="bg-secondary px-3 py-1 text-sm rounded font-bold uppercase">{ret.status.replaceAll('_', ' ')}</span>
              </div>
              <p className="text-sm border-l-2 pl-3 py-1 mb-4 italic">{ret.explanation}</p>
              
              <h4 className="font-bold text-sm mb-2">Items</h4>
              <div className="space-y-2">
                {ret.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-2 border-b last:border-0 border-gray-100">
                    <div>
                      <p className="font-medium">{item.orderItem.productName}</p>
                      <p className="text-black/50">{item.orderItem.sku}</p>
                    </div>
                    <span>Qty: {item.quantity}</span>
                  </div>
                ))}
              </div>
              {ret.status === 'MORE_INFO_REQUIRED' && <MoreInformation returnId={ret.id} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MoreInformation({ returnId }: { returnId: string }) { const [state, setState] = useState(''); const [busy, setBusy] = useState(false); async function submit(form: FormData) { setBusy(true); setState(''); try { const files = form.getAll('images').filter((entry): entry is File => entry instanceof File && entry.size > 0).slice(0, 8); const mediaIds = await Promise.all(files.map(async (file) => (await uploadCustomerMedia(file)).id)); await api(`/returns/${returnId}/information`, { method: 'PATCH', body: JSON.stringify({ explanation: form.get('explanation'), mediaIds }) }); setState('Additional information submitted.'); } catch (error) { setState(error instanceof Error ? error.message : 'Submission failed'); } finally { setBusy(false); } } return <form action={submit} className="mt-5 grid gap-3 rounded border p-4"><h4 className="font-semibold">More information requested</h4><textarea className="field min-h-28" name="explanation" minLength={10} required/><input className="field" type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple/><button className="button" disabled={busy}>{busy ? 'Submitting…' : 'Send information'}</button>{state && <p aria-live="polite">{state}</p>}</form>; }
