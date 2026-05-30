import Link from 'next/link';
import { ShieldAlert, Search, MessageSquare, TrendingUp } from 'lucide-react';

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-red-900 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <ShieldAlert className="w-16 h-16 text-red-300" />
          </div>
          <h1 className="text-5xl font-bold mb-6">
            Your Voice Against Bad Service
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Grievora is a transparent platform to report and track grievances against legal service providers. Hold them accountable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/grievances/new"
              className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
            >
              Report a Grievance
            </Link>
            <Link
              href="/providers"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg border border-white/20 transition-colors"
            >
              Browse Providers
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: MessageSquare,
              title: 'Report via Chat',
              desc: 'Our guided chat collects your grievance step-by-step. Stay anonymous if you prefer.',
            },
            {
              icon: Search,
              title: 'Provider Identified',
              desc: 'We match your report to a verified provider profile using smart search and fuzzy matching.',
            },
            {
              icon: TrendingUp,
              title: 'Score & Rank',
              desc: 'Providers are ranked by grievance count, severity, and recency. Transparency at scale.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-red-50 p-3 rounded-xl">
                  <Icon className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="bg-amber-50 border-y border-amber-200 py-6 px-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-amber-800">
          <strong>Disclaimer:</strong> All content on Grievora is user-generated opinion and is reviewed by moderators before publication. Grievora does not verify the accuracy of individual claims.
        </div>
      </section>
    </div>
  );
}
