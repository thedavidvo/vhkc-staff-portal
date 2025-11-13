import type { Metadata } from 'next';
import './globals.css';
import LayoutWrapper from '@/components/LayoutWrapper';
import { SidebarProvider } from '@/components/SidebarContext';

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <SidebarProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </SidebarProvider>
      </body>
    </html>
  );
}

