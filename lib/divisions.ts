import { Division, Season } from '@/types';

export const SEASON_4_THRESHOLD = 4;

/** Parse a season number from a Season object or season name string (e.g. "Season 4" → 4). */
export function getSeasonNumber(season: Season | string | null | undefined): number {
  if (!season) return 1;
  const name = typeof season === 'string' ? season : season.name;
  const match = name.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

/** Returns true when the new division structure (Season 4+) applies. */
export function isNewDivisionStructure(seasonNumber: number): boolean {
  return seasonNumber >= SEASON_4_THRESHOLD;
}

/**
 * All divisions that exist in this season's context (for display, grouping, filtering).
 * Season 1-3: Division 1, 2, 3, 4, New
 * Season 4+:  Division 1, 2, 3, Rookies
 */
export function getDivisionsForSeason(seasonNumber: number): Division[] {
  if (isNewDivisionStructure(seasonNumber)) {
    return ['Division 1', 'Division 2', 'Division 3', 'Rookies'];
  }
  return ['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'];
}

/**
 * Divisions that can be directly assigned to a driver (not requiring the promotion workflow).
 * Season 4+: only Rookies is directly assignable; Div 1/2/3 are closed.
 * Season 1-3: all divisions are directly assignable.
 */
export function getAvailableDivisions(seasonNumber: number): Division[] {
  if (isNewDivisionStructure(seasonNumber)) {
    return ['Rookies'];
  }
  return ['Division 1', 'Division 2', 'Division 3', 'Division 4', 'New'];
}

/**
 * Returns true if the division is "closed" in this season — meaning it cannot be
 * directly assigned and requires a promotion from Rookies.
 * Only applies in Season 4+.
 */
export function isClosedDivision(division: Division, seasonNumber: number): boolean {
  if (!isNewDivisionStructure(seasonNumber)) return false;
  return division === 'Division 1' || division === 'Division 2' || division === 'Division 3';
}

/**
 * Numeric order map used to determine whether a division change is a promotion or demotion.
 * Lower number = higher/better division.
 */
export function getDivisionOrder(seasonNumber: number): Partial<Record<Division, number>> {
  if (isNewDivisionStructure(seasonNumber)) {
    return {
      'Division 1': 1,
      'Division 2': 2,
      'Division 3': 3,
      'Rookies': 4,
    };
  }
  return {
    'Division 1': 1,
    'Division 2': 2,
    'Division 3': 3,
    'Division 4': 4,
    'New': 5,
  };
}

/**
 * Returns true if promoting `from` → `to` is permitted in this season.
 * In Season 4+, Rookies cannot be promoted directly to Division 1.
 */
export function canPromote(from: Division, to: Division, seasonNumber: number): boolean {
  if (isNewDivisionStructure(seasonNumber)) {
    if (from === 'Rookies' && to === 'Division 1') return false;
  }
  return true;
}

/** Canonical Tailwind badge colour string for a division (or 'Open'). */
export function getDivisionColor(division: Division | 'Open' | string): string {
  switch (division) {
    case 'Division 1':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    case 'Division 2':
      return 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200';
    case 'Division 3':
      return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
    case 'Division 4':
      return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    case 'Rookies':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    case 'New':
      return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
    case 'Open':
      return 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
  }
}

/** Canonical Tailwind gradient string for a division (used in section headers). */
export function getDivisionGradient(division: Division | string): string {
  switch (division) {
    case 'Division 1':
      return 'from-blue-500 via-blue-600 to-blue-700';
    case 'Division 2':
      return 'from-pink-500 via-pink-600 to-rose-600';
    case 'Division 3':
      return 'from-orange-500 via-orange-600 to-amber-600';
    case 'Division 4':
      return 'from-yellow-500 via-yellow-600 to-amber-600';
    case 'Rookies':
      return 'from-green-500 via-green-600 to-emerald-600';
    case 'New':
      return 'from-purple-500 via-purple-600 to-indigo-600';
    default:
      return 'from-slate-500 to-slate-600';
  }
}

/** Canonical colour tokens for division select/dropdown elements. */
export function getDivisionSelectColors(division: Division | string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (division) {
    case 'Division 1':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900',
        text: 'text-blue-800 dark:text-blue-200',
        border: 'border-blue-300 dark:border-blue-700',
      };
    case 'Division 2':
      return {
        bg: 'bg-pink-100 dark:bg-pink-900',
        text: 'text-pink-800 dark:text-pink-200',
        border: 'border-pink-300 dark:border-pink-700',
      };
    case 'Division 3':
      return {
        bg: 'bg-orange-100 dark:bg-orange-900',
        text: 'text-orange-800 dark:text-orange-200',
        border: 'border-orange-300 dark:border-orange-700',
      };
    case 'Division 4':
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900',
        text: 'text-yellow-800 dark:text-yellow-200',
        border: 'border-yellow-300 dark:border-yellow-700',
      };
    case 'Rookies':
      return {
        bg: 'bg-green-100 dark:bg-green-900',
        text: 'text-green-800 dark:text-green-200',
        border: 'border-green-300 dark:border-green-700',
      };
    case 'New':
      return {
        bg: 'bg-purple-100 dark:bg-purple-900',
        text: 'text-purple-800 dark:text-purple-200',
        border: 'border-purple-300 dark:border-purple-700',
      };
    default:
      return {
        bg: 'bg-white dark:bg-slate-800',
        text: 'text-slate-900 dark:text-white',
        border: 'border-slate-300 dark:border-slate-700',
      };
  }
}
