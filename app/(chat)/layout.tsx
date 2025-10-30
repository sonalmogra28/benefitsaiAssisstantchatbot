'use client';

import Script from 'next/script';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { HydrationSafe } from '@/components/hydration-safe';

export const experimental_ppr = true;

// Create a client-only wrapper for demo mode
const ClientLayout = dynamic(() => Promise.resolve(function ClientLayout({ children }: { readonly children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full size-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <DataStreamProvider>
        <div className="flex h-screen">
          <div className="w-64 border-r bg-gray-50 p-4">
            <h2 className="text-lg font-semibold mb-4">Benefits AI Assistant</h2>
            <p className="text-sm text-gray-600">Your conversations will appear here once you start chatting!</p>
          </div>
          <div className="flex-1 flex flex-col">
            {children}
          </div>
        </div>
      </DataStreamProvider>
    </>
  );
}), { ssr: false });

export default function Layout({ children }: { readonly children: React.ReactNode }) {
  return (
    <HydrationSafe>
      <ClientLayout>{children}</ClientLayout>
    </HydrationSafe>
  );
}
