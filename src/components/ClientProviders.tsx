'use client';

import { useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/AuthContext';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleContextmenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextmenu);
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('contextmenu', handleContextmenu);
      document.removeEventListener('copy', handleCopy);
    };
  }, []);

  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  );
}
