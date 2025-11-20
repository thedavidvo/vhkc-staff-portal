'use client';

import { X, Plus, Trash2, Edit2, Calendar, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Season, Round } from '@/types';
import Modal from '@/components/Modal';

interface EditSeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  season: Season | null;
  onUpdate: (season: Season) => void;
  locations: string[];
  onLocationAdded?: (locationName: string, address: string) => void;
  initialRoundToEdit?: Round | null;
}

export default function EditSeasonModal({
  isOpen,
  onClose,
  season,
  onUpdate,
  locations,
  onLocationAdded,
  initialRoundToEdit,
}: EditSeasonModalProps) {
  const [formData, setFormData] = useState<Season | null>(null);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [showRoundForm, setShowRoundForm] = useState(false);

  // Initialize form data when season changes or modal opens
  useEffect(() => {
    if (season && isOpen) {
      setFormData({ ...season });
      // If initialRoundToEdit is provided, open the round form for that round
      if (initialRoundToEdit) {
        setEditingRound(initialRoundToEdit);
        setShowRoundForm(true);
      } else {
        setEditingRound(null);
        setShowRoundForm(false);
      }
    }
  }, [season, isOpen, initialRoundToEdit]);

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
      name: '',
      date: '',
      location: '',
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

  const handleDeleteRound = async (roundId: string) => {
    if (!confirm('Are you sure you want to delete this round?')) return;
    
    if (!formData) {
      setFormData({ ...season });
    }
    const currentData = formData || season;
    const updatedRounds = currentData.rounds.filter((r) => r.id !== roundId);
    
    // Sort rounds by roundNumber (round numbers are preserved)
    updatedRounds.sort((a, b) => a.roundNumber - b.roundNumber);

    const updatedSeason = {
      ...currentData,
      rounds: updatedRounds,
      numberOfRounds: updatedRounds.length,
    };

    // Update local state immediately
    setFormData(updatedSeason);
    
    // Save immediately to database
    try {
      await onUpdate(updatedSeason);
    } catch (error) {
      console.error('Failed to delete round:', error);
      alert('Failed to delete round. Please try again.');
      // Revert to previous state on error
      setFormData({ ...season });
    }
  };

  const handleEditRound = (round: Round) => {
    setEditingRound(round);
    setShowRoundForm(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Season"
      subtitle={`Manage ${season.name} details and rounds`}
      icon={Calendar}
      size="full"
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
            type="button"
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg hover:shadow-xl hover-lift flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Season
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Season Details */}
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
                  className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
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
                    className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
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
                    className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                </div>
              </div>
        </div>

        {/* Right Side - Rounds Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Rounds ({sortedRounds.length})
            </h3>
            <button
              onClick={handleAddRound}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg hover:shadow-xl hover-lift"
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
                        Round {round.roundNumber}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {(() => {
                          const displayName = (round.name && round.name.trim()) || (round.location && round.location.trim()) || '';
                          // Remove "Season - " prefix if present
                          const cleanName = displayName.replace(/^Season\s*-\s*/i, '');
                          const parts = [];
                          if (cleanName) parts.push(cleanName);
                          if (round.date) parts.push(new Date(round.date).toLocaleDateString());
                          if (round.location) parts.push(round.location);
                          parts.push(round.status.charAt(0).toUpperCase() + round.status.slice(1).toLowerCase());
                          return parts.join(' • ');
                        })()}
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
          isEditing={currentSeason.rounds.some(r => r.id === editingRound.id)}
        />
      )}
    </Modal>
  );
}

interface RoundFormProps {
  round: Round;
  locations: string[];
  onSave: (round: Round) => void;
  onCancel: () => void;
  onLocationAdded?: (locationName: string, address: string) => void;
  isEditing?: boolean;
}

function RoundForm({ round, locations, onSave, onCancel, onLocationAdded, isEditing = false }: RoundFormProps) {
  const [formData, setFormData] = useState<Round>(round);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLocation, setManualLocation] = useState('');
  const [manualAddress, setManualAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={isEditing ? 'Edit Round' : 'Add Round'}
      subtitle={isEditing ? 'Update round details' : 'Create a new round for this season'}
      icon={Calendar}
      size="md"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
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
              Round Name <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Leave blank to use location"
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
                  onChange={(e) => {
                    if (e.target.value === '__manual__') {
                      setShowManualLocation(true);
                    } else {
                      setFormData({ ...formData, location: e.target.value });
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

