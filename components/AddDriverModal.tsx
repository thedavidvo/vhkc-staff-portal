'use client';

import { useState } from 'react';
import { Division, DriverStatus } from '@/types';
import Modal from '@/components/Modal';
import { useSeason } from '@/components/SeasonContext';
import { getSeasonNumber, getDivisionsForSeason, isNewDivisionStructure } from '@/lib/divisions';

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (driver: {
    firstName?: string;
    lastName?: string;
    name: string;
    aliases?: string[];
    email: string;
    mobileNumber?: string;
    division: Division;
    dateOfBirth?: string;
    homeTrack?: string;
    status: DriverStatus;
  }) => void;
}

const combineDate = (day: number, month: number, year: number): string => {
  if (!day || !month || !year) return '';
  const date = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(date.getTime())) return '';
  const yearStr = date.getUTCFullYear().toString();
  const monthStr = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const dayStr = date.getUTCDate().toString().padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
};

const calculateAge = (dateOfBirth: string | undefined): number | null => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

export default function AddDriverModal({ isOpen, onClose, onAdd }: AddDriverModalProps) {
  const { selectedSeason } = useSeason();
  const seasonNumber = getSeasonNumber(selectedSeason);
  const defaultDivision: Division = isNewDivisionStructure(seasonNumber) ? 'Rookies' : 'Division 4';
  const availableDivisions = getDivisionsForSeason(seasonNumber);

  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    aliases: string[];
    email: string;
    mobileNumber: string;
    division: Division;
    dateOfBirth: { day: number; month: number; year: number };
    homeTrack: string;
    status: DriverStatus;
  }>({
    firstName: '',
    lastName: '',
    aliases: [''],
    email: '',
    mobileNumber: '',
    division: defaultDivision,
    dateOfBirth: { day: 0, month: 0, year: 0 },
    homeTrack: '',
    status: 'ACTIVE' as DriverStatus,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const driverName = `${formData.firstName} ${formData.lastName}`.trim();
    if (!driverName) {
      alert('Please provide first and last name');
      return;
    }
    const dateString = combineDate(formData.dateOfBirth.day, formData.dateOfBirth.month, formData.dateOfBirth.year);
    const validAliases = formData.aliases.filter(a => a.trim() !== '');
    onAdd({
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      name: driverName,
      aliases: validAliases.length > 0 ? validAliases : undefined,
      email: formData.email,
      mobileNumber: formData.mobileNumber || undefined,
      division: formData.division,
      dateOfBirth: dateString || undefined,
      homeTrack: formData.homeTrack || undefined,
      status: formData.status,
    });
    setFormData({
      firstName: '',
      lastName: '',
      aliases: [''],
      email: '',
      mobileNumber: '',
      division: defaultDivision,
      dateOfBirth: { day: 0, month: 0, year: 0 },
      homeTrack: '',
      status: 'ACTIVE',
    });
    onClose();
  };

  const dateString = combineDate(formData.dateOfBirth.day, formData.dateOfBirth.month, formData.dateOfBirth.year);
  const age = calculateAge(dateString);

  const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all';
  const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Driver"
      size="md"
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
            form="add-driver-form"
            className="flex-1 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md text-sm hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
          >
            Add Driver
          </button>
        </div>
      }
    >
      <form id="add-driver-form" onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className={inputCls}
              placeholder="First Name"
            />
          </div>
          <div>
            <label className={labelCls}>Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className={inputCls}
              placeholder="Last Name"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputCls}
              placeholder="driver@example.com"
            />
          </div>
          <div>
            <label className={labelCls}>Mobile <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="tel"
              value={formData.mobileNumber}
              onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
              className={inputCls}
              placeholder="+1234567890"
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Date of Birth <span className="text-slate-400 font-normal">(optional)</span></label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              min="1"
              max="31"
              value={formData.dateOfBirth.day || ''}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: { ...formData.dateOfBirth, day: parseInt(e.target.value) || 0 } })}
              className={inputCls}
              placeholder="DD"
            />
            <input
              type="number"
              min="1"
              max="12"
              value={formData.dateOfBirth.month || ''}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: { ...formData.dateOfBirth, month: parseInt(e.target.value) || 0 } })}
              className={inputCls}
              placeholder="MM"
            />
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={formData.dateOfBirth.year || ''}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: { ...formData.dateOfBirth, year: parseInt(e.target.value) || 0 } })}
              className={inputCls}
              placeholder="YYYY"
            />
          </div>
          {age !== null && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Age: {age}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Division</label>
            <select
              required
              value={formData.division}
              onChange={(e) => setFormData({ ...formData, division: e.target.value as Division })}
              className={inputCls}
            >
              {availableDivisions.map((div) => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Home Track <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={formData.homeTrack}
              onChange={(e) => setFormData({ ...formData, homeTrack: e.target.value })}
              className={inputCls}
              placeholder="Home Track"
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Aliases <span className="text-slate-400 font-normal">(optional)</span></label>
          <div className="space-y-1.5">
            {formData.aliases.map((alias, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => {
                    const newAliases = [...formData.aliases];
                    newAliases[index] = e.target.value;
                    setFormData({ ...formData, aliases: newAliases });
                  }}
                  className={`flex-1 ${inputCls}`}
                  placeholder={`Alias ${index + 1}`}
                />
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, aliases: formData.aliases.filter((_, i) => i !== index) })}
                    className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, aliases: [...formData.aliases, ''] })}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              + Add Alias
            </button>
          </div>
        </div>

        <div>
          <label className={labelCls}>Status</label>
          <div className="flex gap-2">
            {(['ACTIVE', 'INACTIVE', 'BANNED'] as DriverStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFormData({ ...formData, status })}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                  formData.status === status
                    ? status === 'ACTIVE'
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700'
                      : status === 'INACTIVE'
                      ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
                      : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

