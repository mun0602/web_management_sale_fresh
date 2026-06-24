import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { Inter } from 'next/font/google';
import './globals.css';
import SidebarLayout from '@/components/SidebarLayout';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'SaleKeyboard Admin Portal',
  description: 'Quản trị hệ thống SaleKeyboard',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={inter.variable}>
      <body>
        <SidebarLayout>
          {children}
          <Toaster position="top-right" />
        </SidebarLayout>
      </body>
    </html>
  );
}
