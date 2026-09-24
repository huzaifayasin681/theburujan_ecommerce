'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useState } from 'react';

type ReturnReq = {
  id: string;
  status: string;
  createdAt: string;
  order: { orderNumber: string };
  user: { firstName: string; lastName: string; email: string };
  items: { id: string; quantity: number; reason: string; orderItem: { productName: string; sku: string } }[];
  explanation: string | null;
  adminNote: string | null;
  media: { media: { url: string; altText: string | null } }[];
};

const STATUSES = ['REQUESTED', 'MORE_INFO_REQUIRED', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'RECEIVED', 'REFUND_PENDING', 'COMPLETED'];

export default function AdminReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-return', id],
    queryFn: () => api<ReturnReq>(`/admin/returns/${id}`)
  });

  const mutation = useMutation({
    mutationFn: (statusData: { status: string; note?: string }) =>
      api(`/admin/returns/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(statusData)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-return', id] });
      setNewStatus('');
      setNote('');
      setErrorMsg('');
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    }
  });

  if (isLoading) return <div className="py-8">Loading return…</div>;
  if (error || !data) return <div className="py-8 text-red-700">{error?.message ?? 'Return not found'}</div>;

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="uppercase tracking-widest text-[#b4512d]">Return Request</p>
          <h1 className="mt-1 text-3xl font-black">Order {data.order.orderNumber}</h1>
          <p className="text-black/70">By {data.user.firstName} {data.user.lastName}</p>
        </div>
      </div>
      
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-bold mb-4">Returned Items</h2>
          {data.items.map((item) => (
            <div className="flex justify-between border-b py-3 last:border-0" key={item.id}>
              <div>
                <strong>{item.orderItem.productName}</strong>
                <p className="text-sm text-black/55">
                  {item.orderItem.sku} × {item.quantity}
                </p>
                <p className="text-sm text-[#b4512d] mt-1">Reason: {item.reason}</p>
              </div>
            </div>
          ))}
          {data.explanation && <div className="mt-5 border-t pt-4"><h3 className="font-semibold">Customer explanation</h3><p className="mt-2 whitespace-pre-wrap text-sm text-black/70">{data.explanation}</p></div>}
          {data.media.length > 0 && <div className="mt-5 grid grid-cols-2 gap-3">{data.media.map((entry, index) => <img className="aspect-square w-full rounded object-cover" src={entry.media.url} alt={entry.media.altText ?? `Return evidence ${index + 1}`} key={`${entry.media.url}-${index}`} />)}</div>}
        </div>

        <div className="card p-6">
          <h2 className="font-bold mb-4">Manage Status</h2>
          <div className="grid gap-3">
            <label>
              New Status
              <select 
                className="field mt-1" 
                value={newStatus || data.status} 
                onChange={(e) => setNewStatus(e.target.value)}
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
                ))}
              </select>
            </label>
            <label>
              Admin Note
              <input 
                className="field mt-1" 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                placeholder="Notes..."
              />
            </label>
            {errorMsg && <p className="text-red-700 text-sm">{errorMsg}</p>}
            <button 
              className="button mt-2" 
              onClick={() => mutation.mutate({ status: newStatus || data.status, note })}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Updating...' : 'Update status'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
