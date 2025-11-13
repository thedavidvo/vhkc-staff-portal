export type Division = 'Division 1' | 'Division 2' | 'Division 3' | 'Division 4';
export type DriverStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED';

export interface Driver {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  homeTrack?: string;
  division: Division;
  email: string;
  teamName?: string;
  status: DriverStatus;
  lastRacePosition: number;
  fastestLap: string;
  pointsTotal: number;
  lastUpdated: string;
  avatar?: string;
  raceHistory?: RaceResult[];
}

export interface RaceResult {
  raceId: string;
  raceName: string;
  trackName: string;
  season: string;
  round: number;
  position: number;
  qualificationTime?: string;
  fastestLap: string;
  points: number;
  date: string;
}

export interface Race {
  id: string;
  name: string;
  season: string;
  round: number;
  date: string;
  location: string;
  address: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  results?: RaceDivisionResult[];
}

export interface RaceDivisionResult {
  division: Division;
  results: DriverRaceResult[];
}

export interface DriverRaceResult {
  driverId: string;
  driverName: string;
  position: number;
  fastestLap: string;
  points: number;
}

export interface Team {
  id: string;
  name: string;
  driverIds: string[];
  createdAt: string;
}

export interface Promotion {
  driverId: string;
  driverName: string;
  fromDivision: Division;
  toDivision: Division;
  date: string;
}

export interface Stats {
  totalDrivers: number;
  driversPromoted: number;
  driversDemoted: number;
  activeDivisions: number;
}

