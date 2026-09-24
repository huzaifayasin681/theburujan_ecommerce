'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useState } from 'react';

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
  lifetimeSpend: number;
  orders: { id: string; orderNumber: string; status: string; createdAt: string; grandTotal: string }[];
  addresses: { id: string }[];
  reviews: { id: string }[];
  returns: { id: string }[];
};

const STATUSES = ['ACTIVE', 'SUSPENDED', 'BLOCKED'];

export default function AdminCustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => api<Customer>(`/admin/customers/${id}`)
  });

  const mutation = useMutation({
    mutationFn: (statusData: { status: string }) =>
      api(`/admin/customers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(statusData)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customer', id] });
      setNewStatus('');
      setErrorMsg('');
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    }
  });

  if (isLoading) return <div className="py-8">Loading customer…</div>;
  if (error || !data) return <div className="py-8 text-red-700">{error?.message ?? 'Customer not found'}</div>;

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="uppercase tracking-widest text-[#b4512d]">Customer</p>
          <h1 className="mt-1 text-3xl font-black">{data.firstName} {data.lastName}</h1>
          <p className="text-black/70">{data.email} {data.phone ? `• ${data.phone}` : ''}</p>
        </div>
      </div>
      
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-bold mb-4">Overview</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-black/50">Status</dt>
              <dd>{data.status}</dd>
            </div>
            <div>
              <dt className="text-sm text-black/50">Registered</dt>
              <dd>{new Date(data.createdAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm text-black/50">Total Orders</dt>
              <dd>{data.orders.length}</dd>
            </div>
            <div>
              <dt className="text-sm text-black/50">Lifetime Spend</dt>
              <dd>
                {new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).format(Number(data.lifetimeSpend))}
              </dd>
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

        <div className="card p-6 lg:col-span-2">
          <h2 className="font-bold mb-4">Recent Orders</h2>
          {data.orders.length === 0 ? (
            <p className="text-black/50">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#eeeae0]">
                  <tr>
                    <th className="p-3">Order Number</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.slice(0, 5).map((order) => (
                    <tr className="border-t" key={order.id}>
                      <td className="p-3">
                        <a href={`/admin/orders/${order.id}`} className="underline">
                          {order.orderNumber}
                        </a>
                      </td>
                      <td className="p-3">{order.status}</td>
                      <td className="p-3">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="p-3">${order.grandTotal}</td>
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
