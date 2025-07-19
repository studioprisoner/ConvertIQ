import { Heading } from '@/components/heading';
import { Text } from '@/components/text';

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <Heading>Reports</Heading>
        <Text className="mt-4">
          Your conversion analysis reports will appear here.
        </Text>
      </div>
      
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
        <Text className="text-zinc-500 dark:text-zinc-400">
          No reports available yet. Start by scanning a webpage to generate your first conversion analysis report.
        </Text>
      </div>
    </div>
  );
}