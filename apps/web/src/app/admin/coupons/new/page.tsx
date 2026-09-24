import { CouponAdminForm } from '@/components/coupon-admin-form';

export default function NewCoupon() {
  return (
    <>
      <p className="text-sm uppercase tracking-widest text-[#b4512d]">Promotions</p>
      <h1 className="mt-1 text-3xl font-black">New coupon</h1>
      <CouponAdminForm />
    </>
  );
}
