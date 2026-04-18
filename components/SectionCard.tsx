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
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col ${className}`}>
      {(title || actions) && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                  <Icon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                </div>
              )}
              <div>
                {title && (
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      )}
      <div className={noPadding ? 'flex flex-col flex-1 min-h-0' : 'p-4'}>
        {children}
      </div>
    </div>
  );
}

