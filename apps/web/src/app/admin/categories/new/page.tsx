import { CategoryAdminForm } from '@/components/category-admin-form';

export default function NewCategory() {
  return (
    <>
      <p className="text-sm uppercase tracking-widest text-[#b4512d]">Catalog</p>
      <h1 className="mt-1 text-3xl font-black">New category</h1>
      <CategoryAdminForm />
    </>
  );
}
