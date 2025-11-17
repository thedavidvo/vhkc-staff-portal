export type Division = 'Division 1' | 'Division 2' | 'Division 3' | 'Division 4' | 'New';
export type DriverStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED';

export interface Driver {
  id: string;
  name: string;
  aliases?: string[];
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
  roundNumber?: number; // Optional for backwards compatibility
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
  driverAlias?: string;
  driverName: string;
  division?: Division; // Add division to race results
  kartNumber?: string;
  position: number;
  gridPosition?: number;
  overallPosition?: number;
  fastestLap: string;
  points: number;
}

export interface Team {
  id: string;
  name: string;
  driverIds: string[];
  division?: Division;
  createdAt: string;
}

export interface Promotion {
  driverId: string;
  driverName: string;
  fromDivision: Division;
  toDivision: Division;
  date: string;
  roundName?: string;
}

export interface Stats {
  totalDrivers: number;
  activeDivisions: number;
}

export interface Round {
  id: string;
  roundNumber: number;
  name: string;
  date: string;
  location: string;
  address: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  numberOfRounds: number;
  rounds: Round[];
}

export interface CheckIn {
  id: string;
  roundId: string;
  driverId: string;
  checkedIn: boolean;
  createdAt?: string;
}

