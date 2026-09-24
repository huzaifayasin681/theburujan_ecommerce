export type ApiError = { statusCode: number; code: string; message: string; details?: unknown; requestId?: string };
export type PageMeta = { page: number; limit: number; total: number; totalPages: number };
export type Paginated<T> = { data: T[]; meta: PageMeta };
export type Money = { amount: string; currency: string };

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  basePrice: string;
  salePrice: string | null;
  currency: string;
  featuredImage: { url: string; altText: string | null } | null;
  brand: { name: string; slug: string } | null;
  averageRating: string;
  reviewCount: number;
  inStock: boolean;
};
