'use client';

import Sidebar from '@/components/Sidebar';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 transition-all duration-300 w-full">
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
          {children}
        </div>
      </main>
    </div>
  );
}

