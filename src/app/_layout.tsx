import { Stack } from 'expo-router';
import { GluestackProvider } from '@/components/ui/GluestackProvider';

export default function RootLayout() {
  return (
    <GluestackProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </GluestackProvider>
  );
}
