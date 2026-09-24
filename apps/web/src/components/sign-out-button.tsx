'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
export function SignOutButton({ className = '' }: { className?: string }) { const [busy, setBusy] = useState(false); return <Button variant="outline" className={className} disabled={busy} onClick={async () => { setBusy(true); try { await api('/auth/logout', { method: 'POST' }); } catch { /* Logout is intentionally idempotent when a session already expired. */ } finally { window.location.assign('/'); } }}><LogOut className="mr-2 h-4 w-4" />{busy ? 'Signing out…' : 'Sign out'}</Button>; }
