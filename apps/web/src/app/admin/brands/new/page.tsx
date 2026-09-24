import { BrandAdminForm } from '@/components/brand-admin-form';

export default function NewBrand() {
  return (
    <>
      <p className="text-sm uppercase tracking-widest text-[#b4512d]">Catalog</p>
      <h1 className="mt-1 text-3xl font-black">New brand</h1>
      <BrandAdminForm />
    </>
  );
}
