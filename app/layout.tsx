import type { Metadata } from 'next';
import './globals.css';
import LayoutWrapper from '@/components/LayoutWrapper';
import { SidebarProvider } from '@/components/SidebarContext';
import { SeasonProvider } from '@/components/SeasonContext';

export const metadata: Metadata = {
  title: 'VHKC Staff Portal',
  description: 'Staff portal for managing go kart drivers, races, and performance data',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body className="antialiased overflow-x-hidden">
        <SidebarProvider>
          <SeasonProvider>
            <LayoutWrapper>{children}</LayoutWrapper>
          </SeasonProvider>
        </SidebarProvider>
      </body>
    </html>
  );
}

