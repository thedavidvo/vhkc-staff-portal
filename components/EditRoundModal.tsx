'use client';

import { useState, useEffect } from 'react';
import { Round } from '@/types';
import Modal from '@/components/Modal';

interface Location {
  id: string;
  name: string;
  address: string;
}

interface EditRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: Round | null;
  seasonId: string;
  locations: Location[];
  locationsWithAddress?: Location[];
  onSave: (round: Round) => Promise<void>;
  onLocationAdded?: (locationName: string, address: string) => Promise<void>;
}

export default function EditRoundModal({
  isOpen,
  onClose,
  round,
  seasonId,
  locations,
  locationsWithAddress,
  onSave,
  onLocationAdded,
}: EditRoundModalProps) {
  const [formData, setFormData] = useState<Round | null>(null);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLocation, setManualLocation] = useState('');
  const [manualAddress, setManualAddress] = useState('');

  useEffect(() => {
    if (round) {
      setFormData({ ...round });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.id]);

  if (!isOpen || !round || !formData) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData || !formData.id) {
      alert('Round ID is missing. Please try again.');
      return;
    }
    
    if (!formData.roundNumber || formData.roundNumber < 1) {
      alert('Round number is required and must be at least 1.');
      return;
    }
    
    try {
      // Ensure we pass a clean round object with all required fields, preserving locationId
      const roundToSave: Round = {
        id: formData.id,
        roundNumber: formData.roundNumber,
        name: '', // name column removed
        date: formData.date || '',
        locationId: formData.locationId, // Explicitly preserve locationId
        status: formData.status || 'upcoming',
      };
      
      console.log('EditRoundModal submitting round:', roundToSave);
      await onSave(roundToSave);
      onClose();
    } catch (error) {
      console.error('Failed to save round:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save round: ${errorMessage}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Round"
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
            form="round-form"
            className="flex-1 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md text-sm hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
          >
            Save Round
          </button>
        </div>
      }
    >
      <form id="round-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Round Number
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.roundNumber}
            onChange={(e) => setFormData({ ...formData, roundNumber: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Date <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Location <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          {!showManualLocation ? (
            <div className="space-y-2">
              <select
                value={formData.locationId || ''}
                onChange={(e) => {
                  if (e.target.value === '__manual__') {
                    setShowManualLocation(true);
                  } else {
                    setFormData({ ...formData, locationId: e.target.value || undefined });
                  }
                }}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all"
              >
                <option value="">Select a location (optional)</option>
                {locations.length > 0 && locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
                <option value="__manual__">+ Add New Location</option>
              </select>
              {locations.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowManualLocation(true)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  + Add Location Manually
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                placeholder="Location name"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all"
              />
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="Address (optional)"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    let newLocationId: string | undefined;
                    if (manualLocation.trim() && onLocationAdded) {
                      try {
                        await onLocationAdded(manualLocation.trim(), manualAddress.trim());
                        const response = await fetch('/api/locations');
                        if (response.ok) {
                          const locationsData = await response.json();
                          const newLocation = locationsData.find((l: Location) => l.name === manualLocation.trim());
                          if (newLocation) newLocationId = newLocation.id;
                        }
                      } catch (error) {
                        console.error('Failed to add location:', error);
                        alert('Failed to add location. Please try again.');
                        return;
                      }
                    }
                    setFormData({ ...formData, locationId: newLocationId || undefined });
                    setShowManualLocation(false);
                    setManualLocation('');
                    setManualAddress('');
                  }}
                  className="flex-1 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md text-xs hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
                >
                  Save Location
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowManualLocation(false);
                    setManualLocation('');
                    setManualAddress('');
                  }}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Status
          </label>
          <select
            required
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as Round['status'] })}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-all"
          >
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}

