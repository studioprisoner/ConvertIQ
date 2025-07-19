'use client';

import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // The application layout handles authentication, so we can trust that session exists here
  const user = session?.user;

  return (
    <div className="space-y-8">
      <div>
        <Heading>Welcome to ConvertIQ</Heading>
        <Text className="mt-4">
          Your conversion optimization journey starts here. Use the sidebar to navigate between reports and analysis history.
        </Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
            Quick Scan
          </h3>
          <Text className="text-sm mb-4">
            Analyze a webpage for conversion opportunities
          </Text>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
            Start New Scan
          </button>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
            Recent Reports
          </h3>
          <Text className="text-sm mb-4">
            View your latest conversion analysis reports
          </Text>
          <button 
            onClick={() => router.push('/reports')}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            View Reports
          </button>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
            Analysis History
          </h3>
          <Text className="text-sm mb-4">
            Browse your complete scan history
          </Text>
          <button 
            onClick={() => router.push('/history')}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            View History
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Name:</span>
            <span className="ml-2 text-zinc-900 dark:text-white">{user.name || 'Not set'}</span>
          </div>
          <div>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Email:</span>
            <span className="ml-2 text-zinc-900 dark:text-white">{user.email}</span>
          </div>
          <div>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Email Verified:</span>
            <span className="ml-2 text-zinc-900 dark:text-white">{user.emailVerified ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">User ID:</span>
            <span className="ml-2 text-zinc-900 dark:text-white">{user.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}