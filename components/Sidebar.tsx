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
  category?: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, category: 'overview' },
  { name: 'Season', href: '/season', icon: Calendar, category: 'management' },
  { name: 'Drivers', href: '/drivers', icon: Users, category: 'management' },
  { name: 'Check In', href: '/checkin', icon: ClipboardCheck, category: 'operations' },
  { name: 'Races', href: '/races', icon: Flag, category: 'operations' },
  { name: 'Results', href: '/results', icon: FileText, category: 'data' },
  { name: 'Points', href: '/points', icon: Trophy, category: 'data' },
  { name: 'Divisions', href: '/divisions', icon: ShieldCheck, category: 'management' },
  { name: 'Standings', href: '/standings', icon: BarChart3, category: 'data' },
  { name: 'Teams', href: '/teams', icon: UsersRound, category: 'management' },
  { name: 'Compare', href: '/compare', icon: GitCompare, category: 'data' },
  { name: 'Reports', href: '/reports', icon: FileText, category: 'data' },
];

const bottomNavItems: NavItem[] = [
  { name: 'Locations', href: '/locations', icon: MapPin, category: 'settings' },
];

const comingSoonItems: NavItem[] = [
  { name: 'Audit', href: '/audit', icon: ShieldCheck, category: 'tools' },
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

  // Group items by category
  const groupedItems = navItems.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  // Define category order - overview first
  const categoryOrder = ['overview', 'management', 'operations', 'data', 'settings', 'tools', 'other'];

  const categoryLabels: Record<string, string> = {
    overview: 'Overview',
    management: 'Management',
    operations: 'Operations',
    data: 'Data & Analytics',
    settings: 'Settings',
    tools: 'Tools',
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-[60] p-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-modern-lg hover:shadow-modern-xl active:scale-95 transition-all border border-slate-700/50 hover-lift"
        aria-label="Toggle menu"
        style={{ minWidth: '44px', minHeight: '44px' }}
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - New Design */}
      <aside
        className={`bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-300 ease-in-out flex flex-col h-screen fixed left-0 top-0 z-50 shadow-modern-2xl border-r border-slate-700/50
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'w-[280px] md:w-20' : 'w-[280px] md:w-72'}`}
      >
        {/* Logo Section - Enhanced */}
        <div className="p-5 flex items-center justify-between border-b border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-800/50 backdrop-blur-sm">
          <Link
            href="/dashboard"
            onClick={handleLinkClick}
            className="flex items-center justify-center flex-1 group"
          >
            <div className="relative">
              <img
                src="/vhkc-logo.png"
                alt="VHKC Staff Portal"
                width={isCollapsed ? 40 : 140}
                height={isCollapsed ? 40 : 40}
                className="object-contain transition-all duration-300 group-hover:scale-105"
              />
              {!isCollapsed && (
                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-blue-500 to-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              )}
            </div>
          </Link>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl hover:bg-slate-700/50 transition-all hidden md:flex items-center justify-center ml-2 border border-slate-700/50 hover:border-slate-600/50 hover-lift"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-slate-300 transition-transform hover:translate-x-1" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-slate-300 transition-transform hover:-translate-x-1" />
            )}
          </button>
        </div>

        {/* Season Selector - Enhanced */}
        {(!isCollapsed || (mounted && isMobile)) && (
          <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm relative" style={{ zIndex: 60, overflow: 'visible' }}>
            <SeasonSelector />
          </div>
        )}

        {/* Navigation - New Grouped Layout */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto flex flex-col scrollbar-hide">
          {/* Main Navigation Items - Grouped by Category */}
          <div className="flex-1 space-y-6">
            {categoryOrder
              .filter(category => groupedItems[category] && groupedItems[category].length > 0)
              .map((category) => {
                const items = groupedItems[category];
                return (
              <div key={category} className="space-y-2">
                {(!isCollapsed || (mounted && isMobile)) && (
                  <div className="px-4 py-2 mb-2">
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                      {categoryLabels[category] || category}
                    </span>
                  </div>
                )}
                {items.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-out active:scale-95 animate-fadeIn ${
                        isActive
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 glow-primary-sm'
                          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                      }`}
                      style={{ 
                        minHeight: '44px',
                        animationDelay: `${index * 0.02}s`,
                        animationFillMode: 'both'
                      }}
                    >
                      <Icon 
                        className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${
                          isActive ? 'scale-110' : 'group-hover:scale-105 group-hover:rotate-3'
                        }`} 
                      />
                      {(!isCollapsed || (mounted && isMobile)) && (
                        <span className="font-medium transition-opacity duration-200">
                          {item.name}
                        </span>
                      )}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg animate-pulse-glow" />
                      )}
                    </Link>
                  );
                })}
              </div>
                );
              })}
          </div>
          
          {/* Bottom Navigation Items */}
          <div className="pt-4 border-t border-slate-700/50 space-y-2">
            {(!isCollapsed || (mounted && isMobile)) && (
              <div className="px-4 py-2 mb-2">
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                  {categoryLabels[bottomNavItems[0]?.category || 'settings']}
                </span>
              </div>
            )}
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-out active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 glow-primary-sm'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  <Icon 
                    className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${
                      isActive ? 'scale-110' : 'group-hover:scale-105 group-hover:rotate-3'
                    }`} 
                  />
                  {(!isCollapsed || (mounted && isMobile)) && (
                    <span className="font-medium transition-opacity duration-200">
                      {item.name}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg animate-pulse-glow" />
                  )}
                </Link>
              );
            })}
          </div>
          
          {/* Coming Soon Section */}
          <div className="pt-4 border-t border-slate-700/50 space-y-2">
            {(!isCollapsed || (mounted && isMobile)) && (
              <div className="px-4 py-2 mb-2">
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Coming Soon</span>
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
                  className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-out ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                      : 'text-slate-400 hover:bg-slate-700/30 hover:text-slate-300 opacity-60'
                  }`}
                >
                  <Icon 
                    className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${
                      isActive ? 'scale-110' : 'group-hover:scale-105'
                    }`} 
                  />
                  {(!isCollapsed || (mounted && isMobile)) && (
                    <span className="font-medium transition-opacity duration-200">
                      {item.name}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg" />
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
