'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import StatsCards from '@/components/StatsCards';
import RecentRaceResults from '@/components/RecentRaceResults';
import AddDriverModal from '@/components/AddDriverModal';
import PromotionsModal from '@/components/PromotionsModal';
import { mockStats, mockDrivers, mockRaces, mockPromotions } from '@/data/mockData';
import { Plus } from 'lucide-react';

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPromotionsModalOpen, setIsPromotionsModalOpen] = useState(false);
  const [drivers, setDrivers] = useState(mockDrivers);

  // Get the most recent completed race
  const mostRecentRace = useMemo(() => {
    const completedRaces = mockRaces.filter((r) => r.status === 'completed');
    return completedRaces.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, []);

  const handleAddDriver = (driverData: {
    name: string;
    division: string;
    email: string;
    phone: string;
  }) => {
    // In a real app, this would make an API call
    const newDriver = {
      id: String(drivers.length + 1),
      name: driverData.name,
      division: driverData.division as any,
      email: driverData.email,
      status: 'ACTIVE' as const,
      lastRacePosition: 0,
      fastestLap: '0:00.00',
      pointsTotal: 0,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setDrivers([...drivers, newDriver]);
  };

  return (
    <>
      <Header title="VHKC Staff Portal" />
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Dashboard
            </h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all shadow-md font-medium w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              Add Driver
            </button>
          </div>

          <StatsCards 
            stats={mockStats} 
            onPromotedClick={() => setIsPromotionsModalOpen(true)}
          />

          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Most Recent Race Results
            </h2>
            {mostRecentRace ? (
              <RecentRaceResults race={mostRecentRace} />
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400">
                No completed races available.
              </div>
            )}
          </div>
        </div>
      </div>

      <AddDriverModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddDriver}
      />

      <PromotionsModal
        isOpen={isPromotionsModalOpen}
        onClose={() => setIsPromotionsModalOpen(false)}
        promotions={mockPromotions}
      />
    </>
  );
}

