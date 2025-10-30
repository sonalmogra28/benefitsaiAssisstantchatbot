/**
 * Subdomain root page - redirects to login
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SubdomainPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page
    router.push('/subdomain/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  );
}
