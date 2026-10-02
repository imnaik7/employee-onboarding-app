import React from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { FlatList, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { Text, XStack, YStack } from 'tamagui';
import {
  AvatarInitials,
  EmptyState,
  ErrorState,
  FilterChipRow,
  LoadingState,
  ScreenHeader,
} from '@/components';
import { CandidateStatusBadge, ProgressBar } from '@/components/onboarding';
import { getCurrentUser } from '@/services/currentUser';
import { listCandidates, listTasks, type Candidate, type OnboardingTask } from '@/services/onboarding';
import { formatDate } from '@/utils';

type Scope = 'mine' | 'all';

type JoinerStats = { total: number; done: number; overdue: number };

function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function JoinerCard({
  candidate,
  stats,
  onPress,
}: {
  candidate: Candidate;
  stats: JoinerStats;
  onPress: () => void;
}) {
  const hasChecklist = stats.total > 0;
  const progress = hasChecklist ? stats.done / stats.total : 0;
  return (
    <Pressable onPress={onPress} role="button" aria-label={`Open checklist for ${candidate.fullName}`}>
      <YStack bg="$surface1" rounded="$5" p="$3" gap="$3" borderWidth={1} borderColor="$surface3">
        <XStack gap="$3" items="center">
          <AvatarInitials name={candidate.fullName} />
          <YStack flex={1} gap="$1">
            <Text fontSize="$4" fontWeight="600" color="$text0" numberOfLines={1}>
              {candidate.fullName}
            </Text>
            <Text fontSize="$2" color="$text1" numberOfLines={1}>
              {candidate.position || 'Position not set'}
            </Text>
          </YStack>
          <CandidateStatusBadge status={candidate.status} />
        </XStack>
        <ProgressBar value={progress} tone={stats.overdue > 0 ? 'warning' : 'accent'} />
        <XStack items="center" justify="space-between" gap="$2">
          <Text fontSize="$2" color={stats.overdue > 0 ? '$statusPending' : '$text1'} flex={1} numberOfLines={1}>
            {hasChecklist ? `${stats.done}/${stats.total} tasks · ${stats.overdue} overdue` : 'Checklist pending'}
          </Text>
          {!!candidate.startDate && (
            <XStack bg="$surface2" rounded="$10" px="$3" py="$1">
              <Text fontSize="$1" fontWeight="600" color="$text1">
                Joins {formatDate(candidate.startDate)}
              </Text>
            </XStack>
          )}
        </XStack>
      </YStack>
    </Pressable>
  );
}

export default function MyJoinersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [scope, setScope] = React.useState<Scope>('mine');
  const [refreshing, setRefreshing] = React.useState(false);
  const [isNavigating, setIsNavigating] = React.useState(false);

  const meQuery = useQuery({ queryKey: ['me'], queryFn: getCurrentUser });
  const candidatesQuery = useQuery({
    queryKey: ['candidates'],
    refetchOnMount: 'always',
    queryFn: listCandidates,
  });
  const tasksQuery = useQuery({
    queryKey: ['tasks', 'all'],
    refetchOnMount: 'always',
    queryFn: () => listTasks(),
  });

  const refetchCandidates = candidatesQuery.refetch;
  const refetchTasks = tasksQuery.refetch;
  const refetchMe = meQuery.refetch;

  useFocusEffect(
    React.useCallback(() => {
      void refetchCandidates();
      void refetchTasks();
    }, [refetchCandidates, refetchTasks]),
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchMe(), refetchCandidates(), refetchTasks()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchMe, refetchCandidates, refetchTasks]);

  const myEmail = (meQuery.data?.email ?? '').toLowerCase();

  const joiners = React.useMemo(() => {
    const list = (candidatesQuery.data ?? []).filter(
      (c) => c.status === 'Accepted' || c.status === 'Onboarded',
    );
    return list.sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return a.startDate.localeCompare(b.startDate);
    });
  }, [candidatesQuery.data]);

  const mine = React.useMemo(
    () => joiners.filter((c) => !!myEmail && c.managerEmail.toLowerCase() === myEmail),
    [joiners, myEmail],
  );

  const statsByCandidate = React.useMemo(() => {
    const today = todayKey();
    const map = new Map<number, JoinerStats>();
    (tasksQuery.data ?? []).forEach((t: OnboardingTask) => {
      const s = map.get(t.candidateId) ?? { total: 0, done: 0, overdue: 0 };
      s.total += 1;
      if (t.isDone) s.done += 1;
      else if (t.dueDate && t.dueDate < today) s.overdue += 1;
      map.set(t.candidateId, s);
    });
    return map;
  }, [tasksQuery.data]);

  const openJoiner = React.useCallback(
    (id: number) => {
      if (isNavigating) return;
      setIsNavigating(true);
      try {
        router.push(`/joiners/${id}`);
      } finally {
        setTimeout(() => setIsNavigating(false), 600);
      }
    },
    [isNavigating, router],
  );

  const header = <ScreenHeader title="Joiners" />;

  if (meQuery.isLoading || candidatesQuery.isLoading || tasksQuery.isLoading) {
    return (
      <YStack flex={1} bg="$surface0" pt={insets.top}>
        <StatusBar style="auto" />
        {header}
        <LoadingState rows={4} />
      </YStack>
    );
  }

  if (meQuery.isError || candidatesQuery.isError || tasksQuery.isError) {
    console.error('[My Joiners] load failed', meQuery.error, candidatesQuery.error, tasksQuery.error);
    return (
      <YStack flex={1} bg="$surface0" pt={insets.top}>
        <StatusBar style="auto" />
        {header}
        <ErrorState
          message="Couldn't load joiners. Check your connection and try again."
          onRetry={() => void onRefresh()}
        />
      </YStack>
    );
  }

  const items = scope === 'mine' ? mine : joiners;
  const noneMineButSomeAll = scope === 'mine' && mine.length === 0 && joiners.length > 0;

  return (
    <YStack flex={1} bg="$surface0" pt={insets.top}>
      <StatusBar style="auto" />
      {header}
      <YStack py="$3">
        <FilterChipRow
          options={[
            { key: 'mine', label: 'My joiners', count: mine.length },
            { key: 'all', label: 'All joiners', count: joiners.length },
          ]}
          selectedKey={scope}
          onChange={(key) => setScope(key as Scope)}
        />
      </YStack>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 12, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          noneMineButSomeAll ? (
            <EmptyState
              icon="people-outline"
              title="No joiners report to you"
              message="Nobody accepted or onboarded lists you as hiring manager. Switch to All joiners to see everyone."
              actionLabel="Show all joiners"
              onAction={() => setScope('all')}
            />
          ) : (
            <EmptyState
              icon="people-outline"
              title="No joiners yet"
              message="Candidates who accept an offer will appear here with their onboarding checklist."
            />
          )
        }
        renderItem={({ item }) => (
          <JoinerCard
            candidate={item}
            stats={statsByCandidate.get(item.id) ?? { total: 0, done: 0, overdue: 0 }}
            onPress={() => openJoiner(item.id)}
          />
        )}
      />
    </YStack>
  );
}
