'use client';

import { X, Calendar, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import Modal from '@/components/Modal';

interface AddSeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (season: {
    name: string;
    startDate: string;
    endDate: string;
    numberOfRounds: number;
  }) => void;
}

export default function AddSeasonModal({
  isOpen,
  onClose,
  onAdd,
}: AddSeasonModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    numberOfRounds: 1,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate dates only if both are provided
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        alert('End date must be after start date');
        return;
      }
    }

    if (formData.numberOfRounds < 1) {
      alert('Number of rounds must be at least 1');
      return;
    }

    onAdd(formData);
    setFormData({ name: '', startDate: '', endDate: '', numberOfRounds: 1 });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Season"
      subtitle="Create a new racing season"
      icon={Calendar}
      size="md"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-season-form"
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg hover:shadow-xl hover-lift flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Add Season
          </button>
        </div>
      }
    >
      <form id="add-season-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Season Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              placeholder="e.g., 2024 Winter Championship"
            />
          </div>

          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Start Date <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">(optional)</span>
            </label>
            <input
              type="date"
              id="startDate"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              End Date <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">(optional)</span>
            </label>
            <input
              type="date"
              id="endDate"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="numberOfRounds"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Number of Rounds
            </label>
            <input
              type="number"
              id="numberOfRounds"
              required
              min="1"
              value={formData.numberOfRounds}
              onChange={(e) => setFormData({ ...formData, numberOfRounds: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>
        </form>
    </Modal>
  );
}

