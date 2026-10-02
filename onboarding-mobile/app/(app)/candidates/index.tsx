import React from 'react';
import { useRouter } from 'expo-router';
import { RefreshControl, SectionList, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Input, Text, XStack, YStack, useTheme } from 'tamagui';

import {
  EmptyState,
  ErrorState,
  FilterChipRow,
  FloatingActionButton,
  LoadingState,
  ScreenHeader,
} from '@/components';
import { CandidateRow } from '@/components/onboarding';
import { listCandidates, STATUSES } from '@/services/onboarding';
import type { Candidate } from '@/services/onboarding';

export default function PipelineScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<string>('all');
  const [refreshing, setRefreshing] = React.useState(false);
  const [isNavigating, setIsNavigating] = React.useState(false);

  const query = useQuery({
    queryKey: ['candidates'],
    queryFn: listCandidates,
    refetchOnMount: 'always',
  });

  const all: Candidate[] = React.useMemo(() => query.data ?? [], [query.data]);

  const counts = React.useMemo(() => {
    const m = new Map<string, number>();
    all.forEach((c) => m.set(c.status, (m.get(c.status) ?? 0) + 1));
    return m;
  }, [all]);

  const chips = React.useMemo(
    () => [
      { key: 'all', label: 'All', count: all.length },
      ...STATUSES.filter((s) => (counts.get(s) ?? 0) > 0).map((s) => ({
        key: s,
        label: s,
        count: counts.get(s) ?? 0,
      })),
    ],
    [all.length, counts]
  );

  // Reset filter if the selected status disappeared
  React.useEffect(() => {
    if (filter !== 'all' && (counts.get(filter) ?? 0) === 0) setFilter('all');
  }, [counts, filter]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((c) => {
      if (filter !== 'all' && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.position.toLowerCase().includes(q) ||
        c.hiringManager.toLowerCase().includes(q)
      );
    });
  }, [all, filter, search]);

  const sections = React.useMemo(
    () =>
      STATUSES.map((s) => ({
        title: s,
        data: filtered.filter((c) => c.status === s),
      })).filter((s) => s.data.length > 0),
    [filtered]
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const openCandidate = React.useCallback(
    (id: number) => {
      if (isNavigating) return;
      setIsNavigating(true);
      try {
        router.push(`/candidates/${id}` as never);
      } finally {
        setTimeout(() => setIsNavigating(false), 600);
      }
    },
    [isNavigating, router]
  );

  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />;

  const empty =
    all.length === 0 ? (
      <EmptyState
        icon="people-outline"
        title="No candidates yet"
        message="Capture a resume to add the first candidate to your pipeline."
        actionLabel="Add resume"
        onAction={() => router.push('/capture' as never)}
      />
    ) : (
      <EmptyState
        icon="search-outline"
        title="No matching candidates"
        message={
          search.trim()
            ? `Nothing matches "${search.trim()}"${filter !== 'all' ? ` in ${filter}` : ''}.`
            : `No candidates in ${filter}.`
        }
        actionLabel="Clear filters"
        onAction={() => {
          setSearch('');
          setFilter('all');
        }}
      />
    );

  const renderItem = ({ item }: { item: Candidate }) => (
    <CandidateRow candidate={item} onPress={() => openCandidate(item.id)} />
  );

  let body: React.ReactNode;
  if (query.isLoading) {
    body = <LoadingState rows={6} />;
  } else if (query.isError) {
    console.error('[Pipeline] load failed', query.error);
    body = (
      <ErrorState
        message="Couldn't load candidates. Check your connection and try again."
        onRetry={() => void query.refetch()}
      />
    );
  } else if (filter === 'all') {
    body = (
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <XStack px="$5" py="$2" bg="$surface0" items="center" gap="$2">
            <Text fontSize="$3" fontWeight="600" color="$color11">
              {section.title}
            </Text>
            <Text fontSize="$3" color="$color10">
              {section.data.length}
            </Text>
          </XStack>
        )}
        stickySectionHeadersEnabled
        ListEmptyComponent={empty}
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        ItemSeparatorComponent={() => <YStack height={8} />}
        keyboardShouldPersistTaps="handled"
      />
    );
  } else {
    body = (
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={empty}
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        ItemSeparatorComponent={() => <YStack height={8} />}
        keyboardShouldPersistTaps="handled"
      />
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.surface0.val }}>
      <StatusBar style="auto" />
      <YStack flex={1} bg="$surface0">
        <ScreenHeader
          title="Candidates"
          subtitle={
            query.data ? `${all.length} ${all.length === 1 ? 'candidate' : 'candidates'}` : undefined
          }
        />
        <XStack
          mx="$4"
          mt="$3"
          px="$3"
          items="center"
          gap="$2"
          bg="$surface1"
          rounded="$4"
        >
          <Ionicons name="search" size={18} color={theme.color10.val} />
          <Input
            flex={1}
            unstyled
            height={44}
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, email, position, manager"
            placeholderTextColor="$color10"
            color="$color12"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            aria-label="Search candidates"
          />
          {search.length > 0 && (
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.color10.val}
              onPress={() => setSearch('')}
              accessibilityLabel="Clear search"
            />
          )}
        </XStack>
        {chips.length > 1 && (
          <YStack py="$3">
            <FilterChipRow options={chips} selectedKey={filter} onChange={setFilter} />
          </YStack>
        )}
        <YStack flex={1}>{body}</YStack>
        <FloatingActionButton
          label="+ Resume"
          iconName="add"
          extended
          onPress={() => router.push('/capture' as never)}
        />
      </YStack>
    </SafeAreaView>
  );
}
