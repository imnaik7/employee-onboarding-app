import { Stack } from 'expo-router';

export default function CandidatesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="schedule" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
