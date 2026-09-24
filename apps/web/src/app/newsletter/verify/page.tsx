'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
export default function NewsletterVerify() { const [message, setMessage] = useState('Verifying subscription…'); useEffect(() => { const token = new URLSearchParams(window.location.search).get('token'); if (!token) { setMessage('Verification token is missing.'); return; } void api(`/newsletter/verify?token=${encodeURIComponent(token)}`).then(() => setMessage('Your newsletter subscription is confirmed.')).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Verification failed.')); }, []); return <main className="container py-20 text-center"><h1 className="text-4xl font-black">Newsletter</h1><p className="mt-5" aria-live="polite">{message}</p><Link className="button mt-8 inline-flex" href="/">Return to store</Link></main>; }
