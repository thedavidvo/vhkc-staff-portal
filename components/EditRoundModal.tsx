'use client';

import { useState, useEffect } from 'react';
import { Round } from '@/types';
import Modal from '@/components/Modal';
import { Calendar, Save } from 'lucide-react';

interface LocationWithAddress {
  name: string;
  address: string;
}

interface EditRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: Round | null;
  seasonId: string;
  locations: string[];
  locationsWithAddress?: LocationWithAddress[];
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
  }, [round]);

  if (!isOpen || !round || !formData) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save round:', error);
      alert('Failed to save round. Please try again.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Round"
      subtitle="Update round details"
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
            form="round-form"
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg hover:shadow-xl hover-lift flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Round
          </button>
        </div>
      }
    >
      <form id="round-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Round Number
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.roundNumber}
            onChange={(e) => setFormData({ ...formData, roundNumber: parseInt(e.target.value) || 1 })}
            className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Date <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">(optional)</span>
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Location <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">(optional)</span>
          </label>
          {!showManualLocation ? (
            <div className="space-y-2">
              <select
                value={formData.location || ''}
                onChange={async (e) => {
                  if (e.target.value === '__manual__') {
                    setShowManualLocation(true);
                  } else {
                    // When selecting a location, fetch its address from the database
                    let address = '';
                    if (e.target.value) {
                      try {
                        const locationsResponse = await fetch('/api/locations');
                        if (locationsResponse.ok) {
                          const locationsData = await locationsResponse.json();
                          const selectedLocation = locationsData.find((loc: any) => loc.name === e.target.value);
                          if (selectedLocation && selectedLocation.address) {
                            address = selectedLocation.address;
                          }
                        }
                      } catch (error) {
                        console.error('Failed to fetch location address:', error);
                      }
                    }
                    setFormData({ ...formData, location: e.target.value, address });
                  }
                }}
                className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              >
                <option value="">Select a location (optional)</option>
                {locations.length > 0 && locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
                <option value="__manual__">+ Add New Location</option>
              </select>
              {locations.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowManualLocation(true)}
                  className="w-full px-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
                placeholder="Location name (optional)"
                className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="Address (optional)"
                className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    // If location is provided, add it to the locations list
                    if (manualLocation.trim() && onLocationAdded) {
                      try {
                        await onLocationAdded(manualLocation.trim(), manualAddress.trim());
                      } catch (error) {
                        console.error('Failed to add location:', error);
                        alert('Failed to add location. Please try again.');
                        return;
                      }
                    }
                    
                    // Update form data with location (can be empty)
                    setFormData({ 
                      ...formData, 
                      location: manualLocation.trim() || '', 
                      address: manualAddress.trim() || formData.address 
                    });
                    setShowManualLocation(false);
                    setManualLocation('');
                    setManualAddress('');
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
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
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Status
          </label>
          <select
            required
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as Round['status'] })}
            className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
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

