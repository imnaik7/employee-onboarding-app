import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text, XStack, YStack } from 'tamagui';
import { useQuery } from '@tanstack/react-query';
import { ErrorState, EmptyState, Hero, LoadingState, SectionHeader, StatTile } from '@/components';
import { CandidateRow, InterviewCard } from '@/components/onboarding';
import { getCurrentUser } from '@/services/currentUser';
import { listCandidates, listInterviews } from '@/services/onboarding';
import type { Candidate, Interview } from '@/services/onboarding';

const CLOSED_STATUSES = ['Not Selected', 'Declined', 'Expired', 'Onboarded'];

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const meQuery = useQuery({ queryKey: ['me'], queryFn: getCurrentUser, refetchOnMount: 'always' });
  const email = meQuery.data?.email ?? '';

  const candidatesQuery = useQuery({
    queryKey: ['candidates'],
    queryFn: listCandidates,
    refetchOnMount: 'always',
  });
  const interviewsQuery = useQuery({
    queryKey: ['interviews', { interviewerEmail: email }],
    queryFn: () => listInterviews({ interviewerEmail: email }),
    enabled: !!email,
    refetchOnMount: 'always',
  });

  const go = React.useCallback(
    (path: string) => {
      if (isNavigating) return;
      setIsNavigating(true);
      try {
        router.push(path as never);
      } finally {
        setTimeout(() => setIsNavigating(false), 600);
      }
    },
    [isNavigating, router]
  );

  const candidates: Candidate[] = React.useMemo(() => candidatesQuery.data ?? [], [candidatesQuery.data]);
  const mine: Interview[] = React.useMemo(
    () => (interviewsQuery.data ?? []).filter((i) => i.interviewerEmail.toLowerCase() === email),
    [interviewsQuery.data, email]
  );
  const candidateById = React.useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);

  const stats = React.useMemo(() => {
    const now = new Date();
    const scheduled = mine.filter((i) => i.result === 'Scheduled');
    const today = scheduled.filter((i) => isSameDay(new Date(i.scheduledStart), now)).length;
    const awaiting = scheduled
      .filter((i) => new Date(i.scheduledStart).getTime() < now.getTime())
      .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
    const upcoming = scheduled
      .filter((i) => new Date(i.scheduledStart).getTime() >= now.getTime())
      .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
    const pipeline = candidates.filter((c) => !CLOSED_STATUSES.includes(c.status)).length;
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const joining = candidates.filter((c) => {
      if (!c.startDate || !['Accepted', 'Onboarded'].includes(c.status)) return false;
      const d = new Date(`${c.startDate}T00:00:00`);
      return d >= startOfToday && d <= horizon;
    }).length;
    const selected = candidates.filter((c) => c.status === 'Selected');
    return { today, awaiting, next: upcoming[0] ?? null, pipeline, joining, selected };
  }, [mine, candidates]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([meQuery.refetch(), candidatesQuery.refetch(), interviewsQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [meQuery, candidatesQuery, interviewsQuery]);

  const firstName = (meQuery.data?.name ?? '').split(' ')[0];
  const heroTitle = firstName ? `${greeting()}, ${firstName}` : greeting();

  const failed = meQuery.isError || candidatesQuery.isError || interviewsQuery.isError;
  const loading =
    !failed &&
    (meQuery.isLoading || candidatesQuery.isLoading || (!!email && interviewsQuery.isLoading));

  if (failed) {
    return (
      <YStack flex={1} bg="$surface0" pt={insets.top}>
        <StatusBar style="dark" />
        <ErrorState
          message="Couldn't load your dashboard. Check your connection and try again."
          onRetry={() => void onRefresh()}
        />
      </YStack>
    );
  }

  if (loading) {
    return (
      <YStack flex={1} bg="$surface0" pt={insets.top}>
        <StatusBar style="dark" />
        <LoadingState rows={5} />
      </YStack>
    );
  }

  const needsActionCount = stats.awaiting.length + stats.selected.length;

  return (
    <YStack flex={1} bg="$surface0">
      <StatusBar style="light" />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        <YStack bg="$accentBase" pt={insets.top}>
          <Hero title={heroTitle} subtitle="Here's what needs your attention today." />
        </YStack>

        <YStack px="$4" pt="$4" gap="$5">
          <YStack gap="$3">
            <XStack gap="$3">
              <StatTile label="Interviews today" value={stats.today} iconName="calendar-outline" />
              <StatTile label="Awaiting feedback" value={stats.awaiting.length} iconName="create-outline" />
            </XStack>
            <XStack gap="$3">
              <StatTile label="In pipeline" value={stats.pipeline} iconName="people-outline" />
              <StatTile label="Joining in 30 days" value={stats.joining} iconName="rocket-outline" />
            </XStack>
          </YStack>

          <YStack>
            <SectionHeader title="Next up" />
            {stats.next ? (
              <InterviewCard
                interview={stats.next}
                candidate={candidateById.get(stats.next.candidateId)}
                onPress={() => go(`/interviews/${stats.next!.id}`)}
                onJoin={() => void WebBrowser.openBrowserAsync(stats.next!.meetingLink)}
              />
            ) : (
              <YStack bg="$surface1" rounded="$5" p="$4" borderWidth={1} borderColor="$surface3">
                <Text color="$text1" fontSize="$3">
                  No upcoming interviews scheduled for you.
                </Text>
              </YStack>
            )}
          </YStack>

          <YStack>
            <SectionHeader title={needsActionCount ? `Needs action (${needsActionCount})` : 'Needs action'} />
            {needsActionCount === 0 ? (
              <EmptyState
                icon="checkmark-done-outline"
                title="You're all caught up"
                message="Interviews awaiting feedback and candidates ready for an offer will show up here."
              />
            ) : (
              <YStack gap="$3">
                {stats.awaiting.map((i) => (
                  <InterviewCard
                    key={`i-${i.id}`}
                    interview={i}
                    candidate={candidateById.get(i.candidateId)}
                    onPress={() => go(`/interviews/${i.id}`)}
                  />
                ))}
                {stats.selected.map((c) => (
                  <CandidateRow key={`c-${c.id}`} candidate={c} onPress={() => go(`/candidates/${c.id}`)} />
                ))}
              </YStack>
            )}
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
