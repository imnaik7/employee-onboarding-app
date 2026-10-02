import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Text, XStack, YStack, useTheme } from 'tamagui';

import {
  BottomActionBar,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
} from '@/components';
import { CandidateStatusBadge, ProgressBar } from '@/components/onboarding';
import {
  TASK_CATEGORIES,
  createDefaultTasks,
  getCandidate,
  listTasks,
  setStatus,
  setTaskDone,
} from '@/services/onboarding';
import type { OnboardingTask } from '@/services/onboarding';
import { formatDate } from '@/utils';

function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function JoinerChecklistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const qc = useQueryClient();
  const candidateId = Number(id);
  const validId = Number.isFinite(candidateId) && candidateId > 0;
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [isNavigating, setIsNavigating] = React.useState(false);

  const candidateQuery = useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: () => getCandidate(candidateId),
    enabled: validId,
    refetchOnMount: 'always',
  });
  const tasksQuery = useQuery({
    queryKey: ['tasks', candidateId],
    queryFn: () => listTasks(candidateId),
    enabled: validId,
    refetchOnMount: 'always',
  });

  const candidate = candidateQuery.data;
  const tasks: OnboardingTask[] = React.useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const onboarded = candidate?.status === 'Onboarded';

  const toggleMutation = useMutation({
    mutationFn: ({ task }: { task: OnboardingTask }) => setTaskDone(task.id, !task.isDone),
    onMutate: async ({ task }) => {
      setActionError(null);
      await qc.cancelQueries({ queryKey: ['tasks', candidateId] });
      const previous = qc.getQueryData<OnboardingTask[]>(['tasks', candidateId]);
      qc.setQueryData<OnboardingTask[]>(['tasks', candidateId], (old) =>
        (old ?? []).map((t) => (t.id === task.id ? { ...t, isDone: !t.isDone } : t)),
      );
      return { previous };
    },
    onError: (e, _vars, ctx) => {
      console.error('[joiner-checklist] toggle failed', e);
      if (ctx?.previous) qc.setQueryData(['tasks', candidateId], ctx.previous);
      setActionError("Couldn't update that task. Please try again.");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!candidate) throw new Error('Candidate not loaded');
      await createDefaultTasks(candidate);
    },
    onSuccess: () => {
      setActionError(null);
      void qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (e) => {
      console.error('[joiner-checklist] create checklist failed', e);
      setActionError("Couldn't create the checklist. Please try again.");
    },
  });

  const onboardMutation = useMutation({
    mutationFn: () => setStatus(candidateId, 'Onboarded'),
    onSuccess: () => {
      setActionError(null);
      void qc.invalidateQueries({ queryKey: ['candidate', candidateId] });
      void qc.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: (e) => {
      console.error('[joiner-checklist] onboard failed', e);
      setActionError("Couldn't mark as onboarded. Please try again.");
    },
  });

  const goBack = React.useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    try {
      if (router.canGoBack()) router.back();
      else router.navigate('/(app)/joiners');
    } finally {
      setTimeout(() => setIsNavigating(false), 400);
    }
  }, [isNavigating, router]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([candidateQuery.refetch(), tasksQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [candidateQuery, tasksQuery]);

  const backBar = (
    <XStack px="$3" py="$2" items="center">
      <Pressable
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel="Back to joiners"
        hitSlop={8}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="chevron-back" size={26} color={theme.color12.val} />
      </Pressable>
    </XStack>
  );

  if (!validId) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.background.val }}>
        <StatusBar style="auto" />
        {backBar}
        <ErrorState title="Joiner not found" message="This joiner link is invalid." onRetry={goBack} />
      </SafeAreaView>
    );
  }

  if (candidateQuery.isLoading || tasksQuery.isLoading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.background.val }}>
        <StatusBar style="auto" />
        {backBar}
        <LoadingState variant="detail" rows={6} />
      </SafeAreaView>
    );
  }

  if (candidateQuery.isError || tasksQuery.isError || !candidate) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.background.val }}>
        <StatusBar style="auto" />
        {backBar}
        <ErrorState
          message="Couldn't load this checklist. Check your connection and try again."
          onRetry={() => {
            void candidateQuery.refetch();
            void tasksQuery.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.isDone).length;
  const allDone = total > 0 && doneCount === total;
  const today = todayKey();
  const canOnboard = allDone && candidate.status === 'Accepted';

  const sections = TASK_CATEGORIES.map((cat) => ({
    category: cat,
    items: tasks.filter((t) => t.category === cat),
  })).filter((s) => s.items.length > 0);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.background.val }}>
      <StatusBar style="auto" />
      {backBar}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <YStack px="$5" pb="$4" gap="$2">
          <XStack items="center" gap="$2" flexWrap="wrap">
            <Text fontSize={26} fontWeight="700" color="$color12">{candidate.fullName}</Text>
            <CandidateStatusBadge status={candidate.status} />
          </XStack>
          <Text fontSize="$4" color="$color11" numberOfLines={1}>{candidate.position}</Text>
          {candidate.startDate ? (
            <Text fontSize="$3" color="$color10">Joins {formatDate(candidate.startDate)}</Text>
          ) : null}
          {candidate.hiringManager ? (
            <Text fontSize="$3" color="$color10">Hiring manager: {candidate.hiringManager}</Text>
          ) : null}
        </YStack>

        {onboarded && (
          <XStack
            mx="$5"
            mb="$4"
            p="$3"
            gap="$3"
            items="center"
            rounded="$4"
            bg="$statusCompleteBg"
            accessibilityRole="summary"
          >
            <Ionicons name="sparkles" size={24} color={theme.statusComplete.val} />
            <YStack flex={1}>
              <Text fontWeight="700" color="$statusComplete">Welcome aboard!</Text>
              <Text fontSize="$3" color="$statusComplete">
                {candidate.fullName} is fully onboarded.
              </Text>
            </YStack>
          </XStack>
        )}

        {total > 0 && (
          <YStack px="$5" pb="$4" gap="$2">
            <XStack items="baseline" justify="space-between">
              <Text fontSize="$9" fontWeight="700" color="$color12">
                {Math.round((doneCount / total) * 100)}%
              </Text>
              <Text fontSize="$4" color="$color11">{doneCount} of {total} done</Text>
            </XStack>
            <ProgressBar value={doneCount / total} tone={allDone ? 'accent' : 'warning'} />
          </YStack>
        )}

        {actionError && (
          <XStack mx="$5" mb="$3" p="$3" gap="$2" items="center" rounded="$3" bg="$statusOverdueBg">
            <Ionicons name="alert-circle" size={18} color={theme.statusOverdue.val} />
            <Text flex={1} color="$statusOverdue" fontSize="$3">{actionError}</Text>
          </XStack>
        )}

        {total === 0 ? (
          <EmptyState
            icon="checkbox-outline"
            title="No checklist yet"
            message="Create the standard onboarding checklist for this joiner."
            actionLabel={createMutation.isPending ? 'Creating…' : 'Create checklist'}
            onAction={() => {
              if (createMutation.isPending || onboarded) return;
              createMutation.mutate();
            }}
          />
        ) : (
          <YStack px="$5" gap="$5">
            {sections.map((section) => (
              <YStack key={section.category}>
                <SectionHeader title={section.category} />
                {section.items.map((task) => {
                  const overdue = !task.isDone && !!task.dueDate && task.dueDate < today;
                  return (
                    <Pressable
                      key={task.id}
                      role="checkbox"
                      aria-checked={task.isDone}
                      aria-disabled={onboarded}
                      accessibilityLabel={task.title}
                      disabled={onboarded}
                      onPress={() => toggleMutation.mutate({ task })}
                      style={{ minHeight: 56, justifyContent: 'center' }}
                    >
                      <XStack
                        items="center"
                        gap="$3"
                        py="$2"
                        borderBottomWidth={0.5}
                        borderBottomColor="$borderColor"
                        opacity={onboarded ? 0.6 : 1}
                      >
                        <YStack width={44} height={44} items="center" justify="center">
                          <Ionicons
                            name={task.isDone ? 'checkmark-circle' : 'ellipse-outline'}
                            size={28}
                            color={task.isDone ? theme.statusComplete.val : theme.color10.val}
                          />
                        </YStack>
                        <YStack flex={1} gap="$1">
                          <Text
                            fontSize="$4"
                            fontWeight="600"
                            color={task.isDone ? '$color10' : '$color12'}
                            textDecorationLine={task.isDone ? 'line-through' : 'none'}
                            numberOfLines={2}
                          >
                            {task.title}
                          </Text>
                          <XStack gap="$3" flexWrap="wrap">
                            {task.owner ? (
                              <Text fontSize="$2" color="$color10">{task.owner}</Text>
                            ) : null}
                            {task.dueDate ? (
                              <Text
                                fontSize="$2"
                                color={overdue ? '$statusOverdue' : '$color10'}
                                fontWeight={overdue ? '700' : '400'}
                              >
                                {overdue ? 'Overdue · ' : 'Due '}
                                {formatDate(task.dueDate)}
                              </Text>
                            ) : null}
                          </XStack>
                        </YStack>
                      </XStack>
                    </Pressable>
                  );
                })}
              </YStack>
            ))}
          </YStack>
        )}
      </ScrollView>

      {canOnboard && (
        <BottomActionBar>
          <Button
            bg="$blue10"
            disabled={onboardMutation.isPending}
            onPress={() => {
              if (onboardMutation.isPending) return;
              onboardMutation.mutate();
            }}
          >
            <Button.Text color="$accentOnAccent">
              {onboardMutation.isPending ? 'Saving…' : 'Mark as onboarded'}
            </Button.Text>
          </Button>
        </BottomActionBar>
      )}
    </SafeAreaView>
  );
}
