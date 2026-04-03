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
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        }
      >
        {/* Search Bar */}
        <SectionCard
          icon={Search}
          title="Search Locations"
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search locations by name or address..."
              className="h-9 w-full px-3 pl-9 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400/40 focus:border-slate-300 dark:focus:border-slate-600 transition-colors"
            />
          </div>
        </SectionCard>

        {/* Locations List */}
        {filteredLocations.length === 0 ? (
          <SectionCard>
            <div className="text-center py-10">
              <MapPin className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {searchQuery ? 'No locations found matching your search.' : 'No locations added yet.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-3 h-8 px-3 text-xs bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
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
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md flex-shrink-0">
                          <MapPin className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingLocation?.id === location.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingLocation.name}
                                onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                                className="h-9 w-full px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40"
                                autoFocus
                              />
                              <textarea
                                value={editingLocation.address}
                                onChange={(e) => setEditingLocation({ ...editingLocation, address: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/40 min-h-[76px]"
                                placeholder="Address (optional)"
                              />
                            </div>
                          ) : (
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
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
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              aria-label="Save"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingLocation(null)}
                              disabled={saving}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              aria-label="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingLocation({ ...location })}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              aria-label="Edit location"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLocation(location.id)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              aria-label="Delete location"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
              className="flex-1 h-9 px-3 text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-location-form"
              disabled={saving}
              className="flex-1 h-9 inline-flex items-center justify-center gap-2 px-3 text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Location Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  className="h-9 w-full px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400/40 focus:border-slate-300 dark:focus:border-slate-600 transition-colors"
                  placeholder="e.g., VHKC Main Track"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Address <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">(optional)</span>
                </label>
                <textarea
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400/40 focus:border-slate-300 dark:focus:border-slate-600 transition-colors min-h-[92px]"
                  placeholder="123 Racing Blvd, City, State 12345"
                />
              </div>
            </form>
      </Modal>
    </>
  );
}


