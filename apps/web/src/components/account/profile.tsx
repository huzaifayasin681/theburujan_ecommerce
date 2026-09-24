'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, uploadAvatar } from '@/lib/api';

type Profile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
};

export function AccountProfile() {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['account', 'profile'],
    queryFn: () => api<Profile>('/account/profile'),
  });

  const mutation = useMutation({
    mutationFn: (formData: FormData) =>
      api('/account/profile', {
        method: 'PATCH',
        body: JSON.stringify(Object.fromEntries(formData)),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'profile'] });
      setErrorMsg('');
      alert('Profile updated successfully');
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => api('/account/delete', { method: 'POST' }),
    onSuccess: () => {
      window.location.href = '/';
    },
  });
  const avatar = useMutation({ mutationFn: uploadAvatar, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account', 'profile'] }), onError: (err: Error) => setErrorMsg(err.message) });

  if (isLoading) return <p>Loading profile…</p>;
  if (error) return <p className="text-red-700">{error.message}</p>;
  if (!data) return <p>Profile not found</p>;

  return (
    <div className="card p-6 mt-8 max-w-2xl">
      <form action={(f) => mutation.mutate(f)} className="grid gap-4">
        <div className="flex items-center gap-4"><div className="h-16 w-16 overflow-hidden rounded-full bg-secondary">{data.avatarUrl && <img src={data.avatarUrl} alt="Profile" className="h-full w-full object-cover" />}</div><label className="button cursor-pointer">{avatar.isPending ? 'Uploading…' : 'Upload profile image'}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) avatar.mutate(file); }} /></label></div>
        <label>
          Email (Cannot be changed here)
          <input className="field mt-1 bg-gray-100" value={data.email} disabled />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            First name
            <input className="field mt-1" name="firstName" defaultValue={data.firstName} required minLength={1} />
          </label>
          <label>
            Last name
            <input className="field mt-1" name="lastName" defaultValue={data.lastName} required minLength={1} />
          </label>
        </div>
        <label>
          Phone
          <input className="field mt-1" name="phone" defaultValue={data.phone || ''} />
        </label>
        
        {errorMsg && <p className="text-red-700 text-sm">{errorMsg}</p>}
        
        <button className="button w-fit mt-2" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Update profile'}
        </button>
      </form>

      <div className="mt-12 pt-8 border-t">
        <h2 className="text-xl font-bold text-red-700 mb-2">Danger Zone</h2>
        <p className="text-sm text-black/60 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
        <button 
          className="button bg-red-700 hover:bg-red-800" 
          onClick={() => {
            if (confirm('Are you absolutely sure you want to request account deletion?')) {
              deleteAccount.mutate();
            }
          }}
          disabled={deleteAccount.isPending}
        >
          {deleteAccount.isPending ? 'Requesting...' : 'Request account deletion'}
        </button>
      </div>
    </div>
  );
}
