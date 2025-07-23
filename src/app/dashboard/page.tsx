'use client';

import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Redirect to scan page as the new home
  useEffect(() => {
    router.replace('/dashboard/scan');
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Redirecting...</p>
      </div>
    </div>
  );
}