'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductAdminForm, type EditableProduct } from '@/components/product-admin-form';

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => api<EditableProduct>(`/admin/products/${id}`),
  });

  if (isLoading) return <p>Loading product…</p>;
  if (error || !data) return <p className="text-red-700">{error?.message ?? 'Product not found'}</p>;

  return (
    <>
      <p className="text-sm uppercase tracking-widest text-[#b4512d]">Catalog</p>
      <h1 className="mt-1 text-3xl font-black">Edit {data.name}</h1>
      <ProductAdminForm product={data} />
    </>
  );
}
