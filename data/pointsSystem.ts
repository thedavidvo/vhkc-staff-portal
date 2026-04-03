// Points system: max 75 points per round
export const getPointsForPosition = (position: number): number => {
  const pointsMap: Record<number, number> = {
    1: 75,
    2: 60,
    3: 50,
    4: 40,
    5: 32,
    6: 25,
    7: 18,
    8: 12,
    9: 8,
    10: 5,
    11: 3,
    12: 2,
    13: 1,
  };
  return pointsMap[position] || 0;
};

// Helper to calculate total points for a driver from race results
export const calculateDriverPoints = (driverId: string, races: any[]): number => {
  let total = 0;
  races.forEach((race) => {
    if (race.status === 'completed' && race.results) {
      race.results.forEach((divisionResult: any) => {
        const driverResult = divisionResult.results.find((r: any) => r.driverId === driverId);
        if (driverResult) {
          total += driverResult.points;
        }
      });
    }
  });
  return total;
};











