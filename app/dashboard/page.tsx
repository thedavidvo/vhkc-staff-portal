'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import StatsCards from '@/components/StatsCards';
import RaceHistory from '@/components/RaceHistory';
import PromotionsModal from '@/components/PromotionsModal';
import DemotionsModal from '@/components/DemotionsModal';
import { mockDrivers, mockRaces, mockPromotions, mockDemotions } from '@/data/mockData';

export default function Dashboard() {
  const router = useRouter();
  const [isPromotionsModalOpen, setIsPromotionsModalOpen] = useState(false);
  const [isDemotionsModalOpen, setIsDemotionsModalOpen] = useState(false);
  const [promotions, setPromotions] = useState(mockPromotions);
  const [demotions, setDemotions] = useState(mockDemotions);

  // Calculate dynamic stats
  const stats = useMemo(() => {
    const activeDrivers = mockDrivers.filter((d) => d.status === 'ACTIVE');
    const uniqueDivisions = new Set(mockDrivers.map((d) => d.division));
    return {
      totalDrivers: activeDrivers.length,
      driversPromoted: promotions.length,
      driversDemoted: demotions.length,
      activeDivisions: uniqueDivisions.size,
    };
  }, [promotions, demotions]);

  const handlePromotionConfirm = (driverId: string) => {
    // In a real app, this would make an API call to confirm the promotion
    setPromotions(promotions.filter((p) => p.driverId !== driverId));
  };

  const handlePromotionDecline = (driverId: string) => {
    // In a real app, this would make an API call to decline the promotion
    setPromotions(promotions.filter((p) => p.driverId !== driverId));
  };

  const handleDemotionConfirm = (driverId: string) => {
    // In a real app, this would make an API call to confirm the demotion
    setDemotions(demotions.filter((d) => d.driverId !== driverId));
  };

  const handleDemotionDecline = (driverId: string) => {
    // In a real app, this would make an API call to decline the demotion
    setDemotions(demotions.filter((d) => d.driverId !== driverId));
  };

  return (
    <>
      <Header hideSearch />
      <div className="p-4 md:p-6">
        <div className="max-w-[95%] mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Dashboard
            </h1>
          </div>

          <StatsCards 
            stats={stats} 
            onPromotedClick={() => setIsPromotionsModalOpen(true)}
            onDemotedClick={() => setIsDemotionsModalOpen(true)}
            onDriversClick={() => router.push('/drivers')}
            onDivisionsClick={() => router.push('/divisions')}
          />

          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Race History
            </h2>
            <RaceHistory races={mockRaces} />
          </div>
        </div>
      </div>

      <PromotionsModal
        isOpen={isPromotionsModalOpen}
        onClose={() => setIsPromotionsModalOpen(false)}
        promotions={promotions}
        onConfirm={handlePromotionConfirm}
        onDecline={handlePromotionDecline}
      />

      <DemotionsModal
        isOpen={isDemotionsModalOpen}
        onClose={() => setIsDemotionsModalOpen(false)}
        demotions={demotions}
        onConfirm={handleDemotionConfirm}
        onDecline={handleDemotionDecline}
      />
    </>
  );
}

