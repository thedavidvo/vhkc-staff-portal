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
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 backdrop-blur-sm">
          <div className="px-5 py-5 md:px-6 md:py-6">
            <div className="max-w-[96%] mx-auto">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <Icon className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white leading-tight">
                      {title}
                    </h1>
                    {subtitle && (
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
                {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 md:px-6 md:py-6">
          <div className="max-w-[96%] mx-auto">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

