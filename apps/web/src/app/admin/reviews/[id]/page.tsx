'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useState } from 'react';

type Review = {
  id: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  product: { name: string; sku: string };
  user: { firstName: string; lastName: string; email: string };
};

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

export default function AdminReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-review', id],
    queryFn: () => api<Review>(`/admin/reviews/${id}`)
  });

  const mutation = useMutation({
    mutationFn: (statusData: { status: string }) =>
      api(`/admin/reviews/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(statusData)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-review', id] });
      setNewStatus('');
      setErrorMsg('');
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    }
  });

  if (isLoading) return <div className="py-8">Loading review…</div>;
  if (error || !data) return <div className="py-8 text-red-700">{error?.message ?? 'Review not found'}</div>;

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="uppercase tracking-widest text-[#b4512d]">Review</p>
          <h1 className="mt-1 text-3xl font-black">{data.title}</h1>
          <p className="text-black/70">By {data.user.firstName} {data.user.lastName}</p>
        </div>
      </div>
      
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-bold mb-4">Details</h2>
          <dl className="grid gap-3">
            <div>
              <dt className="text-sm text-black/50">Product</dt>
              <dd>{data.product.name} ({data.product.sku})</dd>
            </div>
            <div>
              <dt className="text-sm text-black/50">Rating</dt>
              <dd>{data.rating} / 5</dd>
            </div>
            <div>
              <dt className="text-sm text-black/50">Status</dt>
              <dd>{data.status}</dd>
            </div>
            <div>
              <dt className="text-sm text-black/50">Body</dt>
              <dd className="mt-1 whitespace-pre-wrap">{data.body}</dd>
            </div>
          </dl>
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
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            {errorMsg && <p className="text-red-700 text-sm">{errorMsg}</p>}
            <button 
              className="button mt-2" 
              onClick={() => mutation.mutate({ status: newStatus || data.status })}
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
