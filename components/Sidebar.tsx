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
  DollarSign,
  AlertTriangle,
  CreditCard,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  category?: string;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, category: 'overview' },
  { name: 'Season', href: '/season', icon: Calendar, category: 'management' },
  { name: 'Drivers', href: '/drivers', icon: Users, category: 'management' },
  { name: 'Check In', href: '/checkin', icon: ClipboardCheck, category: 'operations' },
  { name: 'Payments', href: '/payments', icon: DollarSign, category: 'operations' },
  { name: 'Races', href: '/races', icon: Flag, category: 'operations' },
  { name: 'Results', href: '/results', icon: FileText, category: 'data' },
  { name: 'Points', href: '/points', icon: Trophy, category: 'data' },
  { name: 'Divisions', href: '/divisions', icon: ShieldCheck, category: 'management' },
  { name: 'Standings', href: '/standings', icon: BarChart3, category: 'data' },
  { name: 'Teams', href: '/teams', icon: UsersRound, category: 'management' },
  { name: 'License', href: '/license', icon: CreditCard, category: 'management' },
  { name: 'Incidents', href: '/incidents', icon: AlertTriangle, category: 'management' },
  { name: 'Reports', href: '/reports', icon: FileText, category: 'data' },
];

const bottomNavItems: NavItem[] = [
  { name: 'Locations', href: '/locations', icon: MapPin, category: 'settings' },
];

const comingSoonItems: NavItem[] = [
  { name: 'Compare', href: '/compare', icon: GitCompare, category: 'data' },
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
        className="md:hidden fixed top-3 left-3 z-[60] p-2 bg-slate-900 text-white rounded-lg border border-slate-700"
        aria-label="Toggle menu"
        style={{ minWidth: '38px', minHeight: '38px' }}
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/45 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - New Design */}
      <aside
        className={`bg-slate-900 text-slate-100 transition-all duration-300 ease-in-out flex flex-col h-screen fixed left-0 top-0 z-50 border-r border-slate-800
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'w-[280px] md:w-20' : 'w-[280px] md:w-72'}`}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <Link
            href="/dashboard"
            onClick={handleLinkClick}
            className="flex items-center justify-center flex-1 group"
          >
            <div>
              <img
                src="/vhkc-logo.png"
                alt="VHKC Staff Portal"
                width={isCollapsed ? 40 : 140}
                height={isCollapsed ? 40 : 40}
                className="object-contain transition-all duration-200"
              />
            </div>
          </Link>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md hover:bg-slate-800 transition-colors hidden md:flex items-center justify-center ml-2 border border-slate-700"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>

        {/* Season Selector - Enhanced */}
        {(!isCollapsed || (mounted && isMobile)) && (
          <div className="px-4 py-3 border-b border-slate-800 relative" style={{ zIndex: 60, overflow: 'visible' }}>
            <SeasonSelector />
          </div>
        )}

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto flex flex-col scrollbar-hide">
          <div className="flex-1 space-y-4">
            {categoryOrder
              .filter(category => groupedItems[category] && groupedItems[category].length > 0)
              .map((category) => {
                const items = groupedItems[category];
                return (
              <div key={category} className="space-y-1.5">
                {(!isCollapsed || (mounted && isMobile)) && (
                  <div className="px-2 py-1 mb-1">
                    <span className="text-[11px] text-slate-500 uppercase font-semibold tracking-wide">
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
                      className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-sm ${
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                      style={{ minHeight: '34px' }}
                    >
                      <Icon 
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`} 
                      />
                      {(!isCollapsed || (mounted && isMobile)) && (
                        <span className="font-medium leading-tight">
                          {item.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
                );
              })}
          </div>
          
          <div className="pt-3 border-t border-slate-800 space-y-1.5">
            {(!isCollapsed || (mounted && isMobile)) && (
              <div className="px-2 py-1 mb-1">
                <span className="text-[11px] text-slate-500 uppercase font-semibold tracking-wide">
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
                  className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-sm ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  style={{ minHeight: '34px' }}
                >
                  <Icon 
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`} 
                  />
                  {(!isCollapsed || (mounted && isMobile)) && (
                    <span className="font-medium leading-tight">
                      {item.name}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          
          {comingSoonItems.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-1.5">
              {(!isCollapsed || (mounted && isMobile)) && (
                <div className="px-2 py-1 mb-1">
                  <span className="text-[11px] text-slate-500 uppercase font-semibold tracking-wide">Coming Soon</span>
                </div>
              )}
              {comingSoonItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                if (item.disabled) {
                  return (
                    <div
                      key={item.href}
                      aria-disabled="true"
                      className="group relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-slate-500 opacity-60 cursor-not-allowed"
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {(!isCollapsed || (mounted && isMobile)) && (
                        <span className="font-medium leading-tight">
                          {item.name}
                        </span>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-sm ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200 opacity-70'
                    }`}
                  >
                    <Icon 
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-500'
                      }`} 
                    />
                    {(!isCollapsed || (mounted && isMobile)) && (
                      <span className="font-medium leading-tight">
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
