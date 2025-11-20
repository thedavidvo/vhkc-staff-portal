'use client';

import { ReactNode } from 'react';
import Header from '@/components/Header';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  headerActions?: ReactNode;
  children: ReactNode;
  hideHeader?: boolean;
}

export default function PageLayout({
  title,
  subtitle,
  icon: Icon,
  headerActions,
  children,
  hideHeader = false,
}: PageLayoutProps) {
  return (
    <>
      {!hideHeader && <Header hideSearch />}
      <div className="min-h-screen">
        {/* Hero Header Section */}
        <div className="relative bg-gradient-to-br from-primary-500/10 via-blue-500/5 to-purple-500/10 dark:from-primary-500/20 dark:via-blue-500/10 dark:to-purple-500/20 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2MGE1ZmEiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40 overflow-hidden"></div>
          <div className="relative z-10 px-6 pt-8 pb-10 md:pt-10 md:pb-12">
            <div className="max-w-[95%] mx-auto">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {Icon && (
                    <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div style={{ overflow: 'visible', paddingBottom: '0.75rem' }}>
                    <h1 className="text-4xl md:text-5xl font-extrabold gradient-text-2 mb-2 animate-fadeIn leading-[1.6]">
                      {title}
                    </h1>
                    {subtitle && (
                      <p className="text-slate-600 dark:text-slate-400 text-lg">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
                {headerActions && (
                  <div className="flex items-center gap-3">
                    {headerActions}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="px-6 py-8">
          <div className="max-w-[95%] mx-auto">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

