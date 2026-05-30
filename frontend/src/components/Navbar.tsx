'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { ShieldAlert, User, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-red-600">
            <ShieldAlert className="w-6 h-6" />
            Grievora
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/providers" className="text-slate-600 hover:text-slate-900 text-sm font-medium">
              Browse Providers
            </Link>
            <Link
              href="/grievances/new"
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Report Grievance
            </Link>
            {user ? (
              <>
                {(user.role === 'MODERATOR' || user.role === 'ADMIN') && (
                  <Link href="/moderation" className="text-slate-600 hover:text-slate-900 text-sm font-medium">
                    Moderation
                  </Link>
                )}
                <Link href="/profile" className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm">
                  <User className="w-4 h-4" />
                  {user.username}
                  <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">{user.points}pts</span>
                </Link>
                <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-slate-600 hover:text-slate-900 text-sm font-medium">Login</Link>
                <Link href="/register" className="border border-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
                  Sign up
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-3">
          <Link href="/providers" className="block text-sm font-medium" onClick={() => setOpen(false)}>Browse Providers</Link>
          <Link href="/grievances/new" className="block text-sm font-medium text-red-600" onClick={() => setOpen(false)}>Report Grievance</Link>
          {user ? (
            <>
              <Link href="/profile" className="block text-sm" onClick={() => setOpen(false)}>{user.username} ({user.points} pts)</Link>
              {(user.role === 'MODERATOR' || user.role === 'ADMIN') && (
                <Link href="/moderation" className="block text-sm" onClick={() => setOpen(false)}>Moderation</Link>
              )}
              <button onClick={handleLogout} className="block text-sm text-red-600">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="block text-sm" onClick={() => setOpen(false)}>Login</Link>
              <Link href="/register" className="block text-sm" onClick={() => setOpen(false)}>Sign up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
