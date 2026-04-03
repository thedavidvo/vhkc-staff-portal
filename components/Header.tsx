'use client';

import { Search, User, Moon, Sun, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function Header({ title, hideSearch }: { title?: string; hideSearch?: boolean }) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Check localStorage first, then fall back to system preference
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      const isDark = storedTheme === 'dark';
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    router.push('/');
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="glass-strong sticky top-0 z-30 border-b border-slate-200/50 dark:border-slate-700/50 shadow-modern-lg backdrop-blur-xl">
      <div className="pl-16 md:pl-4 pr-4 sm:pr-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {title && (
          <h2 className="text-xl sm:text-2xl font-bold gradient-text-2 animate-fadeIn">
            {title}
          </h2>
        )}

        {!hideSearch && (
          <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full sm:w-auto sm:max-w-md">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 transition-colors" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-auto min-w-[200px] pl-11 pr-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:shadow-md hover-lift"
                style={{ minHeight: '44px' }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover-lift group"
            aria-label="Toggle dark mode"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            {mounted && darkMode ? (
              <Sun className="w-5 h-5 text-amber-500 group-hover:rotate-12 transition-transform duration-300" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-blue-600 hover:from-primary-600 hover:via-primary-700 hover:to-blue-700 transition-all cursor-pointer shadow-lg hover:shadow-xl active:scale-95 border border-primary-400/20 hover-lift glow-hover"
              aria-label="Profile menu"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <User className="w-5 h-5 text-white" />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 glass-strong rounded-2xl shadow-modern-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden z-50 animate-scaleIn">
                <div className="px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Profile</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">User Account</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
