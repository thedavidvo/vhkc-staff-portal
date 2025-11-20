'use client';

// Client-side authentication utilities
export const AUTH_KEY = 'isAuthenticated';

export function setAuthenticated(value: boolean): void {
  if (typeof window === 'undefined') return;
  
  if (value) {
    localStorage.setItem(AUTH_KEY, 'true');
    // Also set a timestamp to track when the auth was set
    localStorage.setItem(`${AUTH_KEY}_timestamp`, Date.now().toString());
  } else {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(`${AUTH_KEY}_timestamp`);
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export function logout(): void {
  setAuthenticated(false);
}







