'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export function CouponAdminForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(form: FormData) {
    setBusy(true);
    setError('');
    const raw = Object.fromEntries(form) as Record<string, string>;
    
    try {
      const payload = {
        ...raw,
        usageLimit: raw.usageLimit ? parseInt(raw.usageLimit, 10) : undefined,
        perUserLimit: raw.perUserLimit ? parseInt(raw.perUserLimit, 10) : undefined,
        minimumSpend: raw.minimumSpend || undefined,
        maximumDiscount: raw.maximumDiscount || undefined,
        minimumQuantity: raw.minimumQuantity ? parseInt(raw.minimumQuantity, 10) : undefined,
        startsAt: raw.startsAt ? new Date(raw.startsAt).toISOString() : undefined,
        expiresAt: raw.expiresAt ? new Date(raw.expiresAt).toISOString() : undefined,
        firstOrderOnly: raw.firstOrderOnly === 'true',
        stackable: raw.stackable === 'true',
        active: raw.active === 'true',
        productIds: raw.productIds ? raw.productIds.split(',').map((value) => value.trim()).filter(Boolean) : [],
        variantIds: raw.variantIds ? raw.variantIds.split(',').map((value) => value.trim()).filter(Boolean) : [],
        categoryIds: raw.categoryIds ? raw.categoryIds.split(',').map((value) => value.trim()).filter(Boolean) : [],
        customerIds: raw.customerIds ? raw.customerIds.split(',').map((value) => value.trim()).filter(Boolean) : [],
      };

      await api('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push('/admin/coupons');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Coupon could not be saved');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={submit} className="card mt-8 grid gap-4 p-6">
      <label>
        Code
        <input className="field mt-1 uppercase" name="code" required minLength={2} maxLength={64} style={{ textTransform: 'uppercase' }} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Type
          <select className="field mt-1" name="type" defaultValue="PERCENTAGE">
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED_CART">Fixed Cart Discount</option>
            <option value="FIXED_PRODUCT">Fixed Product Discount</option>
            <option value="FREE_SHIPPING">Free Shipping</option>
          </select>
        </label>
        <label>
          Discount Value
          <input className="field mt-1" name="value" inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,4})?" required />
        </label>
        <label>
          Minimum Spend
          <input className="field mt-1" name="minimumSpend" inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,4})?" />
        </label>
        <label>
          Maximum Discount
          <input className="field mt-1" name="maximumDiscount" inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,4})?" />
        </label>
        <label>
          Total Usage Limit
          <input className="field mt-1" name="usageLimit" type="number" min="1" />
        </label>
        <label>
          Per-User Limit
          <input className="field mt-1" name="perUserLimit" type="number" min="1" />
        </label>
        <label>Minimum Quantity<input className="field mt-1" name="minimumQuantity" type="number" min="1" /></label>
        <label>Starts At<input className="field mt-1" name="startsAt" type="datetime-local" /></label>
        <label>Expires At<input className="field mt-1" name="expiresAt" type="datetime-local" /></label>
        <label>First order only<select className="field mt-1" name="firstOrderOnly" defaultValue="false"><option value="false">No</option><option value="true">Yes</option></select></label>
        <label>Stackable<select className="field mt-1" name="stackable" defaultValue="false"><option value="false">No</option><option value="true">Yes</option></select></label>
        <label>Active<select className="field mt-1" name="active" defaultValue="true"><option value="true">Yes</option><option value="false">No</option></select></label>
      </div>
      <fieldset className="grid gap-4 rounded-md border p-4"><legend className="px-2 font-semibold">Optional restrictions</legend><p className="text-sm text-muted-foreground">Enter comma-separated UUIDs. Empty fields apply to all records.</p><label>Product IDs<input className="field mt-1" name="productIds" /></label><label>Variant IDs<input className="field mt-1" name="variantIds" /></label><label>Category IDs<input className="field mt-1" name="categoryIds" /></label><label>Customer IDs<input className="field mt-1" name="customerIds" /></label></fieldset>
      {error && <p className="text-red-700" role="alert">{error}</p>}
      <button className="button" disabled={busy}>
        {busy ? 'Saving…' : 'Create coupon'}
      </button>
    </form>
  );
}
