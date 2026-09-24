import { notFound } from 'next/navigation';
import { AccountResource } from '@/components/account-resource';
const sections = new Set(['profile', 'addresses', 'wishlist', 'reviews', 'returns', 'refunds', 'coupons', 'notifications', 'security']);
export default async function AccountSection({ params }: { params: Promise<{ section: string }> }) { const { section } = await params; if (!sections.has(section)) notFound(); return <AccountResource section={section} />; }
