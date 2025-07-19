import { Heading } from '@/components/heading';
import { Text } from '@/components/text';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <Heading>Settings</Heading>
        <Text className="mt-4">
          Manage your account settings and preferences.
        </Text>
      </div>
      
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
        <Text className="text-zinc-500 dark:text-zinc-400">
          Settings panel coming soon. Configure your account preferences, integrations, and analysis options.
        </Text>
      </div>
    </div>
  );
}