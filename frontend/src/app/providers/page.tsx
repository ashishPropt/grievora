'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { providerApi } from '@/lib/api';
import ProviderCard from '@/components/ProviderCard';
import { Search, SlidersHorizontal } from 'lucide-react';

export default function ProvidersPage() {
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [sort, setSort] = useState('score');
  const [search, setSearch] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['providers', search],
    queryFn: () => providerApi.list(search).then((r) => r.data),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const p: Record<string, string> = { sort };
    if (q) p.q = q;
    if (city) p.city = city;
    if (state) p.state = state;
    setSearch(p);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Browse Providers</h1>
        <p className="text-slate-500 mt-2">Search and sort legal service providers by grievance score.</p>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-slate-200 p-5 mb-8">
        <div className="grid sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Provider name..."
              className="w-full pl-9 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <input
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="State (e.g. NY)"
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <SlidersHorizontal className="w-4 h-4" />
            Sort by:
          </div>
          {[['score', 'Risk Score'], ['grievances', 'Most Grievances'], ['severity', 'Highest Severity'], ['name', 'Name']].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setSort(val)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${sort === val ? 'bg-red-600 text-white border-red-600' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
          <button
            type="submit"
            className="ml-auto bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="text-center text-slate-400 py-20">Loading...</div>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-4">{data?.total || 0} providers found</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.providers?.map((p: any) => <ProviderCard key={p.id} provider={p} />)}
          </div>
          {(!data?.providers?.length) && (
            <div className="text-center py-16 text-slate-400">
              No providers found. Try adjusting your search.
            </div>
          )}
        </>
      )}
    </div>
  );
}
