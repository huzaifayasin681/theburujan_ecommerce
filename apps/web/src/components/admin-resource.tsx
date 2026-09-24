'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Download, Upload, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type JsonRecord = Record<string, unknown>;
type PagedResponse = { data?: JsonRecord[]; meta?: { page: number; limit: number; total: number; totalPages: number } };

const printable = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

export function AdminResource({ section }: { section: string }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const csrf = document.cookie.split('; ').find(r => r.startsWith('csrf_token='))?.split('=')[1];
      const base = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
      const response = await fetch(`${base}/admin/products-import`, {
        method: 'POST',
        body: form,
        credentials: 'include',
        headers: csrf ? { 'x-csrf-token': decodeURIComponent(csrf) } : {}
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      setReport(data);
      queryClient.invalidateQueries({ queryKey: ['admin', section] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', section, page, search],
    queryFn: () => api<PagedResponse | JsonRecord[]>(`/admin/${section}?page=${page}&limit=25${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground font-medium">Loading {section.replaceAll('-', ' ')}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-8 rounded-xl flex flex-col items-center justify-center min-h-[40vh]">
        <AlertCircle className="h-8 w-8 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access unavailable</h1>
        <p className="font-medium max-w-md text-center">{error.message}</p>
      </div>
    );
  }

  const rows = Array.isArray(data) ? data : (data?.data ?? []);
  const meta = Array.isArray(data) ? undefined : data?.meta;
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
    .filter((key) => !['passwordHash', 'metadata'].includes(key))
    .slice(0, 7);

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header Area */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administration</p>
          <h1 className="mt-1 text-3xl font-extrabold capitalize tracking-tight">{section.replaceAll('-', ' ')}</h1>
          {report && (
            <div className="mt-4 text-sm text-success-foreground bg-success p-3 rounded-md font-medium flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Import complete! Success: {report.success} | Failed: {report.failed}
            </div>
          )}
        </div>
        {['products', 'orders', 'customers', 'reviews', 'returns', 'payments', 'refunds', 'audit-logs', 'notifications'].includes(section) && <label className="block max-w-md"><span className="sr-only">Search {section}</span><input className="field" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder={`Search ${section.replaceAll('-', ' ')}…`} /></label>}
        
        <div className="flex flex-wrap gap-3 items-center">
          {section === 'products' && (
            <>
              <Button asChild variant="outline" size="sm" className="h-10 border-border">
                <a href={`${process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'}/admin/products-export`} download>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-10 border-border cursor-pointer relative" disabled={busy}>
                <label>
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {busy ? 'Uploading...' : 'Import CSV'}
                  <input type="file" className="hidden" accept=".csv" onChange={handleImport} disabled={busy} />
                </label>
              </Button>
            </>
          )}
          {['products', 'categories', 'brands', 'coupons'].includes(section) && (
            <Button asChild size="sm" className="h-10 shadow-sm">
              <Link href={`/admin/${section}/new`}>
                <Plus className="w-4 h-4 mr-2" />
                New {section.slice(0, -1)}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Data Table */}
      {rows.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl flex flex-col items-center justify-center min-h-[40vh] text-center p-8">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">No records found</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">There are currently no {section.replaceAll('-', ' ')} in the database.</p>
          {['products', 'categories', 'brands', 'coupons'].includes(section) && (
            <Button asChild>
              <Link href={`/admin/${section}/new`}>
                <Plus className="w-4 h-4 mr-2" />
                Create your first {section.slice(0, -1)}
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  {columns.map((column) => (
                    <th className="p-4 px-6 font-semibold text-muted-foreground capitalize tracking-wide text-xs" key={column}>
                      {column.replaceAll(/([A-Z])/g, ' $1')}
                    </th>
                  ))}
                  <th className="p-4 px-6 font-semibold text-muted-foreground capitalize tracking-wide text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, index) => (
                  <tr className="hover:bg-secondary/20 transition-colors" key={String(row.id ?? index)}>
                    {columns.map((column) => (
                      <td
                        className="max-w-[200px] truncate p-4 px-6 font-medium text-foreground"
                        title={printable(row[column])}
                        key={column}
                      >
                        {column === 'id' && typeof row.id === 'string' && ['products', 'orders', 'customers', 'reviews', 'returns', 'inventory'].includes(section) ? (
                          <Link className="font-semibold text-accent hover:underline flex items-center" href={`/admin/${section}/${row.id}`}>
                            {printable(row[column]).substring(0, 8)}...
                          </Link>
                        ) : (
                          <span className={cn(
                            typeof row[column] === 'boolean' && (row[column] ? "text-success bg-success/10 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider" : "text-muted-foreground bg-secondary px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider")
                          )}>
                            {printable(row[column])}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="p-4 px-6 text-right">
                       {typeof row.id === 'string' && ['products', 'orders', 'customers', 'reviews', 'returns', 'inventory'].includes(section) ? (
                        <Button asChild variant="ghost" size="sm" className="h-8">
                          <Link href={`/admin/${section}/${row.id}`}>
                            View <ArrowRight className="w-4 h-4 ml-2" />
                          </Link>
                        </Button>
                       ) : (
                         <span className="text-muted-foreground text-xs">—</span>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="border-t border-border p-4 bg-surface flex items-center justify-between text-sm text-muted-foreground">
            <div>{meta ? `Showing ${(meta.page - 1) * meta.limit + 1}–${Math.min(meta.page * meta.limit, meta.total)} of ${meta.total}` : `Showing ${rows.length} records`}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!meta || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
              <span className="px-2 py-2">{meta ? `${meta.page} / ${meta.totalPages}` : '1 / 1'}</span>
              <Button variant="outline" size="sm" disabled={!meta || page >= meta.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
