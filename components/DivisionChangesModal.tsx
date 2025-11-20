'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Loader2, Calendar } from 'lucide-react';
import Modal from '@/components/Modal';
import { Division } from '@/types';

interface DivisionChange {
  id: string;
  seasonId: string;
  roundId: string;
  driverId: string;
  driverName: string;
  fromDivision: Division;
  toDivision: Division;
  changeType: 'promotion' | 'demotion';
  createdAt: string;
}

interface DivisionChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'promotions' | 'demotions';
  changes: DivisionChange[];
  rounds?: any[];
  loading?: boolean;
}

// Helper function to get division color
const getDivisionColor = (division: Division) => {
  switch (division) {
    case 'Division 1':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    case 'Division 2':
      return 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200';
    case 'Division 3':
      return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
    case 'Division 4':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    case 'New':
      return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
  }
};

export default function DivisionChangesModal({
  isOpen,
  onClose,
  type,
  changes,
  rounds = [],
  loading = false,
}: DivisionChangesModalProps) {
  const [selectedRound, setSelectedRound] = useState<string>('all');
  
  // Filter changes by selected round
  const filteredChanges = selectedRound === 'all' 
    ? changes 
    : changes.filter(c => c.roundId === selectedRound);

  // Get round name helper
  const getRoundName = (roundId: string) => {
    const round = rounds.find((r: any) => r.id === roundId);
    return round ? `Round ${round.roundNumber} - ${round.location || round.name}` : 'Unknown Round';
  };

  const isPromotions = type === 'promotions';
  const title = isPromotions ? 'Driver Promotions' : 'Driver Demotions';
  const subtitle = isPromotions 
    ? `View all drivers who have been promoted this season` 
    : `View all drivers who have been demoted this season`;
  const Icon = isPromotions ? TrendingUp : TrendingDown;
  const borderColor = isPromotions 
    ? 'border-green-200 dark:border-green-800' 
    : 'border-red-200 dark:border-red-800';
  const bgColor = isPromotions 
    ? 'bg-green-50 dark:bg-green-900/10' 
    : 'bg-red-50 dark:bg-red-900/10';
  const iconColor = isPromotions 
    ? 'text-green-600 dark:text-green-400' 
    : 'text-red-600 dark:text-red-400';

  // Get unique rounds from changes
  const uniqueRounds = Array.from(new Set(changes.map(c => c.roundId)))
    .map(roundId => rounds.find((r: any) => r.id === roundId))
    .filter(Boolean)
    .sort((a: any, b: any) => (a.roundNumber || 0) - (b.roundNumber || 0));

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={Icon}
      size="lg"
    >
      <div className="space-y-4">
        {/* Round Filter */}
        {uniqueRounds.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Filter by Round:
            </label>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Rounds ({changes.length})</option>
              {uniqueRounds.map((round: any) => {
                const count = changes.filter(c => c.roundId === round.id).length;
                return (
                  <option key={round.id} value={round.id}>
                    Round {round.roundNumber} - {round.location || round.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Changes List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : filteredChanges.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            {selectedRound === 'all' 
              ? `No ${isPromotions ? 'promotions' : 'demotions'} this season`
              : `No ${isPromotions ? 'promotions' : 'demotions'} for this round`}
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredChanges.map((change) => (
              <div
                key={change.id}
                className={`p-3 rounded-lg border ${borderColor} ${bgColor} transition-all hover:shadow-md`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <Icon className={`w-4 h-4 ${iconColor} flex-shrink-0`} />
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {change.driverName}
                    </h3>
                    <span className="text-slate-400 text-sm">•</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${getDivisionColor(change.fromDivision)}`}>
                      {change.fromDivision}
                    </span>
                    <span className="text-slate-400 text-sm">→</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${getDivisionColor(change.toDivision)}`}>
                      {change.toDivision}
                    </span>
                  </div>
                  {rounds.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      <span className="whitespace-nowrap">{getRoundName(change.roundId)}</span>
                      {change.createdAt && (
                        <>
                          <span>•</span>
                          <span className="whitespace-nowrap">{new Date(change.createdAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {filteredChanges.length > 0 && (
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Total {isPromotions ? 'Promotions' : 'Demotions'}:
              </span>
              <span className="font-bold text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800 px-2.5 py-1 rounded">
                {filteredChanges.length}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

