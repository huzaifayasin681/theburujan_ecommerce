'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useState } from 'react';

type Inventory = {
  id: string;
  variantId: string;
  available: number;
  reserved: number;
  sold: number;
  variant: {
    sku: string;
    product: { name: string };
  };
  transactions: {
    id: string;
    reason: string;
    availableDelta: number;
    note: string | null;
    createdAt: string;
  }[];
};

export default function AdminInventoryDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [quantityDelta, setQuantityDelta] = useState<string>('0');
  const [note, setNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-inventory', id],
    queryFn: () => api<Inventory>(`/admin/inventory/${id}`)
  });

  const mutation = useMutation({
    mutationFn: (adjData: { quantityDelta: number; note: string }) =>
      api(`/admin/inventory/${data?.variantId}/adjust`, {
        method: 'POST',
        body: JSON.stringify(adjData)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory', id] });
      setQuantityDelta('0');
      setNote('');
      setErrorMsg('');
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    }
  });

  if (isLoading) return <div className="py-8">Loading inventory…</div>;
  if (error || !data) return <div className="py-8 text-red-700">{error?.message ?? 'Inventory not found'}</div>;

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="uppercase tracking-widest text-[#b4512d]">Inventory</p>
          <h1 className="mt-1 text-3xl font-black">{data.variant.product.name}</h1>
          <p className="text-black/70">SKU: {data.variant.sku}</p>
        </div>
      </div>
      
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-bold mb-4">Stock Levels</h2>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-black/50">Available</dt>
              <dd className="text-xl font-bold">{data.available}</dd>
            </div>
            <div>
              <dt className="text-sm text-black/50">Reserved</dt>
              <dd className="text-xl font-bold text-[#b4512d]">{data.reserved}</dd>
            </div>
            <div>
              <dt className="text-sm text-black/50">Sold</dt>
              <dd className="text-xl font-bold">{data.sold}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="font-bold mb-4">Manual Adjustment</h2>
          <div className="grid gap-3">
            <label>
              Quantity Delta (+ to add, - to subtract)
              <input 
                className="field mt-1" 
                type="number"
                value={quantityDelta} 
                onChange={(e) => setQuantityDelta(e.target.value)}
              />
            </label>
            <label>
              Admin Note
              <input 
                className="field mt-1" 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                placeholder="Reason for adjustment..."
              />
            </label>
            {errorMsg && <p className="text-red-700 text-sm">{errorMsg}</p>}
            <button 
              className="button mt-2" 
              onClick={() => mutation.mutate({ quantityDelta: parseInt(quantityDelta, 10), note })}
              disabled={mutation.isPending || !note || !quantityDelta}
            >
              {mutation.isPending ? 'Adjusting...' : 'Adjust stock'}
            </button>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h2 className="font-bold mb-4">Recent Transactions</h2>
          {data.transactions.length === 0 ? (
            <p className="text-black/50">No transactions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#eeeae0]">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Change</th>
                    <th className="p-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((tx) => (
                    <tr className="border-t" key={tx.id}>
                      <td className="p-3">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className="p-3">{tx.reason}</td>
                      <td className="p-3">
                        <span className={tx.availableDelta > 0 ? 'text-green-700' : tx.availableDelta < 0 ? 'text-red-700' : ''}>
                          {tx.availableDelta > 0 ? `+${tx.availableDelta}` : tx.availableDelta}
                        </span>
                      </td>
                      <td className="p-3">{tx.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
