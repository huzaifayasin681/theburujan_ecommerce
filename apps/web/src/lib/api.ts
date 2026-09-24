export class ApiClientError extends Error { constructor(readonly status: number, readonly code: string, message: string, readonly details?: unknown) { super(message); } }
const browserBase = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> { const csrf = typeof document === 'undefined' ? undefined : document.cookie.split('; ').find((value) => value.startsWith('csrf_token='))?.split('=').slice(1).join('='); const response = await fetch(`${browserBase}${path}`, { ...options, credentials: 'include', headers: { 'content-type': 'application/json', ...(csrf ? { 'x-csrf-token': decodeURIComponent(csrf) } : {}), ...options.headers } }); if (!response.ok) { const body = await response.json().catch(() => ({})) as { code?: string; message?: string; details?: unknown }; throw new ApiClientError(response.status, body.code ?? 'REQUEST_FAILED', body.message ?? 'Request failed', body.details); } if (response.status === 204) return undefined as T; return response.json() as Promise<T>; }
export async function serverApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const serverBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!serverBase) throw new Error('INTERNAL_API_URL or NEXT_PUBLIC_API_URL is required for server requests');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`${serverBase}${path}`, {
      ...init,
      signal: init.signal ?? controller.signal,
      next: { revalidate: 60, ...(init as { next?: object }).next },
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    return response.json() as Promise<T>;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}
export async function uploadCustomerMedia(file: File): Promise<{ id: string; url: string }> { const csrf = document.cookie.split('; ').find((value) => value.startsWith('csrf_token='))?.split('=').slice(1).join('='); const form = new FormData(); form.append('file', file); const response = await fetch(`${browserBase}/media/customer`, { method: 'POST', body: form, credentials: 'include', headers: csrf ? { 'x-csrf-token': decodeURIComponent(csrf) } : {} }); if (!response.ok) { const body = await response.json().catch(() => ({})) as { message?: string }; throw new Error(body.message ?? 'Image upload failed'); } return response.json() as Promise<{ id: string; url: string }>; }
export async function uploadAdminMedia(file: File): Promise<{ id: string; url: string; altText: string | null }> { const csrf = document.cookie.split('; ').find((value) => value.startsWith('csrf_token='))?.split('=').slice(1).join('='); const form = new FormData(); form.append('file', file); const response = await fetch(`${browserBase}/media`, { method: 'POST', body: form, credentials: 'include', headers: csrf ? { 'x-csrf-token': decodeURIComponent(csrf) } : {} }); if (!response.ok) { const body = await response.json().catch(() => ({})) as { message?: string }; throw new Error(body.message ?? 'Image upload failed'); } return response.json() as Promise<{ id: string; url: string; altText: string | null }>; }
export async function uploadAvatar(file: File): Promise<{ id: string; avatarUrl: string | null }> { const csrf = document.cookie.split('; ').find((value) => value.startsWith('csrf_token='))?.split('=').slice(1).join('='); const form = new FormData(); form.append('file', file); const response = await fetch(`${browserBase}/account/avatar`, { method: 'POST', body: form, credentials: 'include', headers: csrf ? { 'x-csrf-token': decodeURIComponent(csrf) } : {} }); if (!response.ok) { const body = await response.json().catch(() => ({})) as { message?: string }; throw new Error(body.message ?? 'Avatar upload failed'); } return response.json() as Promise<{ id: string; avatarUrl: string | null }>; }
