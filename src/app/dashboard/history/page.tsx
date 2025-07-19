import { Heading } from '@/components/heading';
import { Text } from '@/components/text';

export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <Heading>Analysis History</Heading>
        <Text className="mt-4">
          Your complete scan history and past analyses.
        </Text>
      </div>
      
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
        <Text className="text-zinc-500 dark:text-zinc-400">
          No analysis history available yet. Your completed scans and reports will be stored here for future reference.
        </Text>
      </div>
    </div>
  );
}