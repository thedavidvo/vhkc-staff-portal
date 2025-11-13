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
    <div className="flex min-h-screen">
      <Sidebar />
      <main className={`flex-1 transition-all duration-300 w-full ${
        isCollapsed ? 'md:ml-20' : 'md:ml-64'
      }`}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
          {children}
        </div>
      </main>
    </div>
  );
}

