import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { YStack } from 'tamagui';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  ScreenHeader,
  FilterChipRow,
} from '@/components';
import { InterviewCard } from '@/components/onboarding';
import { getCurrentUser } from '@/services/currentUser';
import { listCandidates, listInterviews, type Candidate, type Interview } from '@/services/onboarding';

type SegmentKey = 'upcoming' | 'awaiting' | 'completed';

const EMPTY_COPY: Record<SegmentKey, { icon: 'calendar-outline' | 'create-outline' | 'checkmark-done-outline'; title: string; message: string }> = {
  upcoming: {
    icon: 'calendar-outline',
    title: 'No upcoming interviews',
    message: 'Interviews scheduled for you will appear here.',
  },
  awaiting: {
    icon: 'create-outline',
    title: 'No feedback pending',
    message: 'Interviews that have started and need a result will appear here.',
  },
  completed: {
    icon: 'checkmark-done-outline',
    title: 'No completed interviews',
    message: 'Interviews you have recorded a result for will appear here.',
  },
};

const ts = (i: Interview): number => new Date(i.scheduledStart).getTime();

export default function MyInterviewsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [segment, setSegment] = React.useState<SegmentKey>('upcoming');
  const [refreshing, setRefreshing] = React.useState(false);
  const [isNavigating, setIsNavigating] = React.useState(false);

  const query = useQuery({
    queryKey: ['interviews', 'mine'],
    refetchOnMount: 'always',
    queryFn: async () => {
      const me = await getCurrentUser();
      const [interviews, candidates] = await Promise.all([
        listInterviews({ interviewerEmail: me.email }),
        listCandidates(),
      ]);
      return { interviews, candidates };
    },
  });
  const { refetch } = query;

  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const candidateById = React.useMemo(() => {
    const map = new Map<number, Candidate>();
    (query.data?.candidates ?? []).forEach((c) => map.set(c.id, c));
    return map;
  }, [query.data]);

  const groups = React.useMemo(() => {
    const now = Date.now();
    const all = query.data?.interviews ?? [];
    const upcoming = all
      .filter((i) => i.result === 'Scheduled' && ts(i) >= now)
      .sort((a, b) => ts(a) - ts(b));
    const awaiting = all
      .filter((i) => i.result === 'Scheduled' && ts(i) < now)
      .sort((a, b) => ts(a) - ts(b));
    const completed = all
      .filter((i) => i.result !== 'Scheduled')
      .sort((a, b) => ts(b) - ts(a));
    return { upcoming, awaiting, completed };
  }, [query.data]);

  const openInterview = React.useCallback(
    (id: number) => {
      if (isNavigating) return;
      setIsNavigating(true);
      try {
        router.push(`/interviews/${id}`);
      } finally {
        setTimeout(() => setIsNavigating(false), 600);
      }
    },
    [isNavigating, router],
  );

  const header = (
    <>
      <ScreenHeader title="My interviews" />
    </>
  );

  if (query.isLoading) {
    return (
      <YStack flex={1} bg="$surface0" pt={insets.top}>
        <StatusBar style="auto" />
        {header}
        <LoadingState rows={4} />
      </YStack>
    );
  }

  if (query.isError) {
    console.error('[My Interviews] load failed', query.error);
    return (
      <YStack flex={1} bg="$surface0" pt={insets.top}>
        <StatusBar style="auto" />
        {header}
        <ErrorState message="Couldn't load your interviews. Check your connection and try again." onRetry={() => void refetch()} />
      </YStack>
    );
  }

  const items = groups[segment];
  const empty = EMPTY_COPY[segment];

  return (
    <YStack flex={1} bg="$surface0" pt={insets.top}>
      <StatusBar style="auto" />
      {header}
      <YStack py="$3">
        <FilterChipRow
          options={[
            { key: 'upcoming', label: 'Upcoming', count: groups.upcoming.length },
            { key: 'awaiting', label: 'Awaiting feedback', count: groups.awaiting.length },
            { key: 'completed', label: 'Completed', count: groups.completed.length },
          ]}
          selectedKey={segment}
          onChange={(key) => setSegment(key as SegmentKey)}
        />
      </YStack>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState icon={empty.icon} title={empty.title} message={empty.message} />}
        renderItem={({ item }) => (
          <InterviewCard
            interview={item}
            candidate={candidateById.get(item.candidateId)}
            onPress={() => openInterview(item.id)}
            onJoin={() => void WebBrowser.openBrowserAsync(item.meetingLink)}
          />
        )}
      />
    </YStack>
  );
}
