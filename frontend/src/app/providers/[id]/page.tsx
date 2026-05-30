'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { providerApi } from '@/lib/api';
import GrievanceCard from '@/components/GrievanceCard';
import { CheckCircle, MapPin, Globe, Phone, AlertTriangle } from 'lucide-react';

const SCORE_COLOR = (s: number) => s >= 8 ? 'text-red-600' : s >= 4 ? 'text-orange-500' : 'text-yellow-500';

export default function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: provider, isLoading: pLoading } = useQuery({
    queryKey: ['provider', id],
    queryFn: () => providerApi.getById(id).then((r) => r.data),
  });

  const { data: grievances, isLoading: gLoading } = useQuery({
    queryKey: ['provider-grievances', id],
    queryFn: () => providerApi.getGrievances(id).then((r) => r.data),
    enabled: !!provider,
  });

  if (pLoading) return <div className="text-center py-20 text-slate-400">Loading...</div>;
  if (!provider) return <div className="text-center py-20 text-slate-400">Provider not found.</div>;

  const score = Number(provider.score) || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Provider Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8">
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{provider.name}</h1>
              {provider.status === 'VERIFIED' && (
                <CheckCircle className="w-5 h-5 text-green-500" aria-label="Verified" />
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 mt-2 flex-wrap">
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{provider.service_area}</span>
              {(provider.city || provider.state) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[provider.city, provider.state].filter(Boolean).join(', ')}
                </span>
              )}
              {provider.website && (
                <a href={provider.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                  <Globe className="w-3.5 h-3.5" />
                  Website
                </a>
              )}
              {provider.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {provider.phone}
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 text-center min-w-[140px]">
            <div className={`text-4xl font-bold ${SCORE_COLOR(score)}`}>{score.toFixed(1)}</div>
            <div className="text-xs text-slate-500 mt-1">Risk Score</div>
            <div className="flex items-center justify-center gap-1 mt-3 text-sm text-slate-600">
              <AlertTriangle className="w-4 h-4" />
              {provider.grievance_count || 0} grievances
            </div>
            {provider.avg_severity > 0 && (
              <div className="text-xs text-slate-400 mt-1">avg severity {Number(provider.avg_severity).toFixed(1)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Grievances */}
      <h2 className="text-xl font-semibold mb-5">Grievances</h2>
      {gLoading ? (
        <div className="text-center py-10 text-slate-400">Loading grievances...</div>
      ) : grievances?.length === 0 ? (
        <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-slate-200">
          No approved grievances yet.
        </div>
      ) : (
        <div className="space-y-4">
          {grievances?.map((g: any) => <GrievanceCard key={g.id} grievance={g} />)}
        </div>
      )}
    </div>
  );
}
