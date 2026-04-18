'use client';

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
      size="sm"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-season-form"
            className="flex-1 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md text-sm hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
          >
            Add Season
          </button>
        </div>
      }
    >
      <form id="add-season-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Season Name
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all"
            placeholder="e.g., 2024 Winter Championship"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="startDate" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Start Date <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              id="startDate"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              End Date <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              id="endDate"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="numberOfRounds" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Number of Rounds
          </label>
          <input
            type="number"
            id="numberOfRounds"
            required
            min="1"
            value={formData.numberOfRounds}
            onChange={(e) => setFormData({ ...formData, numberOfRounds: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all"
          />
        </div>
      </form>
    </Modal>
  );
}

