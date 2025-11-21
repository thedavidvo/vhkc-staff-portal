'use client';

import { Edit, Save, Loader2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Division, DriverStatus, Driver } from '@/types';
import Modal from '@/components/Modal';

interface EditDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver | null;
  onSave: (driver: Driver) => Promise<void>;
}

// Helper function to parse date string into day, month, year
const parseDate = (dateString: string | undefined): { day: number; month: number; year: number } => {
  if (!dateString) return { day: 0, month: 0, year: 0 };
  // Parse YYYY-MM-DD format directly to avoid timezone issues
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { day, month, year };
    }
  }
  // Fallback to Date parsing if format is different
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return { day: 0, month: 0, year: 0 };
  // Use UTC methods to avoid timezone shifts
  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
};

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

// Helper function to format status with normal casing
const formatStatus = (status: string): string => {
  return status.charAt(0) + status.slice(1).toLowerCase();
};

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

// Helper function to get status color
const getStatusColor = (status: DriverStatus) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    case 'INACTIVE':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    case 'BANNED':
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
  }
};

export default function EditDriverModal({
  isOpen,
  onClose,
  driver,
  onSave,
}: EditDriverModalProps) {
  const [formData, setFormData] = useState<Partial<Driver>>({});
  const [dateOfBirth, setDateOfBirth] = useState<{ day: number; month: number; year: number }>({ day: 0, month: 0, year: 0 });
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when driver changes
  useEffect(() => {
    if (driver) {
      // Ensure aliases array always has at least one empty field for editing
      const aliasesArray = driver.aliases && driver.aliases.length > 0 ? driver.aliases : [];
      setFormData({ 
        ...driver, 
        aliases: aliasesArray.length > 0 ? [...aliasesArray, ''] : [''] 
      });
      const parsedDate = parseDate(driver.dateOfBirth);
      setDateOfBirth(parsedDate);
    }
  }, [driver]);

  if (!isOpen || !driver) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!driver) return;

    try {
      setIsSaving(true);
      
      const dateString = combineDate(dateOfBirth.day, dateOfBirth.month, dateOfBirth.year);
      // Filter out empty aliases
      const validAliases = (formData.aliases || []).filter(a => a.trim() !== '');
      
      const updatedDriver: Driver = {
        ...driver,
        ...formData,
        dateOfBirth: dateString || formData.dateOfBirth,
        aliases: validAliases.length > 0 ? validAliases : undefined,
        lastUpdated: new Date().toISOString(),
      };
      
      await onSave(updatedDriver);
      onClose();
    } catch (error) {
      console.error('Failed to save driver:', error);
      alert('Failed to save driver. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Driver"
      subtitle={`Edit details for ${driver.name}`}
      icon={Edit}
      size="lg"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-driver-form"
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg hover:shadow-xl hover-lift flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="edit-driver-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={formData.firstName || driver.firstName || ''}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              placeholder="First Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={formData.lastName || driver.lastName || ''}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              placeholder="Last Name"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email || driver.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              placeholder="Email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Mobile Number
            </label>
            <input
              type="tel"
              value={formData.mobileNumber || driver.mobileNumber || ''}
              onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              placeholder="Mobile Number"
            />
          </div>
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
                value={dateOfBirth.day || ''}
                onChange={(e) => {
                  const day = parseInt(e.target.value) || 0;
                  setDateOfBirth({ ...dateOfBirth, day });
                }}
                className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                placeholder="DD"
              />
            </div>
            <div>
              <input
                type="number"
                min="1"
                max="12"
                value={dateOfBirth.month || ''}
                onChange={(e) => {
                  const month = parseInt(e.target.value) || 0;
                  setDateOfBirth({ ...dateOfBirth, month });
                }}
                className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                placeholder="MM"
              />
            </div>
            <div>
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={dateOfBirth.year || ''}
                onChange={(e) => {
                  const year = parseInt(e.target.value) || 0;
                  setDateOfBirth({ ...dateOfBirth, year });
                }}
                className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                placeholder="YYYY"
              />
            </div>
          </div>
          {(dateOfBirth.day && dateOfBirth.month && dateOfBirth.year) || driver.dateOfBirth ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Age: {calculateAge(combineDate(dateOfBirth.day, dateOfBirth.month, dateOfBirth.year) || driver.dateOfBirth) ?? 'N/A'} years old
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Division <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.division || driver.division}
            onChange={(e) => setFormData({ ...formData, division: e.target.value as Division })}
            className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
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
            Aliases
          </label>
          <div className="space-y-2">
            {(formData.aliases || ['']).map((alias, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={alias}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const currentAliases = formData.aliases || [''];
                      const trimmedValue = e.currentTarget.value.trim();
                      
                      // Always add new alias if current one has content and it's the last field
                      if (trimmedValue && index === currentAliases.length - 1) {
                        // Update the current alias value and add a new empty one
                        const newAliases = [...currentAliases];
                        newAliases[index] = trimmedValue;
                        newAliases.push('');
                        setFormData({ ...formData, aliases: newAliases });
                      } else if (trimmedValue && index < currentAliases.length - 1) {
                        // If it's not the last field, just update the current value
                        const newAliases = [...currentAliases];
                        newAliases[index] = trimmedValue;
                        setFormData({ ...formData, aliases: newAliases });
                      }
                    }
                  }}
                  onChange={(e) => {
                    const currentAliases = formData.aliases || [''];
                    const newAliases = [...currentAliases];
                    newAliases[index] = e.target.value;
                    setFormData({ ...formData, aliases: newAliases });
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  placeholder={`Alias ${index + 1}`}
                />
                {index < (formData.aliases || ['']).length - 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentAliases = formData.aliases || [''];
                      const newAliases = currentAliases.filter((_, i) => i !== index);
                      // Ensure at least one empty field remains
                      if (newAliases.length === 0) {
                        newAliases.push('');
                      }
                      setFormData({ ...formData, aliases: newAliases });
                    }}
                    className="px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const currentAliases = formData.aliases || [''];
                setFormData({ ...formData, aliases: [...currentAliases, ''] });
              }}
              className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
            >
              + Add Alias
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Press Enter on the last alias field to add another
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Home Track
          </label>
          <input
            type="text"
            value={formData.homeTrack || driver.homeTrack || ''}
            onChange={(e) => setFormData({ ...formData, homeTrack: e.target.value })}
            className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            placeholder="Home Track"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Team Name
          </label>
          <input
            type="text"
            value={formData.teamName || driver.teamName || ''}
            onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
            className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            placeholder="Team Name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Status <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            {(['ACTIVE', 'INACTIVE', 'BANNED'] as DriverStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFormData({ ...formData, status })}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                  (formData.status || driver.status) === status
                    ? getStatusColor(status) + ' ring-2 ring-offset-2 ring-slate-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {formatStatus(status)}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

