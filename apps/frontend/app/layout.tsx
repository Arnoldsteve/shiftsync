import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css';
import '@shiftsync/ui/styles';
import { Toaster, cn } from '@shiftsync/ui';
import { AuthProvider } from '@/contexts/auth-context';
import { QueryProvider } from '@/providers/query-provider';
import { WebSocketProvider } from '@/contexts/websocket-context';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ShiftSync - Staff Scheduling Platform',
  description: 'Multi-location staff scheduling system with real-time updates',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <WebSocketProvider>
              {children}
              <Toaster />
            </WebSocketProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
