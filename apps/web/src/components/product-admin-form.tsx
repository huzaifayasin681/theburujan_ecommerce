'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { api, uploadAdminMedia } from '@/lib/api';

const money = /^\d+(\.\d{1,4})?$/;
const whole = /^\d*$/;
const formSchema = z.object({
  name: z.string().min(2).max(255), slug: z.string().regex(/^[a-z0-9-]+$/), sku: z.string().min(1).max(100),
  shortDescription: z.string().min(1).max(500), description: z.string().min(10).max(10000), richDescription: z.string().max(60000).optional(),
  basePrice: z.string().regex(money), salePrice: z.string().regex(money).or(z.literal('')).optional(), costPrice: z.string().regex(money).or(z.literal('')).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']), visibility: z.enum(['PUBLIC', 'HIDDEN']), brandId: z.string().optional(), taxClassId: z.string().optional(),
  weightGrams: z.string().regex(whole).optional(), lengthMm: z.string().regex(whole).optional(), widthMm: z.string().regex(whole).optional(), heightMm: z.string().regex(whole).optional(),
  seoTitle: z.string().max(70).optional(), seoDescription: z.string().max(170).optional(), initialStock: z.string().regex(whole).optional(), tagsText: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;
type Category = { id: string; name: string; parentId: string | null };
type Brand = { id: string; name: string };
type TaxClassItem = { id: string; name: string };
type TaxData = TaxClassItem[] | { classes: TaxClassItem[] };
type ImageItem = { mediaId: string; url: string; altText: string; featured: boolean };
type AttributeItem = { name: string; values: string };
type VariantItem = { id?: string; key: string; attributes: Record<string, string>; sku: string; price: string; salePrice: string; stock: number; lowStockThreshold: number; weightGrams?: number | undefined; active: boolean };
export type EditableProduct = {
  id: string; name: string; slug: string; sku: string; shortDescription: string | null; description: string; richDescription: string | null;
  basePrice: string; salePrice: string | null; costPrice: string | null; status: FormValues['status']; visibility: FormValues['visibility']; brandId: string | null; taxClassId: string | null;
  weightGrams: number | null; lengthMm: number | null; widthMm: number | null; heightMm: number | null; seoTitle: string | null; seoDescription: string | null;
  categories: { categoryId: string }[]; tags: { tag: { name: string } }[]; images: { mediaId: string | null; url: string; altText: string | null; featured: boolean }[];
  attributes: { name: string; values: { value: string }[] }[];
  variants: { id: string; sku: string; price: string | null; salePrice: string | null; weightGrams: number | null; active: boolean; combinationKey: string; inventory: { available: number; lowStockThreshold: number } | null; values: { value: { value: string; attribute: { name: string } } }[] }[];
};
const fieldClass = 'flex min-h-10 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function combinations(attributes: AttributeItem[]) {
  const usable = attributes.map((item) => ({ name: item.name.trim(), values: item.values.split(',').map((value) => value.trim()).filter(Boolean) })).filter((item) => item.name && item.values.length);
  if (!usable.length || usable.length !== attributes.length) return [];
  return usable.reduce<{ key: string; values: Record<string, string> }[]>((rows, attribute) => rows.flatMap((row) => attribute.values.map((value) => { const values = { ...row.values, [attribute.name]: value }; return { values, key: Object.keys(values).sort().map((name) => `${name}=${values[name]}`).join('|') }; })), [{ key: '', values: {} }]);
}

export function ProductAdminForm({ product }: { product?: EditableProduct }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categoryIds, setCategoryIds] = useState(product?.categories.map((item) => item.categoryId) ?? []);
  const [images, setImages] = useState<ImageItem[]>(product?.images.filter((item): item is typeof item & { mediaId: string } => Boolean(item.mediaId)).map((item) => ({ mediaId: item.mediaId, url: item.url, altText: item.altText ?? '', featured: item.featured })) ?? []);
  const initialAttributes = product?.attributes.map((item) => ({ name: item.name, values: item.values.map((value) => value.value).join(', ') })) ?? [];
  const [attributes, setAttributes] = useState<AttributeItem[]>(initialAttributes);
  const [variants, setVariants] = useState<VariantItem[]>(product?.variants.filter((item) => item.combinationKey !== 'default').map((item) => ({ id: item.id, key: item.combinationKey, attributes: Object.fromEntries(item.values.map((link) => [link.value.attribute.name, link.value.value])), sku: item.sku, price: item.price ?? '', salePrice: item.salePrice ?? '', stock: item.inventory?.available ?? 0, lowStockThreshold: item.inventory?.lowStockThreshold ?? 5, weightGrams: item.weightGrams ?? undefined, active: item.active })) ?? []);
  const { data: categories = [] } = useQuery({ queryKey: ['admin-categories'], queryFn: () => api<Category[]>('/admin/categories') });
  const { data: brands = [] } = useQuery({ queryKey: ['admin-brands'], queryFn: () => api<Brand[]>('/admin/brands') });
  const { data: taxes } = useQuery({ queryKey: ['admin-taxes'], queryFn: () => api<TaxData>('/admin/taxes') });

  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeBrands = Array.isArray(brands) ? brands : [];
  const taxClasses: TaxClassItem[] = Array.isArray(taxes) ? taxes : (taxes?.classes ?? []);

  const defaults = useMemo<FormValues>(() => ({
    name: product?.name ?? '', slug: product?.slug ?? '', sku: product?.sku ?? '', shortDescription: product?.shortDescription ?? '', description: product?.description ?? '', richDescription: product?.richDescription ?? '',
    basePrice: product?.basePrice ?? '', salePrice: product?.salePrice ?? '', costPrice: product?.costPrice ?? '', status: product?.status ?? 'DRAFT', visibility: product?.visibility ?? 'PUBLIC', brandId: product?.brandId ?? '', taxClassId: product?.taxClassId ?? '',
    weightGrams: product?.weightGrams?.toString() ?? '', lengthMm: product?.lengthMm?.toString() ?? '', widthMm: product?.widthMm?.toString() ?? '', heightMm: product?.heightMm?.toString() ?? '', seoTitle: product?.seoTitle ?? '', seoDescription: product?.seoDescription ?? '', initialStock: product ? undefined : '0',
    tagsText: product?.tags.map((item) => item.tag.name).join(', ') ?? '',
  }), [product]);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults });

  function rebuildVariants(nextAttributes: AttributeItem[]) {
    const previous = new Map(variants.map((variant) => [variant.key, variant]));
    setVariants(combinations(nextAttributes).map(({ key, values }, index) => previous.get(key) ?? ({ key, attributes: values, sku: `${product?.sku ?? 'SKU'}-${index + 1}`, price: '', salePrice: '', stock: 0, lowStockThreshold: 5, active: true })));
  }
  function changeAttribute(index: number, patch: Partial<AttributeItem>) { const next = attributes.map((item, position) => position === index ? { ...item, ...patch } : item); setAttributes(next); rebuildVariants(next); }
  function removeAttribute(index: number) { const next = attributes.filter((_, position) => position !== index); setAttributes(next); rebuildVariants(next); }
  function changeVariant(index: number, patch: Partial<VariantItem>) { setVariants((items) => items.map((item, position) => position === index ? { ...item, ...patch } : item)); }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await Promise.all(Array.from(files).map(uploadAdminMedia));
      setImages((current) => [...current, ...uploaded.map((item, index) => ({ mediaId: item.id, url: item.url, altText: item.altText ?? '', featured: current.length === 0 && index === 0 }))]);
      toast.success('Images uploaded successfully');
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : 'Images could not be uploaded';
      setError(msg);
      toast.error('Image upload failed', msg);
    } finally {
      setUploading(false);
    }
  }
  const submit = handleSubmit(async (values) => {
    setBusy(true); setError('');
    try {
      const payload = {
        ...values, salePrice: values.salePrice || undefined, costPrice: values.costPrice || undefined, brandId: values.brandId || undefined, taxClassId: values.taxClassId || undefined,
        weightGrams: values.weightGrams ? Number(values.weightGrams) : undefined, lengthMm: values.lengthMm ? Number(values.lengthMm) : undefined, widthMm: values.widthMm ? Number(values.widthMm) : undefined, heightMm: values.heightMm ? Number(values.heightMm) : undefined, initialStock: values.initialStock ? Number(values.initialStock) : undefined,
        tags: values.tagsText?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [], categoryIds,
        images: images.map(({ mediaId, altText, featured }) => ({ mediaId, altText: altText || undefined, featured })),
        ...(attributes.length ? { attributes: attributes.map((item) => ({ name: item.name.trim(), values: item.values.split(',').map((value) => value.trim()).filter(Boolean) })), variants: variants.map(({ id, attributes: selected, sku, price, salePrice, stock, lowStockThreshold, weightGrams, active }) => ({ id, attributes: selected, sku, price: price || undefined, salePrice: salePrice || undefined, stock, lowStockThreshold, weightGrams, active })) } : {}),
      };
      delete (payload as { tagsText?: string }).tagsText;
      const result = await api<{ id: string }>(product ? `/admin/products/${product.id}` : '/admin/products', { method: product ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      toast.success(product ? 'Product updated successfully' : 'Product created successfully');
      router.push(`/admin/products/${result.id}`);
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : 'Product could not be saved';
      setError(msg);
      toast.error('Save failed', msg);
    } finally {
      setBusy(false);
    }
  });

  return <form onSubmit={submit} className="relative pb-24">
    <div className="sticky top-0 z-40 -mx-6 mb-8 flex items-center justify-between border-b border-border bg-background/90 px-6 py-4 backdrop-blur-md md:-mx-8 md:px-8"><div className="flex items-center gap-4"><Button asChild variant="outline" size="icon"><Link href="/admin/products" aria-label="Back to products"><ArrowLeft className="h-4 w-4"/></Link></Button><h2 className="text-xl font-bold">{product ? 'Edit product' : 'Create product'}</h2></div><Button type="submit" disabled={busy || uploading}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}{busy ? 'Saving...' : 'Save'}</Button></div>
    {error && <div className="mb-6 flex gap-3 rounded-lg bg-destructive/10 p-4 text-sm text-destructive"><AlertCircle className="h-5 w-5"/><p>{error}</p></div>}
    {Object.keys(errors).length > 0 && <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">Check the highlighted fields and monetary formats.</div>}
    <div className="grid gap-8 xl:grid-cols-[1fr_340px]"><div className="space-y-8">
      <section className="card grid gap-5 p-6"><h3 className="text-lg font-bold">Product information</h3><label>Name<Input {...register('name')} aria-invalid={Boolean(errors.name)}/></label><div className="grid gap-5 sm:grid-cols-2"><label>Slug<Input {...register('slug')} aria-invalid={Boolean(errors.slug)}/></label><label>SKU<Input {...register('sku')} aria-invalid={Boolean(errors.sku)}/></label></div><label>Short description<textarea className={fieldClass} {...register('shortDescription')}/></label><label>Description<textarea className={`${fieldClass} min-h-40`} {...register('description')}/></label><label>Rich description<textarea className={`${fieldClass} min-h-40`} {...register('richDescription')}/></label></section>
      <section className="card grid gap-5 p-6"><h3 className="text-lg font-bold">Pricing and dimensions</h3><div className="grid gap-5 sm:grid-cols-3"><label>Base price<Input inputMode="decimal" {...register('basePrice')}/></label><label>Sale price<Input inputMode="decimal" {...register('salePrice')}/></label><label>Cost price<Input inputMode="decimal" {...register('costPrice')}/></label></div><div className="grid gap-5 sm:grid-cols-4"><label>Weight (g)<Input type="number" min="0" {...register('weightGrams')}/></label><label>Length (mm)<Input type="number" min="0" {...register('lengthMm')}/></label><label>Width (mm)<Input type="number" min="0" {...register('widthMm')}/></label><label>Height (mm)<Input type="number" min="0" {...register('heightMm')}/></label></div></section>
      <ImageEditor images={images} uploading={uploading} onUpload={upload} onChange={setImages}/>
      <VariantEditor attributes={attributes} variants={variants} onAdd={() => setAttributes((items) => [...items, { name: '', values: '' }])} onAttribute={changeAttribute} onRemoveAttribute={removeAttribute} onVariant={changeVariant}/>
    </div><aside className="space-y-8">
      <section className="card grid gap-4 p-6"><h3 className="font-bold">Publishing</h3><label>Status<select className={fieldClass} {...register('status')}><option>DRAFT</option><option>ACTIVE</option><option>INACTIVE</option><option>ARCHIVED</option></select></label><label>Visibility<select className={fieldClass} {...register('visibility')}><option>PUBLIC</option><option>HIDDEN</option></select></label>{!product && attributes.length === 0 && <label>Initial stock<Input type="number" min="0" {...register('initialStock')}/></label>}</section>
      <section className="card grid gap-4 p-6"><h3 className="font-bold">Organization</h3><label>Brand<select className={fieldClass} {...register('brandId')}><option value="">No brand</option>{safeBrands.map((brand) => <option value={brand.id} key={brand.id}>{brand.name}</option>)}</select></label><label>Tax class<select className={fieldClass} {...register('taxClassId')}><option value="">No tax class</option>{taxClasses.map((taxClass) => <option value={taxClass.id} key={taxClass.id}>{taxClass.name}</option>)}</select></label><fieldset><legend>Categories</legend><div className="mt-2 max-h-52 space-y-2 overflow-auto rounded border p-3">{safeCategories.map((category) => <label className="flex gap-2 text-sm" key={category.id}><input type="checkbox" checked={categoryIds.includes(category.id)} onChange={(event) => setCategoryIds((ids) => event.target.checked ? [...ids, category.id] : ids.filter((id) => id !== category.id))}/>{category.name}</label>)}</div></fieldset><label>Tags<Input {...register('tagsText')} placeholder="new, summer, cotton"/></label></section>
      <section className="card grid gap-4 p-6"><h3 className="font-bold">Search metadata</h3><label>SEO title<Input {...register('seoTitle')} maxLength={70}/></label><label>SEO description<textarea className={fieldClass} {...register('seoDescription')} maxLength={170}/></label></section>
    </aside></div>
  </form>;
}

function ImageEditor({ images, uploading, onUpload, onChange }: { images: ImageItem[]; uploading: boolean; onUpload: (files: FileList | null) => Promise<void>; onChange: React.Dispatch<React.SetStateAction<ImageItem[]>> }) {
  return <section className="card p-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold">Images</h3>
      <label className={`button cursor-pointer ${uploading ? 'opacity-70 pointer-events-none' : ''}`}>
        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
        {uploading ? 'Uploading…' : 'Upload'}
        <input
          className="sr-only"
          type="file"
          multiple
          disabled={uploading}
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const files = event.target.files;
            void onUpload(files);
            event.target.value = '';
          }}
        />
      </label>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((image, index) => <div className="rounded-lg border p-3" key={image.mediaId}>
        <Image className="aspect-square w-full rounded object-cover" src={image.url} alt={image.altText} width={400} height={400} unoptimized/>
        <Input className="mt-3" value={image.altText} placeholder="Alt text" onChange={(event) => onChange((items) => items.map((item, position) => position === index ? { ...item, altText: event.target.value } : item))}/>
        <div className="mt-2 flex justify-between">
          <label className="text-sm cursor-pointer flex items-center gap-1.5">
            <input type="radio" checked={image.featured} onChange={() => onChange((items) => items.map((item, position) => ({ ...item, featured: position === index })))} name="featuredImage"/> Featured
          </label>
          <button type="button" aria-label="Remove image" className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => onChange((items) => items.filter((_, position) => position !== index).map((item, position) => ({ ...item, featured: item.featured || position === 0 })))}>
            <Trash2 className="h-4 w-4"/>
          </button>
        </div>
      </div>)}
    </div>
  </section>;
}

function VariantEditor({ attributes, variants, onAdd, onAttribute, onRemoveAttribute, onVariant }: { attributes: AttributeItem[]; variants: VariantItem[]; onAdd: () => void; onAttribute: (index: number, patch: Partial<AttributeItem>) => void; onRemoveAttribute: (index: number) => void; onVariant: (index: number, patch: Partial<VariantItem>) => void }) {
  return <section className="card p-6"><div className="flex items-center justify-between"><div><h3 className="text-lg font-bold">Variants</h3><p className="text-sm text-muted-foreground">Enter comma-separated values. Valid combinations are generated automatically.</p></div><Button type="button" variant="outline" onClick={onAdd}><Plus className="mr-2 h-4 w-4"/>Attribute</Button></div><div className="mt-5 space-y-3">{attributes.map((attribute, index) => <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]" key={index}><Input value={attribute.name} placeholder="Color" onChange={(event) => onAttribute(index, { name: event.target.value })}/><Input value={attribute.values} placeholder="Black, White" onChange={(event) => onAttribute(index, { values: event.target.value })}/><Button type="button" variant="outline" size="icon" onClick={() => onRemoveAttribute(index)} aria-label="Remove attribute"><Trash2 className="h-4 w-4"/></Button></div>)}</div>{variants.length > 0 && <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr><th>Combination</th><th>SKU</th><th>Price</th><th>Sale</th><th>Stock</th><th>Low stock</th><th>Active</th></tr></thead><tbody>{variants.map((variant, index) => <tr className="border-t" key={variant.key}><td className="py-3 pr-3">{Object.values(variant.attributes).join(' / ')}</td><td><Input value={variant.sku} onChange={(event) => onVariant(index, { sku: event.target.value })}/></td><td><Input value={variant.price} onChange={(event) => onVariant(index, { price: event.target.value })}/></td><td><Input value={variant.salePrice} onChange={(event) => onVariant(index, { salePrice: event.target.value })}/></td><td><Input type="number" min="0" value={variant.stock} onChange={(event) => onVariant(index, { stock: Number(event.target.value) })}/></td><td><Input type="number" min="0" value={variant.lowStockThreshold} onChange={(event) => onVariant(index, { lowStockThreshold: Number(event.target.value) })}/></td><td className="text-center"><input type="checkbox" checked={variant.active} onChange={(event) => onVariant(index, { active: event.target.checked })}/></td></tr>)}</tbody></table></div>}</section>;
}
