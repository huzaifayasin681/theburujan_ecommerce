'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, uploadAvatar } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Camera, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import Image from 'next/image';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { data, isLoading, error } = useQuery<Profile>({
    queryKey: ['account', 'profile'],
    queryFn: () => api<Profile>('/account/profile'),
  });

  const mutation = useMutation({
    mutationFn: (formData: FormData) =>
      api<Profile>('/account/profile', {
        method: 'PATCH',
        body: JSON.stringify(Object.fromEntries(formData)),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['account', 'profile'], (old: Profile | undefined) =>
        old ? { ...old, ...updated } : updated
      );
      queryClient.invalidateQueries({ queryKey: ['account', 'profile'] });
      setErrorMsg('');
      toast.success('Profile updated', 'Your personal details have been saved.');
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      toast.error('Update failed', err.message);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (res) => {
      queryClient.setQueryData(['account', 'profile'], (old: Profile | undefined) =>
        old ? { ...old, avatarUrl: res.avatarUrl } : old
      );
      queryClient.invalidateQueries({ queryKey: ['account', 'profile'] });
      toast.success('Photo updated', 'Your profile picture has been updated successfully.');
    },
    onError: (err: Error) => {
      toast.error('Upload failed', err.message || 'Could not upload photo.');
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => api('/account/delete', { method: 'POST' }),
    onSuccess: () => {
      toast.info('Account deleted', 'Your account has been deleted.');
      window.location.href = '/';
    },
    onError: (err: Error) => {
      toast.error('Deletion failed', err.message);
    },
  });

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error('File too large', 'Please choose an image under 4MB.');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Invalid format', 'Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    avatarMutation.mutate(file);
    // Reset file input value so same file can be re-uploaded if needed
    event.target.value = '';
  }

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-stone-900" />
        <p className="text-xs font-medium">Loading your profile…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs max-w-xl mt-6">
        <p className="font-semibold">Unable to load profile</p>
        <p className="mt-1">{error.message}</p>
      </div>
    );
  }

  if (!data) return null;

  const initials = `${data.firstName?.charAt(0) || ''}${data.lastName?.charAt(0) || ''}`.toUpperCase() || 'U';

  return (
    <div className="space-y-8 max-w-2xl mt-6">
      {/* 1. Avatar Photo Card */}
      <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="h-5 w-1 bg-stone-900 rounded-full" />
          <h2 className="font-serif text-xl font-medium tracking-tight text-stone-900">
            Profile Avatar
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6">
          {/* Avatar Picture or Initials */}
          <div className="relative group shrink-0">
            <div className="relative h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full ring-4 ring-stone-100 shadow-sm bg-stone-100 flex items-center justify-center">
              {data.avatarUrl ? (
                <Image
                  src={data.avatarUrl}
                  alt={`${data.firstName} ${data.lastName}`}
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                  unoptimized={data.avatarUrl.includes('unsplash.com')}
                />
              ) : (
                <span className="font-serif text-2xl sm:text-3xl font-bold text-stone-700 select-none">
                  {initials}
                </span>
              )}

              {avatarMutation.isPending && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white backdrop-blur-xs">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </div>

            {/* Quick camera trigger icon */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload profile image"
              disabled={avatarMutation.isPending}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-md hover:bg-stone-800 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2.5">
            <div>
              <p className="text-sm font-semibold text-stone-900">
                {data.firstName} {data.lastName}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                JPEG, PNG, or WebP · Maximum size 4MB
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarMutation.isPending}
                className="rounded-full px-4 h-9 text-xs font-semibold border-stone-200 text-stone-800 hover:bg-stone-50"
              >
                {avatarMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Camera className="h-3.5 w-3.5 mr-1.5" />
                    Upload Photo
                  </>
                )}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Personal Information Card */}
      <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="h-5 w-1 bg-stone-900 rounded-full" />
          <h2 className="font-serif text-xl font-medium tracking-tight text-stone-900">
            Personal Information
          </h2>
        </div>

        <form
          action={(f) => mutation.mutate(f)}
          className="grid gap-4.5"
        >
          {/* Email address (verified) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-600">Email Address</label>
              {data.emailVerifiedAt ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </span>
              ) : (
                <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  Pending Verification
                </span>
              )}
            </div>
            <Input
              value={data.email}
              disabled
              className="h-12 rounded-xl bg-stone-100/70 border-stone-200 text-sm text-stone-500 cursor-not-allowed"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Your registered email is used for receipts and authentication.
            </p>
          </div>

          {/* Name fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                First Name <span className="text-red-500">*</span>
              </label>
              <Input
                name="firstName"
                defaultValue={data.firstName}
                required
                minLength={1}
                placeholder="First name"
                className="h-12 rounded-xl bg-stone-50/50 border-stone-200 text-sm focus-visible:ring-stone-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                Last Name <span className="text-red-500">*</span>
              </label>
              <Input
                name="lastName"
                defaultValue={data.lastName}
                required
                minLength={1}
                placeholder="Last name"
                className="h-12 rounded-xl bg-stone-50/50 border-stone-200 text-sm focus-visible:ring-stone-900"
              />
            </div>
          </div>

          {/* Phone number */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">
              Phone Number <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              name="phone"
              defaultValue={data.phone || ''}
              placeholder="+1 (555) 000-0000"
              className="h-12 rounded-xl bg-stone-50/50 border-stone-200 text-sm focus-visible:ring-stone-900"
            />
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl flex items-start gap-2.5 text-xs animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <p className="leading-snug">{errorMsg}</p>
            </div>
          )}

          <div className="pt-3">
            <Button
              type="submit"
              size="lg"
              disabled={mutation.isPending}
              className="rounded-full px-8 h-12 text-xs font-semibold uppercase tracking-wider bg-stone-900 hover:bg-stone-800 text-white shadow-xs"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes…
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* 3. Account Safety / Danger Zone */}
      <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="h-4 w-4 text-stone-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Account Management
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Permanently close your customer profile and remove personal data in compliance with privacy regulations.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm('Are you certain you want to request permanent account closure? This action cannot be undone.')) {
              deleteAccount.mutate();
            }
          }}
          disabled={deleteAccount.isPending}
          className="rounded-full text-xs font-semibold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          {deleteAccount.isPending ? 'Processing…' : 'Request Account Deletion'}
        </Button>
      </div>
    </div>
  );
}
