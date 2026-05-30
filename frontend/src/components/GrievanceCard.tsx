import Link from 'next/link';
import { Grievance } from '@/types';
import { Calendar, User, Tag } from 'lucide-react';

const SEVERITY_LABELS = ['', 'Minor', 'Moderate', 'Significant', 'Serious', 'Severe'];

export default function GrievanceCard({ grievance, showProvider = false }: { grievance: Grievance; showProvider?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`severity-badge severity-${grievance.severity}`}>
            Severity {grievance.severity} — {SEVERITY_LABELS[grievance.severity]}
          </span>
          {grievance.category && (
            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
              <Tag className="w-3 h-3" />
              {grievance.category}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap">
          {new Date(grievance.created_at).toLocaleDateString()}
        </span>
      </div>

      {showProvider && grievance.provider_name && (
        <p className="text-sm font-medium text-slate-700 mb-1">{grievance.provider_name}</p>
      )}

      <p className="text-sm text-slate-700 leading-relaxed">
        {grievance.summary || 'No summary available.'}
      </p>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {grievance.is_anonymous || !grievance.submitter_username ? 'Anonymous' : grievance.submitter_username}
        </span>
        {grievance.incident_date && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Incident: {new Date(grievance.incident_date).toLocaleDateString()}
          </span>
        )}
        <Link href={`/grievances/${grievance.id}`} className="ml-auto text-red-600 hover:underline">
          View details
        </Link>
      </div>
    </div>
  );
}
