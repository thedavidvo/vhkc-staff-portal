'use client';

import { Users, Trophy } from 'lucide-react';
import { Stats } from '@/types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  onClick?: () => void;
}

function StatCard({ title, value, icon: Icon, gradient, onClick }: StatCardProps) {
  return (
    <div 
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all p-4 sm:p-6 border border-slate-200 dark:border-slate-700 ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
      onClick={onClick}
      style={onClick ? { minHeight: '44px' } : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-medium mb-1">
            {title}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
        <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${gradient}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

interface StatsCardsProps {
  stats: Stats;
  onDriversClick?: () => void;
  onDivisionsClick?: () => void;
}

export default function StatsCards({
  stats,
  onDriversClick,
  onDivisionsClick,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <StatCard
        title="Total Registered Drivers"
        value={stats.totalDrivers}
        icon={Users}
        gradient="bg-gradient-to-br from-primary-500 to-primary-600"
        onClick={onDriversClick}
      />
      <StatCard
        title="Active Divisions"
        value={stats.activeDivisions}
        icon={Trophy}
        gradient="bg-gradient-to-br from-amber-500 to-amber-600"
        onClick={onDivisionsClick}
      />
    </div>
  );
}

