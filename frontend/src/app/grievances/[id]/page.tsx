'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { grievanceApi } from '@/lib/api';
import { Calendar, User, Tag, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const STATUS_STYLES = {
  APPROVED: 'bg-green-100 text-green-800',
  PENDING_MODERATION: 'bg-yellow-100 text-yellow-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const SEVERITY_LABELS = ['', 'Minor', 'Moderate', 'Significant', 'Serious', 'Severe'];

export default function GrievancePage() {
  const { id } = useParams<{ id: string }>();
  const { data: grievance, isLoading, error } = useQuery({
    queryKey: ['grievance', id],
    queryFn: () => grievanceApi.getById(id).then((r) => r.data),
  });

  if (isLoading) return <div className="text-center py-20 text-slate-400">Loading...</div>;
  if (error || !grievance) return <div className="text-center py-20 text-slate-400">Grievance not found or not available.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-5">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[grievance.status as keyof typeof STATUS_STYLES]}`}>
            {grievance.status.replace('_', ' ')}
          </span>
          <span className={`severity-badge severity-${grievance.severity}`}>
            Severity {grievance.severity} — {SEVERITY_LABELS[grievance.severity]}
          </span>
        </div>

        {grievance.provider_name && (
          <div className="mb-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Provider</p>
            {grievance.provider_id ? (
              <Link href={`/providers/${grievance.provider_id}`} className="text-lg font-semibold text-red-600 hover:underline">
                {grievance.provider_name}
              </Link>
            ) : (
              <p className="text-lg font-semibold">{grievance.provider_name}</p>
            )}
          </div>
        )}

        <div className="mb-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Summary</p>
          <p className="text-slate-800 leading-relaxed">{grievance.summary || 'No summary available.'}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100 my-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <User className="w-4 h-4" />
            {grievance.is_anonymous || !grievance.submitter_username ? 'Anonymous' : grievance.submitter_username}
          </div>
          {grievance.incident_date && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" />
              {new Date(grievance.incident_date).toLocaleDateString()}
            </div>
          )}
          {grievance.category && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Tag className="w-4 h-4" />
              {grievance.category}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <AlertTriangle className="w-4 h-4" />
            {grievance.service_area}
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Submitted {new Date(grievance.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
