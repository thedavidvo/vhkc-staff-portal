import { Driver, Race, Stats, Team, Promotion, Division } from '@/types';

export const mockStats: Stats = {
  totalDrivers: 127,
  driversPromoted: 12,
  driversDemoted: 5,
  activeDivisions: 4,
};

export const mockDrivers: Driver[] = [
  {
    id: '1',
    name: 'Alex Thompson',
    division: 'Division 1',
    email: 'alex.thompson@example.com',
    teamName: 'Speed Demons',
    status: 'ACTIVE',
    lastRacePosition: 1,
    fastestLap: '1:18.32',
    pointsTotal: 2450,
    lastUpdated: '2024-01-15',
  },
  {
    id: '2',
    name: 'Sarah Chen',
    division: 'Division 1',
    email: 'sarah.chen@example.com',
    teamName: 'Speed Demons',
    status: 'ACTIVE',
    lastRacePosition: 2,
    fastestLap: '1:19.15',
    pointsTotal: 2380,
    lastUpdated: '2024-01-15',
  },
  {
    id: '3',
    name: 'Marcus Johnson',
    division: 'Division 2',
    email: 'marcus.johnson@example.com',
    teamName: 'Thunder Racing',
    status: 'ACTIVE',
    lastRacePosition: 1,
    fastestLap: '1:22.48',
    pointsTotal: 1890,
    lastUpdated: '2024-01-14',
  },
  {
    id: '4',
    name: 'Emma Wilson',
    division: 'Division 2',
    email: 'emma.wilson@example.com',
    status: 'ACTIVE',
    lastRacePosition: 3,
    fastestLap: '1:24.12',
    pointsTotal: 1750,
    lastUpdated: '2024-01-14',
  },
  {
    id: '5',
    name: 'James Rodriguez',
    division: 'Division 3',
    email: 'james.rodriguez@example.com',
    teamName: 'Lightning Fast',
    status: 'ACTIVE',
    lastRacePosition: 1,
    fastestLap: '1:28.56',
    pointsTotal: 1200,
    lastUpdated: '2024-01-13',
  },
  {
    id: '6',
    name: 'Olivia Brown',
    division: 'Division 1',
    email: 'olivia.brown@example.com',
    teamName: 'Thunder Racing',
    status: 'ACTIVE',
    lastRacePosition: 5,
    fastestLap: '1:20.33',
    pointsTotal: 2100,
    lastUpdated: '2024-01-15',
  },
  {
    id: '7',
    name: 'Noah Davis',
    division: 'Division 2',
    email: 'noah.davis@example.com',
    status: 'ACTIVE',
    lastRacePosition: 2,
    fastestLap: '1:23.21',
    pointsTotal: 1820,
    lastUpdated: '2024-01-14',
  },
  {
    id: '8',
    name: 'Sophia Martinez',
    division: 'Division 3',
    email: 'sophia.martinez@example.com',
    teamName: 'Lightning Fast',
    status: 'ACTIVE',
    lastRacePosition: 2,
    fastestLap: '1:29.45',
    pointsTotal: 1150,
    lastUpdated: '2024-01-13',
  },
  {
    id: '9',
    name: 'Liam Anderson',
    division: 'Division 1',
    email: 'liam.anderson@example.com',
    teamName: 'Speed Demons',
    status: 'ACTIVE',
    lastRacePosition: 3,
    fastestLap: '1:19.58',
    pointsTotal: 2250,
    lastUpdated: '2024-01-15',
  },
  {
    id: '10',
    name: 'Isabella Taylor',
    division: 'Division 2',
    email: 'isabella.taylor@example.com',
    status: 'ACTIVE',
    lastRacePosition: 4,
    fastestLap: '1:25.34',
    pointsTotal: 1680,
    lastUpdated: '2024-01-14',
  },
];

export const mockRaces: Race[] = [
  {
    id: '1',
    name: 'Winter Championship - Round 1',
    season: '2024 Winter',
    round: 1,
    date: '2024-01-20',
    location: 'Speedway Park',
    address: '123 Racing Blvd, City, State 12345',
    status: 'completed',
    results: [
      {
        division: 'Division 1',
        results: [
          { driverId: '1', driverName: 'Alex Thompson', position: 1, fastestLap: '1:18.32', points: 25 },
          { driverId: '2', driverName: 'Sarah Chen', position: 2, fastestLap: '1:19.15', points: 18 },
          { driverId: '6', driverName: 'Olivia Brown', position: 5, fastestLap: '1:20.33', points: 10 },
          { driverId: '9', driverName: 'Liam Anderson', position: 3, fastestLap: '1:19.58', points: 15 },
        ],
      },
      {
        division: 'Division 2',
        results: [
          { driverId: '3', driverName: 'Marcus Johnson', position: 1, fastestLap: '1:22.48', points: 25 },
          { driverId: '7', driverName: 'Noah Davis', position: 2, fastestLap: '1:23.21', points: 18 },
          { driverId: '4', driverName: 'Emma Wilson', position: 3, fastestLap: '1:24.12', points: 15 },
          { driverId: '10', driverName: 'Isabella Taylor', position: 4, fastestLap: '1:25.34', points: 12 },
        ],
      },
    ],
  },
  {
    id: '2',
    name: 'Winter Championship - Round 2',
    season: '2024 Winter',
    round: 2,
    date: '2024-01-27',
    location: 'Speedway Park',
    address: '123 Racing Blvd, City, State 12345',
    status: 'upcoming',
  },
  {
    id: '3',
    name: 'Winter Championship - Round 3',
    season: '2024 Winter',
    round: 3,
    date: '2024-02-10',
    location: 'Thunder Track',
    address: '456 Raceway Ave, City, State 12345',
    status: 'completed',
    results: [
      {
        division: 'Division 1',
        results: [
          { driverId: '2', driverName: 'Sarah Chen', position: 1, fastestLap: '1:17.89', points: 25 },
          { driverId: '1', driverName: 'Alex Thompson', position: 2, fastestLap: '1:18.15', points: 18 },
          { driverId: '9', driverName: 'Liam Anderson', position: 3, fastestLap: '1:18.92', points: 15 },
          { driverId: '6', driverName: 'Olivia Brown', position: 4, fastestLap: '1:19.45', points: 12 },
        ],
      },
      {
        division: 'Division 2',
        results: [
          { driverId: '7', driverName: 'Noah Davis', position: 1, fastestLap: '1:21.33', points: 25 },
          { driverId: '3', driverName: 'Marcus Johnson', position: 2, fastestLap: '1:21.78', points: 18 },
          { driverId: '10', driverName: 'Isabella Taylor', position: 3, fastestLap: '1:23.12', points: 15 },
          { driverId: '4', driverName: 'Emma Wilson', position: 4, fastestLap: '1:23.89', points: 12 },
        ],
      },
      {
        division: 'Division 3',
        results: [
          { driverId: '5', driverName: 'James Rodriguez', position: 1, fastestLap: '1:27.45', points: 25 },
          { driverId: '8', driverName: 'Sophia Martinez', position: 2, fastestLap: '1:28.12', points: 18 },
        ],
      },
    ],
  },
  {
    id: '4',
    name: 'Spring Qualifier - Round 1',
    season: '2024 Spring',
    round: 1,
    date: '2024-02-17',
    location: 'Velocity Circuit',
    address: '789 Speedway Rd, City, State 12345',
    status: 'completed',
    results: [
      {
        division: 'Division 1',
        results: [
          { driverId: '1', driverName: 'Alex Thompson', position: 1, fastestLap: '1:16.78', points: 25 },
          { driverId: '9', driverName: 'Liam Anderson', position: 2, fastestLap: '1:17.23', points: 18 },
          { driverId: '2', driverName: 'Sarah Chen', position: 3, fastestLap: '1:17.56', points: 15 },
          { driverId: '6', driverName: 'Olivia Brown', position: 4, fastestLap: '1:18.12', points: 12 },
        ],
      },
      {
        division: 'Division 2',
        results: [
          { driverId: '3', driverName: 'Marcus Johnson', position: 1, fastestLap: '1:20.89', points: 25 },
          { driverId: '7', driverName: 'Noah Davis', position: 2, fastestLap: '1:21.34', points: 18 },
          { driverId: '4', driverName: 'Emma Wilson', position: 3, fastestLap: '1:22.67', points: 15 },
          { driverId: '10', driverName: 'Isabella Taylor', position: 4, fastestLap: '1:23.45', points: 12 },
        ],
      },
    ],
  },
  {
    id: '5',
    name: 'Spring Qualifier - Round 2',
    season: '2024 Spring',
    round: 2,
    date: '2024-02-24',
    location: 'Speedway Park',
    address: '123 Racing Blvd, City, State 12345',
    status: 'completed',
    results: [
      {
        division: 'Division 1',
        results: [
          { driverId: '9', driverName: 'Liam Anderson', position: 1, fastestLap: '1:17.12', points: 25 },
          { driverId: '1', driverName: 'Alex Thompson', position: 2, fastestLap: '1:17.45', points: 18 },
          { driverId: '2', driverName: 'Sarah Chen', position: 3, fastestLap: '1:17.89', points: 15 },
        ],
      },
      {
        division: 'Division 2',
        results: [
          { driverId: '7', driverName: 'Noah Davis', position: 1, fastestLap: '1:20.56', points: 25 },
          { driverId: '3', driverName: 'Marcus Johnson', position: 2, fastestLap: '1:21.12', points: 18 },
          { driverId: '10', driverName: 'Isabella Taylor', position: 3, fastestLap: '1:22.34', points: 15 },
        ],
      },
      {
        division: 'Division 3',
        results: [
          { driverId: '5', driverName: 'James Rodriguez', position: 1, fastestLap: '1:26.78', points: 25 },
          { driverId: '8', driverName: 'Sophia Martinez', position: 2, fastestLap: '1:27.45', points: 18 },
        ],
      },
      {
        division: 'Division 4',
        results: [
          { driverId: '11', driverName: 'Michael Scott', position: 1, fastestLap: '1:32.12', points: 25 },
          { driverId: '12', driverName: 'Jennifer Lee', position: 2, fastestLap: '1:33.45', points: 18 },
        ],
      },
    ],
  },
  {
    id: '6',
    name: 'Spring Championship - Round 1',
    season: '2024 Spring',
    round: 3,
    date: '2024-03-02',
    location: 'Thunder Track',
    address: '456 Raceway Ave, City, State 12345',
    status: 'upcoming',
  },
];

export const mockTeams: Team[] = [
  {
    id: '1',
    name: 'Speed Demons',
    driverIds: ['1', '2', '9'],
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'Thunder Racing',
    driverIds: ['3', '6'],
    createdAt: '2024-01-05',
  },
  {
    id: '3',
    name: 'Lightning Fast',
    driverIds: ['5', '8'],
    createdAt: '2024-01-10',
  },
];

export const mockPromotions: Promotion[] = [
  {
    driverId: '3',
    driverName: 'Marcus Johnson',
    fromDivision: 'Division 2',
    toDivision: 'Division 1',
    date: '2024-01-16',
  },
  {
    driverId: '7',
    driverName: 'Noah Davis',
    fromDivision: 'Division 3',
    toDivision: 'Division 2',
    date: '2024-01-16',
  },
];

export const mockDemotions: Promotion[] = [
  {
    driverId: '6',
    driverName: 'Olivia Brown',
    fromDivision: 'Division 1',
    toDivision: 'Division 2',
    date: '2024-01-17',
  },
  {
    driverId: '4',
    driverName: 'Emma Wilson',
    fromDivision: 'Division 2',
    toDivision: 'Division 3',
    date: '2024-01-17',
  },
];

export const mockLocations: string[] = [
  'Speedway Park',
  'Thunder Track',
  'Velocity Circuit',
];
