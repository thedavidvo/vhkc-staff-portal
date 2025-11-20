'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2, Edit } from 'lucide-react';
import { Division, Round } from '@/types';
import Modal from '@/components/Modal';

interface RoundPoint {
  id: string;
  roundId: string;
  roundName: string;
  roundNumber: number;
  points: number;
  division: Division;
}

interface RoundPointsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  driverName: string;
  currentDivision: Division;
  newDivision: Division;
  seasonId: string;
  onSave: () => void;
  type: 'promotion' | 'demotion';
  rounds?: Round[];
}

export default function RoundPointsEditModal({
  isOpen,
  onClose,
  driverId,
  driverName,
  currentDivision,
  newDivision,
  seasonId,
  onSave,
  type,
  rounds = [],
}: RoundPointsEditModalProps) {
  const [roundPoints, setRoundPoints] = useState<RoundPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedPoints, setEditedPoints] = useState<Record<string, number>>({});
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [allRounds, setAllRounds] = useState<Round[]>([]);

  useEffect(() => {
    if (isOpen && driverId && seasonId) {
      fetchRoundPoints();
      fetchRounds();
    }
  }, [isOpen, driverId, seasonId]);

  const fetchRounds = async () => {
    if (rounds && rounds.length > 0) {
      setAllRounds(rounds);
      // Auto-select the most recently completed round, or the latest round if none completed
      const completedRounds = rounds
        .filter((r) => r.status === 'completed')
        .sort((a, b) => {
          const dateA = new Date(a.date || '').getTime();
          const dateB = new Date(b.date || '').getTime();
          return dateB - dateA;
        });
      
      if (completedRounds.length > 0) {
        setSelectedRoundId(completedRounds[0].id);
      } else {
        // If no completed rounds, use the latest round by round number
        const sortedRounds = [...rounds].sort((a, b) => (b.roundNumber || 0) - (a.roundNumber || 0));
        if (sortedRounds.length > 0) {
          setSelectedRoundId(sortedRounds[0].id);
        }
      }
      return;
    }
    
    try {
      const response = await fetch(`/api/rounds?seasonId=${seasonId}`);
      if (response.ok) {
        const fetchedRounds = await response.json();
        setAllRounds(fetchedRounds);
        
        // Auto-select the most recently completed round
        const completedRounds = fetchedRounds
          .filter((r: any) => r.status === 'completed')
          .sort((a: any, b: any) => {
            const dateA = new Date(a.date || '').getTime();
            const dateB = new Date(b.date || '').getTime();
            return dateB - dateA;
          });
        
        if (completedRounds.length > 0) {
          setSelectedRoundId(completedRounds[0].id);
        } else {
          // If no completed rounds, use the latest round by round number
          const sortedRounds = [...fetchedRounds].sort((a: any, b: any) => (b.roundNumber || 0) - (a.roundNumber || 0));
          if (sortedRounds.length > 0) {
            setSelectedRoundId(sortedRounds[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch rounds:', error);
    }
  };

  const fetchRoundPoints = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/points?driverId=${driverId}&seasonId=${seasonId}`);
      if (response.ok) {
        const points = await response.json();
        
        // Fetch rounds to get round names
        const roundsResponse = await fetch(`/api/rounds?seasonId=${seasonId}`);
        if (roundsResponse.ok) {
          const rounds = await roundsResponse.json();
          const roundMap = new Map<string, { location: string; roundNumber: number }>(
            rounds.map((r: any) => [r.id, { location: r.location || 'TBD', roundNumber: r.roundNumber }])
          );

          // Map points to include round names and sort by round number
          const mappedPoints: RoundPoint[] = points
            .map((point: any) => {
              const roundInfo = roundMap.get(point.roundId);
              return {
                id: point.id,
                roundId: point.roundId,
                roundName: roundInfo?.location || 'TBD',
                roundNumber: roundInfo?.roundNumber || 0,
                points: point.points || 0,
                division: point.division || currentDivision,
              };
            })
            .sort((a: RoundPoint, b: RoundPoint) => a.roundNumber - b.roundNumber);

          setRoundPoints(mappedPoints);
          // Initialize edited points with current values
          const initialEdited: Record<string, number> = {};
          mappedPoints.forEach((point) => {
            initialEdited[point.id] = point.points;
          });
          
          setEditedPoints(initialEdited);
        }
      }
    } catch (error) {
      console.error('Failed to fetch round points:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePointsChange = (pointId: string, newPoints: number) => {
    setEditedPoints({
      ...editedPoints,
      [pointId]: newPoints,
    });
  };

  const handleSave = async () => {
    try {
      if (!selectedRoundId) {
        alert('Please select a round for this division change');
        return;
      }
      
      setSaving(true);
      
      // Fetch the full driver object first
      const driverFetchResponse = await fetch(`/api/drivers?seasonId=${seasonId}`);
      if (!driverFetchResponse.ok) {
        throw new Error('Failed to fetch driver');
      }
      const drivers = await driverFetchResponse.json();
      const driver = drivers.find((d: any) => d.id === driverId);
      
      if (!driver) {
        throw new Error('Driver not found');
      }
      
      // Determine change type (promotion or demotion)
      const divisionOrder: Record<Division, number> = {
        'Division 1': 1,
        'Division 2': 2,
        'Division 3': 3,
        'Division 4': 4,
        'New': 5,
      };
      const fromOrder = divisionOrder[currentDivision];
      const toOrder = divisionOrder[newDivision];
      const changeType = toOrder < fromOrder ? 'promotion' : 'demotion';
      
      // Update driver division
      const updatedDriver = {
        ...driver,
        division: newDivision,
        lastUpdated: new Date().toISOString().split('T')[0],
      };
      
      const driverResponse = await fetch(`/api/drivers?seasonId=${seasonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDriver),
      });

      if (!driverResponse.ok) {
        throw new Error('Failed to update driver division');
      }

      // Update all modified points (round to nearest whole number)
      const updatePromises = roundPoints
        .filter((point) => editedPoints[point.id] !== undefined && editedPoints[point.id] !== point.points)
        .map((point) => {
          const roundedPoints = Math.round(editedPoints[point.id]);
          const updatedPoint = {
            ...point,
            points: roundedPoints,
            division: newDivision,
          };
          return fetch('/api/points', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPoint),
          });
        });

      await Promise.all(updatePromises);
      
      // Create division change record
      const changeId = `division-change-${driverId}-${Date.now()}`;
      const divisionChange = {
        id: changeId,
        seasonId: seasonId,
        roundId: selectedRoundId,
        driverId: driverId,
        driverName: driverName,
        fromDivision: currentDivision,
        toDivision: newDivision,
        changeType: changeType,
        createdAt: new Date().toISOString(),
      };
      
      // Save division change
      const changeResponse = await fetch('/api/division-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(divisionChange),
      });
      
      if (!changeResponse.ok) {
        console.warn('Failed to save division change record, but driver division was updated');
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Round Points"
      subtitle={`${driverName} - ${currentDivision} → ${newDivision}`}
      icon={Edit}
      size="xl"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !selectedRoundId}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg hover:shadow-xl hover-lift disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Confirm Changes
              </>
            )}
          </button>
        </div>
      }
    >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                <p className="text-slate-600 dark:text-slate-400">Loading rounds...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Select Round for Division Change *
                  </label>
                  <select
                    value={selectedRoundId}
                    onChange={(e) => setSelectedRoundId(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  >
                    <option value="">Select a round...</option>
                    {allRounds
                      .sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0))
                      .map((round) => (
                        <option key={round.id} value={round.id}>
                          Round {round.roundNumber}: {round.location || round.name || 'TBD'} {round.status === 'completed' ? '(Completed)' : ''}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    This division change will be recorded for the selected round.
                  </p>
                </div>
              </div>
              
              {roundPoints.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 text-center">
                  <p className="text-slate-600 dark:text-slate-400 mb-2">
                    No round points found for this driver.
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    You can still confirm the division change by selecting a round above.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Modify the overall points for each round below. Changes will be saved when you click "Confirm Changes".
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Round
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Round Name
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Points
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {roundPoints.map((point) => {
                      const hasChanges = editedPoints[point.id] !== point.points;
                      return (
                        <tr
                          key={point.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                            hasChanges ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                            Round {point.roundNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                            {point.roundName}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <div className="flex items-center justify-end gap-2">
                              {hasChanges && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 line-through">
                                  {point.points.toFixed(2)}
                                </span>
                              )}
                              <input
                                type="number"
                                step="1"
                                min="0"
                                max="75"
                                value={Math.round(editedPoints[point.id] ?? point.points)}
                                onChange={(e) => {
                                  const newValue = parseFloat(e.target.value) || 0;
                                  handlePointsChange(point.id, newValue);
                                }}
                                className={`w-24 px-2 py-1 text-right border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary ${
                                  hasChanges ? 'border-yellow-500 dark:border-yellow-600' : 'border-slate-300 dark:border-slate-600'
                                }`}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                  </div>
                </>
              )}
            </div>
          )}
    </Modal>
  );
}

