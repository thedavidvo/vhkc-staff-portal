'use client';

import { useEffect, useState } from 'react';
import { Division } from '@/types';

interface FinalAPodiumProps {
  seasonId: string;
  rounds: any[];
}

interface PodiumResult {
  driverId: string;
  driverName: string;
  teamName?: string;
  division: Division;
  overallPosition: number;
}

export default function FinalAPodium({ seasonId, rounds }: FinalAPodiumProps) {
  const [podiumResults, setPodiumResults] = useState<Record<Division, PodiumResult[]>>({
    'Division 1': [],
    'Division 2': [],
    'Division 3': [],
    'Division 4': [],
    'New': [],
    'Open': [],
  });
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedRound) {
      // Select the most recent round by default
      const sortedRounds = [...rounds].sort((a, b) => 
        new Date(b.raceDate).getTime() - new Date(a.raceDate).getTime()
      );
      if (sortedRounds.length > 0) {
        setSelectedRound(sortedRounds[0].id);
      }
    }
  }, [rounds, selectedRound]);

  useEffect(() => {
    if (!selectedRound) return;

    setLoading(true);
    fetch(`/api/race-results?roundId=${selectedRound}`)
      .then(res => res.ok ? res.json() : [])
      .then((results: any[]) => {
        // Filter for Final A results only
        const finalAResults = results.filter((r: any) => 
          r.raceName === 'final' && 
          r.finalType === 'A' &&
          r.overallPosition !== null &&
          r.overallPosition !== undefined
        );

        // Group by division and get top 3 for each
        const podiumByDivision: Record<Division, PodiumResult[]> = {
          'Division 1': [],
          'Division 2': [],
          'Division 3': [],
          'Division 4': [],
          'New': [],
          'Open': [],
        };

        (['Division 1', 'Division 2', 'Division 3', 'Division 4'] as Division[]).forEach(division => {
          const divisionResults = finalAResults
            .filter(r => r.division === division)
            .sort((a, b) => a.overallPosition - b.overallPosition)
            .slice(0, 3)
            .map(r => ({
              driverId: r.driverId,
              driverName: r.driverName || 'Unknown Driver',
              teamName: r.teamName,
              division: r.division,
              overallPosition: r.overallPosition,
            }));
          
          podiumByDivision[division] = divisionResults;
        });

        setPodiumResults(podiumByDivision);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [selectedRound]);

  const getMedalEmoji = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Final A Podium</h2>
        <select
          value={selectedRound}
          onChange={(e) => setSelectedRound(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {rounds
            .sort((a, b) => new Date(b.raceDate).getTime() - new Date(a.raceDate).getTime())
            .map(round => (
              <option key={round.id} value={round.id}>
                {round.location?.name || 'Unknown'} - {new Date(round.raceDate).toLocaleDateString()}
              </option>
            ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading results...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['Division 1', 'Division 2', 'Division 3', 'Division 4'] as Division[]).map(division => (
            <div key={division} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 text-center">
                {division}
              </h3>
              {podiumResults[division].length > 0 ? (
                <div className="space-y-2">
                  {podiumResults[division].map((result) => (
                    <div
                      key={result.driverId}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                    >
                      <span className="text-2xl">{getMedalEmoji(result.overallPosition)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {result.driverName}
                        </div>
                        {result.teamName && (
                          <div className="text-xs text-gray-500 truncate">
                            {result.teamName}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500 py-4">
                  No Final A results
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
