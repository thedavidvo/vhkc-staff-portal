'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated as checkAuth, setAuthenticated as setAuth } from '@/lib/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check authentication on mount and pathname change
  useEffect(() => {
    const authStatus = checkAuth();
    setIsAuthenticated(authStatus);
    setIsLoading(false);

    // Handle redirects
    const isLoginPage = pathname === '/' || pathname === '/login';
    
    if (!authStatus && !isLoginPage) {
      // Not authenticated and not on login page - redirect to login
      router.replace('/login');
    } else if (authStatus && isLoginPage) {
      // Authenticated and on login page - redirect to dashboard
      router.replace('/dashboard');
    }
  }, [pathname, router]);

  const login = () => {
    setAuth(true);
    setIsAuthenticated(true);
    // Use window.location for immediate navigation without race conditions
    window.location.href = '/dashboard';
  };

  const logout = () => {
    setAuth(false);
    setIsAuthenticated(false);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}







