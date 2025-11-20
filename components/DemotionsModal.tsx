'use client';

import { X, TrendingDown, Check, XCircle } from 'lucide-react';
import { Promotion } from '@/types';
import Modal from '@/components/Modal';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Drivers Demoted"
      subtitle="Review and confirm driver demotions"
      icon={TrendingDown}
      size="lg"
    >
          {demotions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              No demotions at this time.
            </div>
          ) : (
            <div className="space-y-4">
              {demotions.map((demotion) => (
                <div
                  key={demotion.driverId}
                  className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
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
    </Modal>
  );
}


