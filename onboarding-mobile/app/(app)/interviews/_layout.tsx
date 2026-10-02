import { Stack } from 'expo-router';

export default function InterviewsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="result" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
