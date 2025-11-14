'use client';

import { X, TrendingDown, Check, XCircle } from 'lucide-react';
import { Promotion } from '@/types';

interface DemotionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  demotions: Promotion[];
  onConfirm: (demotionId: string) => void;
  onDecline: (demotionId: string) => void;
}

export default function DemotionsModal({
  isOpen,
  onClose,
  demotions,
  onConfirm,
  onDecline,
}: DemotionsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Drivers Demoted
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          {demotions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              No demotions at this time.
            </div>
          ) : (
            <div className="space-y-4">
              {demotions.map((demotion) => (
                <div
                  key={demotion.driverId}
                  className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {demotion.driverName}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {demotion.fromDivision} → {demotion.toDivision}
                      </p>
                      {demotion.roundName && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          After: {demotion.roundName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(demotion.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onConfirm(demotion.driverId)}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Confirm
                    </button>
                    <button
                      onClick={() => onDecline(demotion.driverId)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


