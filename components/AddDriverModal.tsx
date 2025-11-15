'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { Division, DriverStatus } from '@/types';

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (driver: {
    firstName?: string;
    lastName?: string;
    name: string;
    aliases?: string[];
    email: string;
    division: Division;
    dateOfBirth?: string;
    homeTrack?: string;
    status: DriverStatus;
  }) => void;
}

// Helper function to combine day, month, year into date string
const combineDate = (day: number, month: number, year: number): string => {
  if (!day || !month || !year) return '';
  // Use UTC to avoid timezone issues
  const date = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(date.getTime())) return '';
  // Format as YYYY-MM-DD using UTC to avoid timezone shifts
  const yearStr = date.getUTCFullYear().toString();
  const monthStr = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const dayStr = date.getUTCDate().toString().padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
};

// Helper function to format status with normal casing
const formatStatus = (status: string): string => {
  return status.charAt(0) + status.slice(1).toLowerCase();
};

// Helper function to calculate age from date of birth
const calculateAge = (dateOfBirth: string | undefined): number | null => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export default function AddDriverModal({
  isOpen,
  onClose,
  onAdd,
}: AddDriverModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    aliases: [''], // Support multiple aliases
    email: '',
    division: 'Division 4' as Division,
    dateOfBirth: { day: 0, month: 0, year: 0 },
    homeTrack: '',
    status: 'ACTIVE' as DriverStatus,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine first and last name into name
    const driverName = `${formData.firstName} ${formData.lastName}`.trim();
    if (!driverName) {
      alert('Please provide first and last name');
      return;
    }

    const dateString = combineDate(formData.dateOfBirth.day, formData.dateOfBirth.month, formData.dateOfBirth.year);
    
    // Filter out empty aliases
    const validAliases = formData.aliases.filter(a => a.trim() !== '');
    
    onAdd({
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      name: driverName,
      aliases: validAliases.length > 0 ? validAliases : undefined,
      email: formData.email,
      division: formData.division,
      dateOfBirth: dateString || undefined,
      homeTrack: formData.homeTrack || undefined,
      status: formData.status,
    });
    
    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      aliases: [''],
      email: '',
      division: 'Division 4',
      dateOfBirth: { day: 0, month: 0, year: 0 },
      homeTrack: '',
      status: 'ACTIVE',
    });
    onClose();
  };

  const dateString = combineDate(formData.dateOfBirth.day, formData.dateOfBirth.month, formData.dateOfBirth.year);
  const age = calculateAge(dateString);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Add New Driver
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="First Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Last Name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Aliases <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">(optional)</span>
            </label>
            <div className="space-y-2">
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
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={`Alias ${index + 1}`}
                  />
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newAliases = formData.aliases.filter((_, i) => i !== index);
                        setFormData({ ...formData, aliases: newAliases });
                      }}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, aliases: [...formData.aliases, ''] });
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                + Add Another Alias
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="driver@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Date of Birth
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dateOfBirth.day || ''}
                  onChange={(e) => {
                    const day = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, dateOfBirth: { ...formData.dateOfBirth, day } });
                  }}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="DD"
                />
              </div>
              <div>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.dateOfBirth.month || ''}
                  onChange={(e) => {
                    const month = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, dateOfBirth: { ...formData.dateOfBirth, month } });
                  }}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="MM"
                />
              </div>
              <div>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.dateOfBirth.year || ''}
                  onChange={(e) => {
                    const year = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, dateOfBirth: { ...formData.dateOfBirth, year } });
                  }}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="YYYY"
                />
              </div>
            </div>
            {age !== null && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Age: {age} years old
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Division
            </label>
            <select
              required
              value={formData.division}
              onChange={(e) => setFormData({ ...formData, division: e.target.value as Division })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Division 1">Division 1</option>
              <option value="Division 2">Division 2</option>
              <option value="Division 3">Division 3</option>
              <option value="Division 4">Division 4</option>
              <option value="New">New</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Home Track
            </label>
            <input
              type="text"
              value={formData.homeTrack}
              onChange={(e) => setFormData({ ...formData, homeTrack: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Home Track (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Status
            </label>
            <div className="flex gap-2">
              {(['ACTIVE', 'INACTIVE', 'BANNED'] as DriverStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFormData({ ...formData, status })}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    formData.status === status
                      ? status === 'ACTIVE'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 ring-2 ring-offset-2 ring-green-400'
                        : status === 'INACTIVE'
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 ring-2 ring-offset-2 ring-yellow-400'
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 ring-2 ring-offset-2 ring-red-400'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {formatStatus(status)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-md"
            >
              Add Driver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
