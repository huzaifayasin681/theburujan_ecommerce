'use client';
import { AccountProfile } from './account/profile';
import { AccountAddresses } from './account/addresses';
import { AccountSecurity } from './account/security';
import { AccountReturns } from './account/returns';
import { AccountWishlist } from './account/wishlist';
import { AccountReviews } from './account/reviews';
import { AccountActivityList } from './account/activity-lists';

export function AccountResource({ section }: { section: string }) {
  const content = (() => {
    switch (section) {
      case 'profile': return <AccountProfile />;
      case 'addresses': return <AccountAddresses />;
      case 'security': return <AccountSecurity />;
      case 'returns': return <AccountReturns />;
      case 'wishlist': return <AccountWishlist />;
      case 'reviews': return <AccountReviews />;
      case 'notifications': return <AccountActivityList section="notifications" />;
      case 'coupons': return <AccountActivityList section="coupons" />;
      case 'refunds': return <AccountActivityList section="refunds" />;
      default: return null;
    }
  })();

  return (
    <div className="container py-12">
      <h1 className="text-4xl font-black capitalize">{section.replace('-', ' ')}</h1>
      {content}
    </div>
  );
}
