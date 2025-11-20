'use client';

import { ReactNode } from 'react';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function SectionCard({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
  className = '',
  noPadding = false,
}: SectionCardProps) {
  return (
    <div className={`glass rounded-3xl shadow-modern-lg border border-slate-200/50 dark:border-slate-700/50 flex flex-col ${className}`}>
      {(title || actions) && (
        <div className="p-6 pb-7 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-900/50 flex-shrink-0" style={{ overflow: 'visible' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                  <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
              )}
              <div style={{ overflow: 'visible', paddingBottom: '0.5rem' }}>
                {title && (
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-[1.7]">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      <div className={noPadding ? 'flex flex-col flex-1 min-h-0' : 'p-6'}>
        {children}
      </div>
    </div>
  );
}

