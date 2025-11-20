'use client';

import { X, TrendingUp, Check, XCircle } from 'lucide-react';
import { Promotion } from '@/types';
import Modal from '@/components/Modal';

interface PromotionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotions: Promotion[];
  onConfirm: (promotionId: string) => void;
  onDecline: (promotionId: string) => void;
}

export default function PromotionsModal({
  isOpen,
  onClose,
  promotions,
  onConfirm,
  onDecline,
}: PromotionsModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Drivers Promoted"
      subtitle="Review and confirm driver promotions"
      icon={TrendingUp}
      size="lg"
    >
          {promotions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              No promotions at this time.
            </div>
          ) : (
            <div className="space-y-4">
              {promotions.map((promotion) => (
                <div
                  key={promotion.driverId}
                  className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {promotion.driverName}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {promotion.fromDivision} → {promotion.toDivision}
                      </p>
                      {promotion.roundName && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          After: {promotion.roundName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(promotion.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onConfirm(promotion.driverId)}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Confirm
                    </button>
                    <button
                      onClick={() => onDecline(promotion.driverId)}
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

