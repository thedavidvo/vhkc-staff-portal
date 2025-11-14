import type { Metadata, Viewport } from 'next';
import './globals.css';
import LayoutWrapper from '@/components/LayoutWrapper';
import { SidebarProvider } from '@/components/SidebarContext';
import { SeasonProvider } from '@/components/SeasonContext';
import QueryProvider from '@/components/QueryProvider';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'VHKC | Staff Portal',
  description: 'Staff portal for managing go kart drivers, races, and performance data',
  icons: {
    icon: {
      url: '/vhkc-logo.png',
      type: 'image/png',
    },
    shortcut: {
      url: '/vhkc-logo.png',
      type: 'image/png',
    },
    apple: {
      url: '/vhkc-logo.png',
      type: 'image/png',
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body className="antialiased overflow-x-hidden">
        <QueryProvider>
          <AuthProvider>
            <SidebarProvider>
              <SeasonProvider>
                <LayoutWrapper>{children}</LayoutWrapper>
              </SeasonProvider>
            </SidebarProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

