'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from './SidebarContext';
import SeasonSelector from './SeasonSelector';
import {
  LayoutDashboard,
  Users,
  Flag,
  Trophy,
  FileText,
  UsersRound,
  BarChart3,
  GitCompare,
  ShieldCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ClipboardCheck,
  MapPin,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: 'Season', href: '/season', icon: Calendar },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Drivers', href: '/drivers', icon: Users },
  { name: 'Check In', href: '/checkin', icon: ClipboardCheck },
  { name: 'Races', href: '/races', icon: Flag },
  { name: 'Results', href: '/results', icon: FileText },
  { name: 'Points', href: '/points', icon: Trophy },
  { name: 'Divisions', href: '/divisions', icon: ShieldCheck },
  { name: 'Standings', href: '/standings', icon: BarChart3 },
  { name: 'Teams', href: '/teams', icon: UsersRound },
];

const bottomNavItems: NavItem[] = [
  { name: 'Locations', href: '/locations', icon: MapPin },
];

const comingSoonItems: NavItem[] = [
  { name: 'Compare', href: '/compare', icon: GitCompare },
  { name: 'Audit', href: '/audit', icon: ShieldCheck },
  { name: 'Reports', href: '/reports', icon: FileText },
];

export default function Sidebar() {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLinkClick = () => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-3 left-3 z-[60] p-3 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
        aria-label="Toggle menu"
        style={{ minWidth: '44px', minHeight: '44px' }}
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 animate-fadeIn"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 ease-in-out flex flex-col h-screen fixed left-0 top-0 z-50 shadow-xl
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'w-[280px] md:w-20' : 'w-[280px] md:w-64'}`}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-700">
          <Link
            href="/dashboard"
            onClick={handleLinkClick}
            className="flex items-center justify-center flex-1"
          >
            <img
              src="/vhkc-logo.png"
              alt="VHKC Staff Portal"
              width={isCollapsed ? 40 : 120}
              height={isCollapsed ? 40 : 40}
              className="object-contain"
            />
          </Link>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors hidden md:block ml-2"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Season Selector */}
        {(!isCollapsed || (mounted && isMobile)) && (
          <div className="px-4 py-4 border-b border-slate-700">
            <SeasonSelector />
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto flex flex-col">
          <div className="flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ease-in-out active:scale-95 ${
                    isActive
                      ? 'bg-primary text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  <Icon 
                    className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${
                      isActive ? 'scale-105' : 'scale-100'
                    }`} 
                  />
                  {(!isCollapsed || (mounted && isMobile)) && (
                    <span className="font-medium transition-opacity duration-300">
                      {item.name}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r-full transition-all duration-300" />
                  )}
                </Link>
              );
            })}
          </div>
          
          {/* Bottom Navigation Items */}
          <div className="pt-4 border-t border-slate-700">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ease-in-out active:scale-95 ${
                    isActive
                      ? 'bg-primary text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  <Icon 
                    className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${
                      isActive ? 'scale-105' : 'scale-100'
                    }`} 
                  />
                  {(!isCollapsed || (mounted && isMobile)) && (
                    <span className="font-medium transition-opacity duration-300">
                      {item.name}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r-full transition-all duration-300" />
                  )}
                </Link>
              );
            })}
          </div>
          
          {/* Coming Soon Section */}
          <div className="pt-4 border-t border-slate-700">
            {(!isCollapsed || (mounted && isMobile)) && (
              <div className="px-4 py-2 mb-2">
                <span className="text-xs text-slate-400 uppercase font-semibold">Coming Soon</span>
              </div>
            )}
            {comingSoonItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ease-in-out ${
                    isActive
                      ? 'bg-primary text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white opacity-60'
                  }`}
                >
                  <Icon 
                    className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${
                      isActive ? 'scale-105' : 'scale-100'
                    }`} 
                  />
                  {(!isCollapsed || (mounted && isMobile)) && (
                    <span className="font-medium transition-opacity duration-300">
                      {item.name}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r-full transition-all duration-300" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}

