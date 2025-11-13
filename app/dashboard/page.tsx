'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import StatsCards from '@/components/StatsCards';
import RaceHistory from '@/components/RaceHistory';
import PromotionsModal from '@/components/PromotionsModal';
import DemotionsModal from '@/components/DemotionsModal';
import { useSeason } from '@/components/SeasonContext';
import { mockDrivers, mockRaces, mockPromotions, mockDemotions } from '@/data/mockData';
import { Calendar, MapPin, Flag } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const { selectedSeason } = useSeason();
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

  // Filter races by selected season
  const filteredRaces = useMemo(() => {
    if (!selectedSeason) {
      return mockRaces;
    }
    return mockRaces.filter((race) => race.season === selectedSeason.name);
  }, [selectedSeason]);

  // Find next upcoming race
  const nextUpcomingRace = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingRaces = filteredRaces
      .filter((race) => race.status === 'upcoming')
      .map((race) => {
        const raceDate = new Date(race.date);
        raceDate.setHours(0, 0, 0, 0);
        return {
          ...race,
          raceDate,
        };
      })
      .filter((race) => {
        // Show upcoming races that are today or in the future
        // For demo purposes, also show all upcoming races if none are in the future
        return race.raceDate >= today;
      })
      .sort((a, b) => a.raceDate.getTime() - b.raceDate.getTime());
    
    // If no future races found, show the first upcoming race regardless of date (for demo)
    if (upcomingRaces.length === 0) {
      const allUpcoming = filteredRaces
        .filter((race) => race.status === 'upcoming')
        .map((race) => ({
          ...race,
          raceDate: new Date(race.date),
        }))
        .sort((a, b) => a.raceDate.getTime() - b.raceDate.getTime());
      return allUpcoming.length > 0 ? allUpcoming[0] : null;
    }
    
    return upcomingRaces.length > 0 ? upcomingRaces[0] : null;
  }, [filteredRaces]);

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

          {/* Next Upcoming Race */}
          {nextUpcomingRace && (
            <div className="mb-6 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg border border-primary-400 overflow-hidden">
              <div className="p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Flag className="w-6 h-6" />
                  <h2 className="text-xl font-bold">Next Upcoming Race</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm opacity-90 mb-1">Date</p>
                      <p className="font-semibold">
                        {new Date(nextUpcomingRace.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Flag className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm opacity-90 mb-1">Race</p>
                      <p className="font-semibold">{nextUpcomingRace.name}</p>
                      <p className="text-sm opacity-90">{nextUpcomingRace.season} • Round {nextUpcomingRace.round}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm opacity-90 mb-1">Location</p>
                      <p className="font-semibold">{nextUpcomingRace.location}</p>
                      <p className="text-sm opacity-90">{nextUpcomingRace.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
            <RaceHistory races={filteredRaces} />
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

