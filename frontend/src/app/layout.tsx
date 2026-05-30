import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Grievora — Report & Track Service Provider Grievances',
  description: 'A transparent platform to report and track grievances against service providers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <footer className="border-t border-slate-200 py-8 mt-16 text-center text-sm text-slate-500">
            <p>© {new Date().getFullYear()} Grievora. Content is user-generated opinion.</p>
            <p className="mt-1">
              <a href="#" className="hover:underline">Terms of Service</a>
              {' · '}
              <a href="#" className="hover:underline">Privacy Policy</a>
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
