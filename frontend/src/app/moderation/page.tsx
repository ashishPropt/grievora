'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Check, X, Edit, AlertTriangle, ChevronDown } from 'lucide-react';
import { Grievance } from '@/types';
import Link from 'next/link';

export default function ModerationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: grievances, isLoading } = useQuery({
    queryKey: ['moderation-queue'],
    queryFn: () => moderationApi.listPending().then((r) => r.data),
    enabled: !!user && (user.role === 'MODERATOR' || user.role === 'ADMIN'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => moderationApi.approve(id),
    onSuccess: () => { toast.success('Approved'); qc.invalidateQueries({ queryKey: ['moderation-queue'] }); },
    onError: () => toast.error('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => moderationApi.reject(id, reason),
    onSuccess: () => {
      toast.success('Rejected');
      setRejectId(null);
      setRejectReason('');
      qc.invalidateQueries({ queryKey: ['moderation-queue'] });
    },
    onError: () => toast.error('Failed to reject'),
  });

  if (loading) return null;
  if (!user || (user.role !== 'MODERATOR' && user.role !== 'ADMIN')) {
    router.push('/');
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Moderation Queue</h1>
          <p className="text-slate-500 text-sm mt-1">Review and approve or reject pending grievances.</p>
        </div>
        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
          {grievances?.length || 0} pending
        </span>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading...</div>
      ) : grievances?.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
          Queue is empty. All caught up!
        </div>
      ) : (
        <div className="space-y-4">
          {grievances?.map((g: Grievance) => (
            <div key={g.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`severity-badge severity-${g.severity}`}>Severity {g.severity}</span>
                      {g.category && <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{g.category}</span>}
                      {g.provider_name && <span className="text-sm font-medium text-slate-700">{g.provider_name}</span>}
                      {g.llm_risk_score && g.llm_risk_score > 0.5 && (
                        <span className="flex items-center gap-1 bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          Risk {(g.llm_risk_score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">
                      {g.summary || g.raw_text?.substring(0, 300)}
                    </p>
                    {g.llm_flags && g.llm_flags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {g.llm_flags.map((f: string) => (
                          <span key={f} className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded-full">{f}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => approveMutation.mutate(g.id)}
                      disabled={approveMutation.isPending}
                      className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => { setRejectId(g.id); setRejectReason(''); }}
                      className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                    <Link
                      href={`/grievances/${g.id}`}
                      className="flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      View
                    </Link>
                  </div>
                </div>

                <button
                  onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                  className="flex items-center gap-1 text-xs text-slate-400 mt-3 hover:text-slate-600"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded === g.id ? 'rotate-180' : ''}`} />
                  {expanded === g.id ? 'Hide' : 'Show'} full text
                </button>
                {expanded === g.id && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {g.raw_text}
                  </div>
                )}
              </div>

              {rejectId === g.id && (
                <div className="border-t border-slate-200 p-4 bg-red-50">
                  <p className="text-sm font-medium text-red-800 mb-2">Reason for rejection (required):</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="e.g. Contains personal information, violates content policy..."
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => rejectMutation.mutate({ id: g.id, reason: rejectReason })}
                      disabled={!rejectReason.trim() || rejectMutation.isPending}
                      className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      Confirm Reject
                    </button>
                    <button onClick={() => setRejectId(null)} className="bg-white text-slate-600 px-4 py-1.5 rounded-lg text-sm border border-slate-200">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
