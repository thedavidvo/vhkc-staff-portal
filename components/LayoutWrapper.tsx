'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useSidebar } from '@/components/SidebarContext';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();
  const isLoginPage = pathname === '/' || pathname === '/login';
  
  if (isLoginPage) {
    return <>{children}</>;
  }
  
  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* New Layout: Sidebar on left, content area with header */}
      <div className="flex min-h-screen">
        <Sidebar />
        <div className={`flex-1 transition-all duration-300 ml-0 ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}>
          <div className="min-h-screen flex flex-col">
            {/* Content area with custom spacing */}
            <div className="flex-1">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
