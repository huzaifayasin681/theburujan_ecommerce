'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Address = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  instructions: string | null;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
};

export function AccountAddresses() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Address | Partial<Address> | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: addresses, isLoading, error } = useQuery({
    queryKey: ['account', 'addresses'],
    queryFn: () => api<Address[]>('/account/addresses'),
  });

  const saveMutation = useMutation({
    mutationFn: (form: FormData) => {
      const data = Object.fromEntries(form);
      const payload = {
        ...data,
        isDefaultShipping: data.isDefaultShipping === 'on',
        isDefaultBilling: data.isDefaultBilling === 'on'
      };
      
      if (editing && 'id' in editing && editing.id) {
        return api(`/account/addresses/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      }
      return api('/account/addresses', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'addresses'] });
      setEditing(null);
      setErrorMsg('');
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/account/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account', 'addresses'] })
  });

  if (isLoading) return <p>Loading addresses…</p>;
  if (error) return <p className="text-red-700">{error.message}</p>;

  return (
    <div className="mt-8">
      {editing ? (
        <div className="card p-6 max-w-2xl">
          <h2 className="text-xl font-bold mb-4">{editing.id ? 'Edit Address' : 'New Address'}</h2>
          <form action={(f) => saveMutation.mutate(f)} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label>Name <input className="field mt-1" name="name" defaultValue={editing.name} required minLength={1} maxLength={120} /></label>
              <label>Phone <input className="field mt-1" name="phone" defaultValue={editing.phone} required minLength={5} maxLength={32} /></label>
            </div>
            <label>Address Line 1 <input className="field mt-1" name="line1" defaultValue={editing.line1} required maxLength={255} /></label>
            <label>Address Line 2 (Optional) <input className="field mt-1" name="line2" defaultValue={editing.line2 || ''} maxLength={255} /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>City <input className="field mt-1" name="city" defaultValue={editing.city} required maxLength={100} /></label>
              <label>State/Province <input className="field mt-1" name="state" defaultValue={editing.state} required maxLength={100} /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>Postal Code <input className="field mt-1" name="postalCode" defaultValue={editing.postalCode} required maxLength={24} /></label>
              <label>Country (2-letter code) <input className="field mt-1" name="country" defaultValue={editing.country} required minLength={2} maxLength={2} pattern="[A-Za-z]{2}" /></label>
            </div>
            <label>Delivery Instructions (Optional) <textarea className="field mt-1" name="instructions" defaultValue={editing.instructions || ''} maxLength={500} /></label>
            
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isDefaultShipping" defaultChecked={editing.isDefaultShipping} /> Default Shipping
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isDefaultBilling" defaultChecked={editing.isDefaultBilling} /> Default Billing
              </label>
            </div>

            {errorMsg && <p className="text-red-700 text-sm">{errorMsg}</p>}
            
            <div className="flex gap-3 mt-4">
              <button className="button" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save address'}</button>
              <button type="button" className="button bg-gray-200 text-black hover:bg-gray-300" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <button className="button mb-6" onClick={() => setEditing({})}>+ Add new address</button>
          
          <div className="grid gap-4 md:grid-cols-2">
            {addresses?.length === 0 ? (
              <div className="card p-8 text-center col-span-2">No addresses saved.</div>
            ) : (
              addresses?.map(addr => (
                <div key={addr.id} className="card p-5 relative flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold mb-1 flex gap-2 items-center">
                      {addr.name}
                      {addr.isDefaultShipping && <span className="text-xs bg-[#b4512d] text-white px-2 py-0.5 rounded">Default Shipping</span>}
                      {addr.isDefaultBilling && <span className="text-xs bg-gray-600 text-white px-2 py-0.5 rounded">Default Billing</span>}
                    </h3>
                    <p className="text-sm">{addr.line1}</p>
                    {addr.line2 && <p className="text-sm">{addr.line2}</p>}
                    <p className="text-sm">{addr.city}, {addr.state} {addr.postalCode}</p>
                    <p className="text-sm">{addr.country}</p>
                    <p className="text-sm mt-2 text-black/60">{addr.phone}</p>
                  </div>
                  <div className="flex gap-3 mt-4 pt-4 border-t">
                    <button className="text-sm font-medium underline" onClick={() => setEditing(addr)}>Edit</button>
                    <button className="text-sm font-medium text-red-700 underline" onClick={() => { if(confirm('Delete address?')) deleteMutation.mutate(addr.id) }}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
