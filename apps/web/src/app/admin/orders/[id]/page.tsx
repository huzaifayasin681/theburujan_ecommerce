'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useState } from 'react';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  grandTotal: string;
  shippingAddress: Record<string, unknown>;
  items: {
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
  }[];
  statusHistory: {
    id: string;
    toStatus: string;
    createdAt: string;
    notes: string | null;
  }[];
  payments: { id: string; provider: string; status: string; amount: string; transactionId: string | null }[];
  shipments: { id: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null }[];
};

const STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'REFUNDED',
  'PARTIALLY_REFUNDED'
];

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('Customer refund');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => api<Order>(`/orders/${id}`)
  });

  const mutation = useMutation({
    mutationFn: (statusData: { status: string; notes?: string }) =>
      api(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(statusData)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      setNewStatus('');
      setNotes('');
      setErrorMsg('');
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    }
  });
  const refund = useMutation({
    mutationFn: async () => {
      const payment = data?.payments.find((item) => item.status === 'PAID');
      if (!payment) throw new Error('A paid payment is required before issuing a refund');
      const amount = Number(refundAmount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a valid refund amount');
      return api(`/payments/${payment.id}/refunds`, { method: 'POST', headers: { 'idempotency-key': globalThis.crypto.randomUUID() }, body: JSON.stringify({ amountMinor: Math.round(amount * 100), reason: refundReason }) });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-order', id] }); setRefundAmount(''); setErrorMsg(''); },
    onError: (err: Error) => setErrorMsg(err.message),
  });

  if (isLoading) return <div className="py-8">Loading order…</div>;
  if (error || !data) return <div className="py-8 text-red-700">{error?.message ?? 'Order not found'}</div>;

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="uppercase tracking-widest text-[#b4512d]">{data.status.replaceAll('_', ' ')}</p>
          <h1 className="mt-1 text-3xl font-black">Order {data.orderNumber}</h1>
        </div>
      </div>
      
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-bold mb-4">Items</h2>
          {data.items.map((item) => (
            <div className="flex justify-between border-b py-3 last:border-0" key={item.id}>
              <div>
                <strong>{item.productName}</strong>
                <p className="text-sm text-black/55">
                  {item.sku} × {item.quantity}
                </p>
              </div>
              <span>{item.lineTotal}</span>
            </div>
          ))}
          <div className="mt-4 flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>
              {new Intl.NumberFormat('en', { style: 'currency', currency: data.currency }).format(
                Number(data.grandTotal)
              )}
            </span>
          </div>
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
              Admin Notes (optional)
              <input 
                className="field mt-1" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Reason for change..."
              />
            </label>
            {errorMsg && <p className="text-red-700 text-sm">{errorMsg}</p>}
            <button 
              className="button mt-2" 
              onClick={() => mutation.mutate({ status: newStatus || data.status, notes })}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Updating...' : 'Update status'}
            </button>
          </div>

          <h2 className="font-bold mt-8 mb-4">History</h2>
          <div className="space-y-4">
            {data.statusHistory.map((row) => (
              <div className="border-l-2 border-[#b4512d] pl-4" key={row.id}>
                <strong>{row.toStatus.replaceAll('_', ' ')}</strong>
                <p className="text-sm text-black/55">{new Date(row.createdAt).toLocaleString()}</p>
                {row.notes && <p className="text-sm mt-1">{row.notes}</p>}
              </div>
            ))}
          </div>
          {data.payments.some((payment) => payment.status === 'PAID') && !['REFUNDED', 'CANCELLED'].includes(data.status) && <div className="mt-8 border-t pt-6"><h2 className="font-bold">Issue refund</h2><div className="mt-3 grid gap-3"><label>Amount ({data.currency})<input className="field mt-1" type="number" min="0.01" step="0.01" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} /></label><label>Reason<input className="field mt-1" value={refundReason} onChange={(event) => setRefundReason(event.target.value)} /></label><button className="button bg-red-700" onClick={() => refund.mutate()} disabled={refund.isPending}>{refund.isPending ? 'Processing…' : 'Issue refund'}</button></div></div>}
        </div>
      </div>
    </>
  );
}
