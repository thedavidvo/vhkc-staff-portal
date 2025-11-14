'use client';

import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Season, Round } from '@/types';

interface EditSeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  season: Season | null;
  onUpdate: (season: Season) => void;
  locations: string[];
  onLocationAdded?: (locationName: string, address: string) => void;
}

export default function EditSeasonModal({
  isOpen,
  onClose,
  season,
  onUpdate,
  locations,
  onLocationAdded,
}: EditSeasonModalProps) {
  const [formData, setFormData] = useState<Season | null>(null);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [showRoundForm, setShowRoundForm] = useState(false);

  // Initialize form data when season changes or modal opens
  useEffect(() => {
    if (season && isOpen) {
      setFormData({ ...season });
      setEditingRound(null);
      setShowRoundForm(false);
    }
  }, [season, isOpen]);

  if (!isOpen || !season) return null;

  const currentSeason = formData || season;
  // Sort rounds by roundNumber for display
  const sortedRounds = [...currentSeason.rounds].sort((a, b) => a.roundNumber - b.roundNumber);

  const handleSeasonUpdate = (field: keyof Season, value: any) => {
    if (!formData) {
      setFormData({ ...season });
    }
    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const handleSave = () => {
    if (!formData) return;
    
    // Validate dates only if both are provided
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        alert('End date must be after start date');
        return;
      }
    }

    // Update numberOfRounds to match actual rounds length
    const updatedSeason = {
      ...formData,
      numberOfRounds: formData.rounds.length,
    };

    onUpdate(updatedSeason);
    onClose();
  };

  const handleAddRound = () => {
    if (!formData) {
      setFormData({ ...season });
    }
    const existingRounds = (formData || season).rounds;
    // Find the highest round number and suggest the next one
    const maxRoundNumber = existingRounds.length > 0 
      ? Math.max(...existingRounds.map(r => r.roundNumber))
      : 0;
    const newRound: Round = {
      id: `round-${Date.now()}`,
      roundNumber: maxRoundNumber + 1,
      name: `${(formData || season).name} - Round ${maxRoundNumber + 1}`,
      date: '',
      location: locations[0] || '',
      address: '',
      status: 'upcoming',
    };
    setEditingRound(newRound);
    setShowRoundForm(true);
  };

  const handleSaveRound = (round: Round) => {
    if (!formData) {
      setFormData({ ...season });
    }
    const updatedRounds = [...(formData || season).rounds];
    const existingIndex = updatedRounds.findIndex((r) => r.id === round.id);
    
    if (existingIndex >= 0) {
      updatedRounds[existingIndex] = round;
    } else {
      updatedRounds.push(round);
    }

    // Sort rounds by roundNumber
    updatedRounds.sort((a, b) => a.roundNumber - b.roundNumber);

    setFormData((prev) => {
      if (!prev) return { ...season };
      return { ...prev, rounds: updatedRounds };
    });
    setEditingRound(null);
    setShowRoundForm(false);
  };

  const handleDeleteRound = (roundId: string) => {
    if (!confirm('Are you sure you want to delete this round?')) return;
    
    if (!formData) {
      setFormData({ ...season });
    }
    const updatedRounds = (formData || season).rounds.filter((r) => r.id !== roundId);
    
    // Sort rounds by roundNumber (round numbers are preserved)
    updatedRounds.sort((a, b) => a.roundNumber - b.roundNumber);

    setFormData((prev) => {
      if (!prev) return { ...season };
      return { ...prev, rounds: updatedRounds };
    });
  };

  const handleEditRound = (round: Round) => {
    setEditingRound(round);
    setShowRoundForm(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Edit Season
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left Side - Season Details */}
          <div className="w-1/2 p-6 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Season Details
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Season Name
                </label>
                <input
                  type="text"
                  value={currentSeason.name}
                  onChange={(e) => handleSeasonUpdate('name', e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Start Date <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={currentSeason.startDate}
                    onChange={(e) => handleSeasonUpdate('startDate', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    End Date <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={currentSeason.endDate}
                    onChange={(e) => handleSeasonUpdate('endDate', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Rounds Section */}
          <div className="w-1/2 p-6 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Rounds ({sortedRounds.length})
              </h3>
              <button
                onClick={handleAddRound}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add Round
              </button>
            </div>

            {sortedRounds.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 flex-1 flex items-center justify-center">
                No rounds added yet. Click "Add Round" to create one.
              </div>
            ) : (
              <div className="space-y-2 flex-1">
                {sortedRounds.map((round) => (
                  <div
                    key={round.id}
                    className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-white">
                        Round {round.roundNumber}: {round.name}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {round.date && new Date(round.date).toLocaleDateString()} • {round.location} • {round.status.charAt(0).toUpperCase() + round.status.slice(1).toLowerCase()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditRound(round)}
                        className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        aria-label="Edit round"
                      >
                        <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteRound(round.id)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        aria-label="Delete round"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-md"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Round Form Modal */}
      {showRoundForm && editingRound && (
        <RoundForm
          round={editingRound}
          locations={locations}
          onSave={handleSaveRound}
          onCancel={() => {
            setShowRoundForm(false);
            setEditingRound(null);
          }}
          onLocationAdded={onLocationAdded}
        />
      )}
    </div>
  );
}

interface RoundFormProps {
  round: Round;
  locations: string[];
  onSave: (round: Round) => void;
  onCancel: () => void;
  onLocationAdded?: (locationName: string, address: string) => void;
}

function RoundForm({ round, locations, onSave, onCancel, onLocationAdded }: RoundFormProps) {
  const [formData, setFormData] = useState<Round>(round);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLocation, setManualLocation] = useState('');
  const [manualAddress, setManualAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {round.id.startsWith('round-') ? 'Add Round' : 'Edit Round'}
          </h3>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Round Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Location
            </label>
            {!showManualLocation ? (
              <div className="space-y-2">
                <select
                  required
                  value={formData.location}
                  onChange={(e) => {
                    if (e.target.value === '__manual__') {
                      setShowManualLocation(true);
                    } else {
                      setFormData({ ...formData, location: e.target.value });
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {locations.length > 0 ? (
                    <>
                      <option value="">Select a location</option>
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </>
                  ) : (
                    <option value="">No locations available</option>
                  )}
                  <option value="__manual__">+ Add New Location</option>
                </select>
                {locations.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowManualLocation(true)}
                    className="w-full px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    + Add Location Manually
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  placeholder="Location name"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Address (optional)"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!manualLocation.trim()) {
                        alert('Please enter a location name');
                        return;
                      }
                      
                      // Add location to spreadsheet via API
                      if (onLocationAdded) {
                        try {
                          await onLocationAdded(manualLocation.trim(), manualAddress.trim());
                          setFormData({ ...formData, location: manualLocation.trim(), address: manualAddress.trim() || formData.address });
                          setShowManualLocation(false);
                          setManualLocation('');
                          setManualAddress('');
                        } catch (error) {
                          console.error('Failed to add location:', error);
                          alert('Failed to add location. Please try again.');
                        }
                      } else {
                        // If no callback, just update form data
                        setFormData({ ...formData, location: manualLocation.trim(), address: manualAddress.trim() || formData.address });
                        setShowManualLocation(false);
                      }
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
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="123 Racing Blvd, City, State 12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Status
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Round['status'] })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-md"
            >
              Save Round
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

