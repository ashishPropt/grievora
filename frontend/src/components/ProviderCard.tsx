import Link from 'next/link';
import { MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { Provider } from '@/types';

const SCORE_COLOR = (score: number) => {
  if (score >= 8) return 'text-red-600';
  if (score >= 4) return 'text-orange-500';
  return 'text-yellow-500';
};

export default function ProviderCard({ provider }: { provider: Provider }) {
  const score = Number(provider.score) || 0;
  return (
    <Link href={`/providers/${provider.id}`} className="block bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 truncate">{provider.name}</h3>
            {provider.status === 'VERIFIED' && (
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" aria-label="Verified provider" />
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            {[provider.city, provider.state].filter(Boolean).join(', ') || 'Location unknown'}
          </div>
          <div className="mt-2">
            <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
              {provider.service_area}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`text-2xl font-bold ${SCORE_COLOR(score)}`}>{score.toFixed(1)}</div>
          <div className="text-xs text-slate-400">risk score</div>
          <div className="flex items-center gap-1 mt-1 justify-end text-slate-500 text-xs">
            <AlertTriangle className="w-3 h-3" />
            {provider.grievance_count || 0} grievances
          </div>
        </div>
      </div>
    </Link>
  );
}
