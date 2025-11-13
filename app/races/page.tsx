'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';

import { mockRaces } from '@/data/mockData';

import { Race, Division, DriverRaceResult } from '@/types';
import { Plus, Save } from 'lucide-react';

export default function RacesPage() {
  const [races] = useState(mockRaces);
  const [selectedEvent, setSelectedEvent] = useState<Race | null>(races[0] || null);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(races[0] ? 'Division 1' : null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [types, setTypes] = useState<string[]>([]);
  const [driverResults, setDriverResults] = useState<DriverRaceResult[]>([]);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  // Load division results when division is set
  useEffect(() => {
    if (selectedEvent && selectedDivision) {
      const divisionResults = selectedEvent.results?.find((r) => r.division === selectedDivision)?.results || [];
      setDriverResults([...divisionResults]);
    }
  }, [selectedEvent, selectedDivision]);

  const availableDivisions: Division[] = ['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'];

  const handleAddDivision = () => {
    if (!selectedEvent) return;
    const newDivision: Division = 'New';
    setSelectedDivision(newDivision);
    setSelectedType(null);
    setDriverResults([]);
  };

  const handleAddType = () => {
    setIsTypeModalOpen(true);
  };

  const handleTypeModalSubmit = () => {
    if (newTypeName && newTypeName.trim()) {
      setTypes([...types, newTypeName.trim()]);
      setSelectedType(newTypeName.trim());
      setNewTypeName('');
      setIsTypeModalOpen(false);
    }
  };

  const handleTypeModalCancel = () => {
    setNewTypeName('');
    setIsTypeModalOpen(false);
  };

  const handleUpdateDriverResult = (index: number, field: keyof DriverRaceResult, value: string | number, forceAddRow = false) => {
    let updated = [...driverResults];
    
    // Ensure the array is large enough
    while (updated.length <= index) {
      updated.push({
        driverId: `temp-${Date.now()}-${updated.length}`,
        driverAlias: '',
        driverName: '',
        kartNumber: '',
        gridPosition: updated.length + 1,
        position: updated.length + 1,
        overallPosition: updated.length + 1,
        fastestLap: '',
        points: 0,
      });
    }
    
    // Update the specific field
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-add new row if editing the last row and it has data, or if forceAddRow is true
    const isLastRow = index === updated.length - 1;
    const hasData = value && (value.toString().trim().length > 0);
    
    if (isLastRow && (hasData || forceAddRow)) {
      const newResult: DriverRaceResult = {
        driverId: `temp-${Date.now()}-${updated.length}`,
        driverAlias: '',
        driverName: '',
        kartNumber: '',
        gridPosition: updated.length + 1,
        position: updated.length + 1,
        overallPosition: updated.length + 1,
        fastestLap: '',
        points: 0,
      };
      updated.push(newResult);
    }
    
    setDriverResults(updated);
  };

  const getDivisionResults = () => {
    if (!selectedEvent || !selectedDivision) return [];
    return selectedEvent.results?.find((r) => r.division === selectedDivision)?.results || [];
  };

  const handleSave = () => {
    if (!selectedEvent || !selectedDivision) {
      alert('Please select an event and division before saving.');
      return;
    }
    
    // Filter out empty rows (rows with no driver name or alias)
    const validResults = driverResults.filter(
      (result) => result.driverName?.trim() || result.driverAlias?.trim()
    );
    
    if (validResults.length === 0) {
      alert('No valid results to save. Please add at least one driver result.');
      return;
    }
    
    // Here you would typically save to your backend/database
    // For now, we'll just show a success message
    console.log('Saving results:', {
      eventId: selectedEvent.id,
      division: selectedDivision,
      type: selectedType,
      results: validResults,
    });
    
    alert(`Successfully saved ${validResults.length} driver result(s)!`);
  };

  return (
    <>
    <Header hideSearch />
      <div className="p-4 md:p-6">
      <div className="max-w-[95vw] mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-6">
          Races Management
        </h1>
        <div className="grid grid-cols-12 gap-6 mb-6">
          {/* Panel 1: Event */}
          <div className="col-span-4 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Event</h2>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {races.map((race) => (
                  <div
                    key={race.id}
                    onClick={() => {
                      setSelectedEvent(race);
                      setSelectedDivision('Division 1');
                      setSelectedType(null);
                      setTypes([]);
                      setDriverResults([]);
                    }}
                    className={`p-2 cursor-pointer transition-colors ${
                      selectedEvent?.id === race.id
                        ? 'bg-primary-50 dark:bg-primary-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <h3 className="font-semibold text-slate-900 dark:text-white text-xs">
                      {race.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {race.season} • R{race.round}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                      {new Date(race.date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel 2: Division */}
          <div className="col-span-4 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Division</h2>
              {selectedEvent && (
                <button
                  onClick={handleAddDivision}
                  className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-md text-xs font-medium"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              )}
            </div>
            <div className="p-2">
              {selectedEvent ? (
                <div className="space-y-1">
                  {availableDivisions.map((division) => {
                    const hasResults = selectedEvent.results?.some((r) => r.division === division);
                    return (
                      <button
                        key={division}
                        onClick={() => {
                          setSelectedDivision(division);
                          setSelectedType(null);
                          const divisionResults = selectedEvent.results?.find((r) => r.division === division)?.results || [];
                          setDriverResults([...divisionResults]);
                          // Reset types when division changes
                          setTypes([]);
                        }}
                        className={`w-full text-left p-2 rounded-lg transition-colors text-xs ${
                          selectedDivision === division
                            ? 'bg-primary-500 text-white'
                            : hasResults
                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-medium">{division}</div>
                        {hasResults && (
                          <div className="text-xs mt-0.5 opacity-75">
                            {selectedEvent.results?.find((r) => r.division === division)?.results.length || 0} drivers
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">
                  Select an event to view races
                </div>
              )}
            </div>
          </div>

          {/* Panel 3: Race Name */}
          <div className="col-span-4 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Race Name</h2>
              <button
                onClick={handleAddType}
                className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-md text-xs font-medium"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            <div className="p-2">
              {selectedEvent && selectedDivision ? (
                <div className="space-y-1">
                  {types.length > 0 ? (
                    types.map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setSelectedType(type);
                        }}
                        className={`w-full text-left p-2 rounded-lg transition-colors text-xs ${
                          selectedType === type
                            ? 'bg-primary-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        <div className="font-medium">{type}</div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">
                      No race names created. Click Add to create one.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">
                  Select an event and division to create race names
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Race Results Panel - Moved to Bottom */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Race Results</h2>
            {selectedEvent && selectedDivision && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-md text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
            {selectedEvent && selectedDivision && selectedType ? (
              <SpreadsheetTable
                division={selectedDivision}
                type={selectedType}
                results={driverResults}
                onUpdate={handleUpdateDriverResult}
              />
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                {!selectedEvent
                  ? 'Select an event and division to view results'
                  : !selectedDivision
                  ? 'Select a division to view results'
                  : 'Select a race name to view results'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Race Name Modal */}
    {isTypeModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            Add Race Name
          </h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Race Name
            </label>
            <input
              type="text"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTypeModalSubmit();
                } else if (e.key === 'Escape') {
                  handleTypeModalCancel();
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter race name"
              autoFocus
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleTypeModalCancel}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleTypeModalSubmit}
              className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-md"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function SpreadsheetTable({
  division,
  type,
  results,
  onUpdate,
}: {
  division: Division;
  type: string | null;
  results: DriverRaceResult[];
  onUpdate: (index: number, field: keyof DriverRaceResult, value: string | number, forceAddRow?: boolean) => void;
}) {
  const fields: (keyof DriverRaceResult)[] = ['driverAlias', 'driverName', 'kartNumber', 'gridPosition', 'overallPosition', 'fastestLap'];
  // Ensure at least one empty row exists
  const rowsToDisplay = results.length > 0 ? [...results] : [
    {
      driverId: `temp-${Date.now()}`,
      driverAlias: '',
      driverName: '',
      kartNumber: '',
      gridPosition: 1,
      position: 1,
      overallPosition: 1,
      fastestLap: '',
      points: 0,
    }
  ];

  // Always add one empty row at the end for new entries (if last row has data)
  const lastRow = rowsToDisplay[rowsToDisplay.length - 1];
  const lastRowHasData = lastRow && (lastRow.driverName || lastRow.driverAlias || lastRow.kartNumber || lastRow.fastestLap);
  
  if (lastRowHasData || rowsToDisplay.length === 0) {
    rowsToDisplay.push({
      driverId: `temp-new-${rowsToDisplay.length}`,
      driverAlias: '',
      driverName: '',
      kartNumber: '',
      gridPosition: rowsToDisplay.length + 1,
      position: rowsToDisplay.length + 1,
      overallPosition: rowsToDisplay.length + 1,
      fastestLap: '',
      points: 0,
    });
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Race Results - {division}{type ? ` - ${type}` : ''}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase border border-slate-200 dark:border-slate-700">
                Driver Alias
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase border border-slate-200 dark:border-slate-700">
                Driver Name
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase border border-slate-200 dark:border-slate-700">
                Kart Number
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase border border-slate-200 dark:border-slate-700">
                Grid Position
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase border border-slate-200 dark:border-slate-700">
                Overall Position
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase border border-slate-200 dark:border-slate-700">
                Best Time
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase border border-slate-200 dark:border-slate-700">
                Positions Gained/Lost
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800">
            {rowsToDisplay.map((result, index) => (
              <tr
                key={result.driverId}
                className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <td className="px-3 py-1 border border-slate-200 dark:border-slate-700">
                  <input
                    type="text"
                    value={result.driverAlias || ''}
                    onChange={(e) => onUpdate(index, 'driverAlias', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        // Add new row if on last row
                        if (index === rowsToDisplay.length - 1) {
                          // Force add new row
                          onUpdate(index, 'driverAlias', result.driverAlias || '', true);
                          // Move to next cell after a brief delay to allow state update
                          setTimeout(() => {
                            const nextFieldIndex = fields.indexOf('driverAlias') + 1;
                            if (nextFieldIndex < fields.length) {
                              const nextInput = document.querySelector(
                                `input[data-row="${index}"][data-field="${fields[nextFieldIndex]}"]`
                              ) as HTMLInputElement;
                              nextInput?.focus();
                            } else {
                              // Move to first field of new row
                              const newRowInput = document.querySelector(
                                `input[data-row="${index + 1}"][data-field="driverAlias"]`
                              ) as HTMLInputElement;
                              newRowInput?.focus();
                            }
                          }, 10);
                          return;
                        }
                        // Move to next cell
                        const nextFieldIndex = fields.indexOf('driverAlias') + 1;
                        if (nextFieldIndex < fields.length) {
                          const nextInput = e.currentTarget.parentElement?.parentElement?.querySelector(
                                `input[data-field="${fields[nextFieldIndex]}"]`
                              ) as HTMLInputElement;
                          nextInput?.focus();
                        } else if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="driverAlias"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        }
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        // Move down to same field in next row
                        if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="driverAlias"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        } else {
                          // Add new row and focus it
                          onUpdate(index, 'driverAlias', result.driverAlias || '', true);
                          setTimeout(() => {
                            const newRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="driverAlias"]`
                            ) as HTMLInputElement;
                            newRowInput?.focus();
                          }, 0);
                        }
                      }
                    }}
                    data-row={index}
                    data-field="driverAlias"
                    className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white focus:bg-slate-100 dark:focus:bg-slate-600"
                    placeholder="Alias"
                  />
                </td>
                <td className="px-3 py-1 border border-slate-200 dark:border-slate-700">
                  <input
                    type="text"
                    value={result.driverName || ''}
                    onChange={(e) => onUpdate(index, 'driverName', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        if (index === rowsToDisplay.length - 1) {
                          onUpdate(index, 'driverName', result.driverName || '', true);
                        }
                        const nextFieldIndex = fields.indexOf('driverName') + 1;
                        if (nextFieldIndex < fields.length) {
                          const nextInput = e.currentTarget.parentElement?.parentElement?.querySelector(
                            `input[data-field="${fields[nextFieldIndex]}"]`
                          ) as HTMLInputElement;
                          nextInput?.focus();
                        } else if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="driverAlias"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        }
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="driverName"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        } else {
                          onUpdate(index, 'driverName', result.driverName || '', true);
                          setTimeout(() => {
                            const newRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="driverName"]`
                            ) as HTMLInputElement;
                            newRowInput?.focus();
                          }, 0);
                        }
                      }
                    }}
                    data-row={index}
                    data-field="driverName"
                    className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white focus:bg-slate-100 dark:focus:bg-slate-600"
                    placeholder="Name"
                  />
                </td>
                <td className="px-3 py-1 border border-slate-200 dark:border-slate-700">
                  <input
                    type="text"
                    value={result.kartNumber || ''}
                    onChange={(e) => onUpdate(index, 'kartNumber', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        if (index === rowsToDisplay.length - 1) {
                          onUpdate(index, 'kartNumber', result.kartNumber || '', true);
                        }
                        const nextFieldIndex = fields.indexOf('kartNumber') + 1;
                        if (nextFieldIndex < fields.length) {
                          const nextInput = e.currentTarget.parentElement?.parentElement?.querySelector(
                            `input[data-field="${fields[nextFieldIndex]}"]`
                          ) as HTMLInputElement;
                          nextInput?.focus();
                        } else if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="driverAlias"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        }
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="kartNumber"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        } else {
                          onUpdate(index, 'kartNumber', result.kartNumber || '', true);
                          setTimeout(() => {
                            const newRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="kartNumber"]`
                            ) as HTMLInputElement;
                            newRowInput?.focus();
                          }, 0);
                        }
                      }
                    }}
                    data-row={index}
                    data-field="kartNumber"
                    className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white focus:bg-slate-100 dark:focus:bg-slate-600"
                    placeholder="Kart #"
                  />
                </td>
                <td className="px-3 py-1 border border-slate-200 dark:border-slate-700">
                  <input
                    type="number"
                    value={result.gridPosition || ''}
                    onChange={(e) => onUpdate(index, 'gridPosition', parseInt(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        if (index === rowsToDisplay.length - 1) {
                          onUpdate(index, 'gridPosition', result.gridPosition || 0, true);
                        }
                        const nextFieldIndex = fields.indexOf('gridPosition') + 1;
                        if (nextFieldIndex < fields.length) {
                          const nextInput = e.currentTarget.parentElement?.parentElement?.querySelector(
                            `input[data-field="${fields[nextFieldIndex]}"]`
                          ) as HTMLInputElement;
                          nextInput?.focus();
                        } else if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="driverAlias"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        }
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="gridPosition"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        } else {
                          onUpdate(index, 'gridPosition', result.gridPosition || 0, true);
                          setTimeout(() => {
                            const newRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="gridPosition"]`
                            ) as HTMLInputElement;
                            newRowInput?.focus();
                          }, 0);
                        }
                      }
                    }}
                    data-row={index}
                    data-field="gridPosition"
                    className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white focus:bg-slate-100 dark:focus:bg-slate-600"
                    placeholder="Grid"
                  />
                </td>
                <td className="px-3 py-1 border border-slate-200 dark:border-slate-700">
                  <input
                    type="number"
                    value={result.overallPosition || ''}
                    onChange={(e) => onUpdate(index, 'overallPosition', parseInt(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        if (index === rowsToDisplay.length - 1) {
                          onUpdate(index, 'overallPosition', result.overallPosition || 0, true);
                        }
                        const nextFieldIndex = fields.indexOf('overallPosition') + 1;
                        if (nextFieldIndex < fields.length) {
                          const nextInput = e.currentTarget.parentElement?.parentElement?.querySelector(
                            `input[data-field="${fields[nextFieldIndex]}"]`
                          ) as HTMLInputElement;
                          nextInput?.focus();
                        } else if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="driverAlias"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        }
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="overallPosition"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        } else {
                          onUpdate(index, 'overallPosition', result.overallPosition || 0, true);
                          setTimeout(() => {
                            const newRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="overallPosition"]`
                            ) as HTMLInputElement;
                            newRowInput?.focus();
                          }, 0);
                        }
                      }
                    }}
                    data-row={index}
                    data-field="overallPosition"
                    className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white focus:bg-slate-100 dark:focus:bg-slate-600"
                    placeholder="Overall"
                  />
                </td>
                <td className="px-3 py-1 border border-slate-200 dark:border-slate-700">
                  <input
                    type="text"
                    value={result.fastestLap || ''}
                    onChange={(e) => onUpdate(index, 'fastestLap', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        if (index === rowsToDisplay.length - 1) {
                          onUpdate(index, 'fastestLap', result.fastestLap || '', true);
                        }
                        // Last field, move to next row first field
                        if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="driverAlias"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        }
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (index < rowsToDisplay.length - 1) {
                          const nextRowInput = document.querySelector(
                            `input[data-row="${index + 1}"][data-field="fastestLap"]`
                          ) as HTMLInputElement;
                          nextRowInput?.focus();
                        } else {
                          onUpdate(index, 'fastestLap', result.fastestLap || '', true);
                          setTimeout(() => {
                            const newRowInput = document.querySelector(
                              `input[data-row="${index + 1}"][data-field="fastestLap"]`
                            ) as HTMLInputElement;
                            newRowInput?.focus();
                          }, 0);
                        }
                      }
                    }}
                    data-row={index}
                    data-field="fastestLap"
                    className="w-full px-2 py-1 bg-transparent border-none outline-none text-sm font-mono text-slate-900 dark:text-white focus:bg-slate-100 dark:focus:bg-slate-600"
                    placeholder="1:18.32"
                  />
                </td>
                <td className="px-3 py-1 border border-slate-200 dark:border-slate-700">
                  <div className="px-2 py-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {result.gridPosition && result.overallPosition
                      ? (() => {
                          const diff = (result.overallPosition || 0) - (result.gridPosition || 0);
                          if (diff > 0) {
                            return <span className="text-red-600 dark:text-red-400">-{diff}</span>;
                          } else if (diff < 0) {
                            return <span className="text-green-600 dark:text-green-400">+{Math.abs(diff)}</span>;
                          } else {
                            return <span className="text-slate-500 dark:text-slate-400">0</span>;
                          }
                        })()
                      : '-'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
