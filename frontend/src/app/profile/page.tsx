'use client';
import { useQuery } from '@tanstack/react-query';
import { grievanceApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import GrievanceCard from '@/components/GrievanceCard';
import { User, Star, FileText } from 'lucide-react';

const STATUS_STYLES = {
  APPROVED: 'bg-green-100 text-green-800',
  PENDING_MODERATION: 'bg-yellow-100 text-yellow-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const { data: myGrievances } = useQuery({
    queryKey: ['my-grievances'],
    queryFn: () => grievanceApi.myList().then((r) => r.data),
    enabled: !!user,
  });

  if (loading) return null;
  if (!user) { router.push('/login'); return null; }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8">
        <div className="flex items-center gap-5">
          <div className="bg-red-100 rounded-full p-5">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.username}</h1>
            {user.email && <p className="text-slate-500 text-sm">{user.email}</p>}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-amber-600">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-semibold">{user.points}</span>
                <span className="text-sm text-slate-400">points earned</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <FileText className="w-4 h-4" />
                <span className="font-medium">{myGrievances?.length || 0}</span>
                <span className="text-sm">grievances filed</span>
              </div>
              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full">{user.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grievance history */}
      <h2 className="text-xl font-semibold mb-5">My Grievances</h2>
      {!myGrievances?.length ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
          You haven&apos;t filed any grievances yet.
        </div>
      ) : (
        <div className="space-y-4">
          {myGrievances.map((g: any) => (
            <div key={g.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[g.status as keyof typeof STATUS_STYLES]}`}>
                  {g.status.replace('_', ' ')}
                </span>
              </div>
              <GrievanceCard grievance={g} showProvider />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
