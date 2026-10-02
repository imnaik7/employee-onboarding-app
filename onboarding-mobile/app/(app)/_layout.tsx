import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useThemeTokens } from '@microsoft/power-apps-native-host';

/**
 * Protected layout — any screen inside (app)/ is only reachable when signed in.
 * Five role tabs; each folder owns an inner stack for its detail/modal screens.
 */
export default function AppLayout() {
  const { isSignedIn, isLoading } = useAuth();
  const theme = useThemeTokens();

  if (!isLoading && !isSignedIn) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accentBase,
        tabBarInactiveTintColor: theme.text2,
        tabBarStyle: { backgroundColor: theme.surface1, borderTopColor: theme.surface3 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="interviews"
        options={{ title: 'Interviews', tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="candidates"
        options={{ title: 'Candidates', tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="joiners"
        options={{ title: 'Joiners', tabBarIcon: ({ color }) => <Ionicons name="rocket-outline" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="capture"
        options={{ title: 'Capture', tabBarIcon: ({ color }) => <Ionicons name="scan-outline" size={22} color={color} /> }}
      />
    </Tabs>
  );
}
