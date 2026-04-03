'use client';

import { Users, Trophy, Flag, Shield, MapPin } from 'lucide-react';
import { Stats } from '@/types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  onClick?: () => void;
}

function StatCard({ title, value, icon: Icon, tone, onClick }: StatCardProps) {
  return (
    <div 
      className={`rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors ${
        onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            {title}
          </p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white leading-none">
            {value}
          </p>
        </div>
        <div className={`h-9 w-9 rounded-md border flex items-center justify-center flex-shrink-0 ${tone}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

interface StatsCardsProps {
  stats: Stats;
  onRoundsClick?: () => void;
  onDriversClick?: () => void;
  onDivisionsClick?: () => void;
  onTeamsClick?: () => void;
  onLocationsClick?: () => void;
}

export default function StatsCards({
  stats,
  onRoundsClick,
  onDriversClick,
  onDivisionsClick,
  onTeamsClick,
  onLocationsClick,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
      <StatCard
        title="Number of Rounds"
        value={stats.totalRounds}
        icon={Flag}
        tone="border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
        onClick={onRoundsClick}
      />
      <StatCard
        title="Total Registered Drivers"
        value={stats.totalDrivers}
        icon={Users}
        tone="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
        onClick={onDriversClick}
      />
      <StatCard
        title="Active Divisions"
        value={stats.activeDivisions}
        icon={Trophy}
        tone="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
        onClick={onDivisionsClick}
      />
      <StatCard
        title="Number of Teams"
        value={stats.totalTeams}
        icon={Shield}
        tone="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
        onClick={onTeamsClick}
      />
      <StatCard
        title="Number of Locations"
        value={stats.totalLocations}
        icon={MapPin}
        tone="border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
        onClick={onLocationsClick}
      />
    </div>
  );
}
