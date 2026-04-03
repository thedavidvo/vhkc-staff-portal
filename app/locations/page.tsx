'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PageLayout from '@/components/PageLayout';
import SectionCard from '@/components/SectionCard';
import Modal from '@/components/Modal';
import { Plus, Trash2, MapPin, Loader2, X, Save, Edit, Search } from 'lucide-react';
import { Location } from '@/lib/dbService';

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [newLocation, setNewLocation] = useState({ name: '', address: '' });
  const [saving, setSaving] = useState(false);

  // Fetch locations from API
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/locations');
        if (response.ok) {
          const data = await response.json();
          setLocations(data);
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const filteredLocations = locations.filter((location) => {
    const matchesSearch =
      location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleAddLocation = async () => {
    if (!newLocation.name.trim()) {
      alert('Please enter a location name');
      return;
    }

    setSaving(true);
    try {
      const locationData = {
        id: `location-${Date.now()}`,
        name: newLocation.name.trim(),
        address: newLocation.address.trim(),
      };

      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData),
      });

      if (response.ok) {
        // Refresh locations
        const refreshResponse = await fetch('/api/locations');
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setLocations(data);
        }
        setIsAddModalOpen(false);
        setNewLocation({ name: '', address: '' });
      } else {
        throw new Error('Failed to add location');
      }
    } catch (error) {
      console.error('Failed to add location:', error);
      alert('Failed to add location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/locations?locationId=${locationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh locations
        const refreshResponse = await fetch('/api/locations');
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setLocations(data);
        }
      } else {
        throw new Error('Failed to delete location');
      }
    } catch (error) {
      console.error('Failed to delete location:', error);
      alert('Failed to delete location. Please try again.');
    }
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation || !editingLocation.name.trim()) {
      alert('Please enter a location name');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLocation),
      });

      if (response.ok) {
        // Refresh locations
        const refreshResponse = await fetch('/api/locations');
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setLocations(data);
        }
        setEditingLocation(null);
      } else {
        throw new Error('Failed to update location');
      }
    } catch (error) {
      console.error('Failed to update location:', error);
      alert('Failed to update location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header hideSearch />
        <div className="p-6">
          <div className="max-w-[95%] mx-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                <p className="text-slate-600 dark:text-slate-400">Loading locations...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageLayout
        title="Locations"
        subtitle="Manage race locations and venues"
        icon={MapPin}
        headerActions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg hover:shadow-xl hover-lift"
          >
            <Plus className="w-5 h-5" />
            Add Location
          </button>
        }
      >
        {/* Search Bar */}
        <SectionCard
          icon={Search}
          title="Search Locations"
          className="mb-8"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search locations by name or address..."
              className="w-full px-4 py-2.5 pl-10 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>
        </SectionCard>

        {/* Locations List */}
        {filteredLocations.length === 0 ? (
          <SectionCard>
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                {searchQuery ? 'No locations found matching your search.' : 'No locations added yet.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Add Your First Location
                </button>
              )}
            </div>
          </SectionCard>
        ) : (
          <SectionCard
            title={`Locations (${filteredLocations.length})`}
            icon={MapPin}
            noPadding
          >
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredLocations.map((location) => (
                  <div
                    key={location.id}
                    className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg flex-shrink-0">
                          <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingLocation?.id === location.id ? (
                            <div className="space-y-3">
                              <input
                                type="text"
                                value={editingLocation.name}
                                onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
                                autoFocus
                              />
                              <textarea
                                value={editingLocation.address}
                                onChange={(e) => setEditingLocation({ ...editingLocation, address: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm min-h-[80px]"
                                placeholder="Address (optional)"
                              />
                            </div>
                          ) : (
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                {location.name}
                              </h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {location.address || <span className="italic text-slate-400">No address provided</span>}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {editingLocation?.id === location.id ? (
                          <>
                            <button
                              onClick={handleUpdateLocation}
                              disabled={saving}
                              className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                              aria-label="Save"
                            >
                              <Save className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </button>
                            <button
                              onClick={() => setEditingLocation(null)}
                              disabled={saving}
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              aria-label="Cancel"
                            >
                              <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingLocation({ ...location })}
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              aria-label="Edit location"
                            >
                              <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>
                            <button
                              onClick={() => handleDeleteLocation(location.id)}
                              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              aria-label="Delete location"
                            >
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </SectionCard>
        )}
      </PageLayout>

      {/* Add Location Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setNewLocation({ name: '', address: '' });
        }}
        title="Add Location"
        subtitle="Create a new race location"
        icon={MapPin}
        size="md"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setNewLocation({ name: '', address: '' });
              }}
              className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-location-form"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg hover:shadow-xl hover-lift disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Location
                </>
              )}
            </button>
          </div>
        }
      >
        <form
          id="add-location-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddLocation();
          }}
          className="space-y-4"
        >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Location Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  placeholder="e.g., VHKC Main Track"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Address <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">(optional)</span>
                </label>
                <textarea
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all min-h-[100px]"
                  placeholder="123 Racing Blvd, City, State 12345"
                />
              </div>
            </form>
      </Modal>
    </>
  );
}

