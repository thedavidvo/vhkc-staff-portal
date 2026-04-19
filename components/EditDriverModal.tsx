'use client';

import { Loader2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Division, DriverStatus, Driver } from '@/types';
import Modal from '@/components/Modal';
import { useSeason } from '@/components/SeasonContext';
import { getSeasonNumber, getDivisionsForSeason, isClosedDivision, getDivisionColor } from '@/lib/divisions';

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
  const { selectedSeason } = useSeason();
  const seasonNumber = getSeasonNumber(selectedSeason);
  const allDivisionsForSeason = getDivisionsForSeason(seasonNumber);
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

  const inputCls = 'w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all';
  const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Driver"
      size="md"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-driver-form"
            disabled={isSaving}
            className="flex-1 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md text-sm hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
            ) : 'Save Changes'}
          </button>
        </div>
      }
    >
      <form id="edit-driver-form" onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>First Name</label>
            <input
              type="text"
              value={formData.firstName || driver.firstName || ''}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className={inputCls}
              placeholder="First Name"
            />
          </div>
          <div>
            <label className={labelCls}>Last Name</label>
            <input
              type="text"
              value={formData.lastName || driver.lastName || ''}
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
              value={formData.email || driver.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputCls}
              placeholder="Email"
            />
          </div>
          <div>
            <label className={labelCls}>Mobile <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="tel"
              value={formData.mobileNumber || driver.mobileNumber || ''}
              onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
              className={inputCls}
              placeholder="Mobile Number"
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
              value={dateOfBirth.day || ''}
              onChange={(e) => setDateOfBirth({ ...dateOfBirth, day: parseInt(e.target.value) || 0 })}
              className={inputCls}
              placeholder="DD"
            />
            <input
              type="number"
              min="1"
              max="12"
              value={dateOfBirth.month || ''}
              onChange={(e) => setDateOfBirth({ ...dateOfBirth, month: parseInt(e.target.value) || 0 })}
              className={inputCls}
              placeholder="MM"
            />
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={dateOfBirth.year || ''}
              onChange={(e) => setDateOfBirth({ ...dateOfBirth, year: parseInt(e.target.value) || 0 })}
              className={inputCls}
              placeholder="YYYY"
            />
          </div>
          {((dateOfBirth.day && dateOfBirth.month && dateOfBirth.year) || driver.dateOfBirth) ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Age: {calculateAge(combineDate(dateOfBirth.day, dateOfBirth.month, dateOfBirth.year) || driver.dateOfBirth) ?? 'N/A'}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Division</label>
            <select
              required
              value={formData.division || driver.division}
              onChange={(e) => setFormData({ ...formData, division: e.target.value as Division })}
              className={inputCls}
            >
              {/* Always show the driver's current division even if it's no longer available (e.g. legacy Division 4) */}
              {driver.division && !allDivisionsForSeason.includes(driver.division) && (
                <option value={driver.division}>{driver.division} (legacy)</option>
              )}
              {allDivisionsForSeason.map((div) => (
                <option
                  key={div}
                  value={div}
                  disabled={isClosedDivision(div, seasonNumber)}
                >
                  {div}{isClosedDivision(div, seasonNumber) ? ' (closed)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Home Track <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={formData.homeTrack || driver.homeTrack || ''}
              onChange={(e) => setFormData({ ...formData, homeTrack: e.target.value })}
              className={inputCls}
              placeholder="Home Track"
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Team Name <span className="text-slate-400 font-normal">(optional)</span></label>
          <input
            type="text"
            value={formData.teamName || driver.teamName || ''}
            onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
            className={inputCls}
            placeholder="Team Name"
          />
        </div>

        <div>
          <label className={labelCls}>Aliases <span className="text-slate-400 font-normal">(optional)</span></label>
          <div className="space-y-1.5">
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
                      if (trimmedValue && index === currentAliases.length - 1) {
                        const newAliases = [...currentAliases];
                        newAliases[index] = trimmedValue;
                        newAliases.push('');
                        setFormData({ ...formData, aliases: newAliases });
                      } else if (trimmedValue && index < currentAliases.length - 1) {
                        const newAliases = [...currentAliases];
                        newAliases[index] = trimmedValue;
                        setFormData({ ...formData, aliases: newAliases });
                      }
                    }
                  }}
                  onChange={(e) => {
                    const newAliases = [...(formData.aliases || [''])];
                    newAliases[index] = e.target.value;
                    setFormData({ ...formData, aliases: newAliases });
                  }}
                  className={`flex-1 ${inputCls}`}
                  placeholder={`Alias ${index + 1}`}
                />
                {index < (formData.aliases || ['']).length - 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newAliases = (formData.aliases || ['']).filter((_, i) => i !== index);
                      setFormData({ ...formData, aliases: newAliases.length ? newAliases : [''] });
                    }}
                    className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, aliases: [...(formData.aliases || ['']), ''] })}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              + Add Alias
            </button>
          </div>
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
          <label className={labelCls}>Status</label>
          <div className="flex gap-2">
            {(['ACTIVE', 'INACTIVE', 'BANNED'] as DriverStatus[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFormData({ ...formData, status })}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                  (formData.status || driver.status) === status
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

