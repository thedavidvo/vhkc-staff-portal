'use client';

import { Users, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
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
      className={`card-modern p-6 border border-slate-200/50 dark:border-slate-700/50 group ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      style={onClick ? { minHeight: '44px' } : undefined}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2 transition-colors group-hover:text-slate-600 dark:group-hover:text-slate-300">
            {title}
          </p>
          <p className="text-3xl font-bold gradient-text-2">
            {value}
          </p>
        </div>
        <div className={`p-4 rounded-2xl flex-shrink-0 shadow-lg ${gradient} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <Icon className="w-6 h-6 text-white relative z-10" />
        </div>
      </div>
      {/* Subtle glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/10 to-blue-500/10 blur-xl"></div>
      </div>
    </div>
  );
}

interface StatsCardsProps {
  stats: Stats;
  onDriversClick?: () => void;
  onDivisionsClick?: () => void;
  onPromotionsClick?: () => void;
  onDemotionsClick?: () => void;
  promotionsCount?: number;
  demotionsCount?: number;
}

export default function StatsCards({
  stats,
  onDriversClick,
  onDivisionsClick,
  onPromotionsClick,
  onDemotionsClick,
  promotionsCount = 0,
  demotionsCount = 0,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Total Registered Drivers"
        value={stats.totalDrivers}
        icon={Users}
        gradient="bg-gradient-to-br from-primary-500 via-primary-600 to-blue-600"
        onClick={onDriversClick}
      />
      <StatCard
        title="Active Divisions"
        value={stats.activeDivisions}
        icon={Trophy}
        gradient="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600"
        onClick={onDivisionsClick}
      />
      <StatCard
        title="Drivers Promoted"
        value={promotionsCount}
        icon={TrendingUp}
        gradient="bg-gradient-to-br from-green-500 via-green-600 to-emerald-600"
        onClick={onPromotionsClick}
      />
      <StatCard
        title="Drivers Demoted"
        value={demotionsCount}
        icon={TrendingDown}
        gradient="bg-gradient-to-br from-red-500 via-red-600 to-rose-600"
        onClick={onDemotionsClick}
      />
    </div>
  );
}
