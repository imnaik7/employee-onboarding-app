import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Text, XStack, YStack, useTheme } from 'tamagui';

import {
  AvatarInitials,
  BottomActionBar,
  ErrorState,
  InfoRow,
  LoadingState,
  SectionHeader,
} from '@/components';
import {
  BreakupTable,
  CandidateStatusBadge,
  JourneyTimeline,
  ProgressBar,
  ResultPill,
  RoundPill,
  StarRating,
} from '@/components/onboarding';
import { breakupTotal, getCandidate, listInterviews, listTasks, nextRound, setStatus } from '@/services/onboarding';
import type { Candidate } from '@/services/onboarding';
import { formatDate, formatDateTime } from '@/utils';

function missingOfferFields(c: Candidate): string[] {
  const gaps: string[] = [];
  if (!c.position) gaps.push('position');
  if (!c.department) gaps.push('department');
  if (!c.startDate) gaps.push('start date');
  if (!c.workLocation) gaps.push('work location');
  if (!c.hiringManager) gaps.push('hiring manager');
  if (!c.salary) gaps.push('salary');
  else if (breakupTotal(c.breakup) !== c.salary) gaps.push('salary breakup total');
  return gaps;
}

export default function CandidateDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const qc = useQueryClient();
  const id = Number(params.id);
  const validId = Number.isFinite(id) && id > 0;
  const [refreshing, setRefreshing] = React.useState(false);
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const candidateQ = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => getCandidate(id),
    enabled: validId,
    refetchOnMount: 'always',
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'Offer Requested' || s === 'Offer Sent' ? 20000 : false;
    },
  });
  const interviewsQ = useQuery({
    queryKey: ['interviews', { candidateId: id }],
    queryFn: () => listInterviews({ candidateId: id }),
    enabled: validId,
    refetchOnMount: 'always',
  });
  const tasksQ = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => listTasks(id),
    enabled: validId,
    refetchOnMount: 'always',
  });

  const offerMutation = useMutation({
    mutationFn: () => setStatus(id, 'Offer Requested'),
    onSuccess: () => {
      setActionError(null);
      qc.invalidateQueries({ queryKey: ['candidate', id] });
      qc.invalidateQueries({ queryKey: ['candidates'] });
    },
    onError: (e) => {
      console.error('[candidate-detail] send offer failed', e);
      setActionError("Couldn't request the offer. Please try again.");
    },
  });

  const goBack = React.useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.navigate('/(app)/candidates' as never);
  }, [router]);

  const safePush = React.useCallback(
    (target: unknown) => {
      if (isNavigating) return;
      setIsNavigating(true);
      try {
        router.push(target as never);
      } finally {
        setTimeout(() => setIsNavigating(false), 600);
      }
    },
    [isNavigating, router]
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([candidateQ.refetch(), interviewsQ.refetch(), tasksQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [candidateQ, interviewsQ, tasksQ]);

  const openUrl = React.useCallback((url: string) => {
    WebBrowser.openBrowserAsync(url).catch((e) => {
      console.error('[candidate-detail] open url failed', e);
      Alert.alert('Could not open link', 'Please try again.');
    });
  }, []);

  const backBar = (
    <XStack px="$3" py="$2" items="center">
      <Pressable onPress={goBack} hitSlop={12} role="button" aria-label="Go back">
        <XStack items="center" gap="$1" minH={44}>
          <Ionicons name="chevron-back" size={24} color={theme.accentBase.val} />
          <Text color="$accentBase" fontSize="$4">Candidates</Text>
        </XStack>
      </Pressable>
    </XStack>
  );

  if (!validId) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <StatusBar style="auto" />
        {backBar}
        <ErrorState title="Candidate not found" message="This candidate link is invalid." onRetry={goBack} />
      </SafeAreaView>
    );
  }

  if (candidateQ.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <StatusBar style="auto" />
        {backBar}
        <LoadingState variant="detail" rows={8} />
      </SafeAreaView>
    );
  }

  const candidate = candidateQ.data;
  if (candidateQ.isError || !candidate) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <StatusBar style="auto" />
        {backBar}
        <ErrorState message="Couldn't load this candidate. Check your connection and try again." onRetry={() => candidateQ.refetch()} />
      </SafeAreaView>
    );
  }

  const interviews = interviewsQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const skills = candidate.skills
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const round = nextRound(interviews);
  const canSchedule = (candidate.status === 'Applied' || candidate.status === 'Interviewing') && round !== null;
  const canOffer =
    candidate.status === 'Selected' || candidate.status === 'Declined' || candidate.status === 'Expired';
  const gaps = canOffer ? missingOfferFields(candidate) : [];
  const offerLabel = candidate.status === 'Selected' ? 'Send offer' : 'Re-send offer';
  const offerPending = candidate.status === 'Offer Requested' || candidate.status === 'Offer Sent';
  const showChecklist = candidate.status === 'Accepted' || candidate.status === 'Onboarded';
  const doneCount = tasks.filter((t) => t.isDone).length;
  const hasOffer = candidate.salary !== null && candidate.salary > 0;
  const hasOfferInfo =
    hasOffer || !!candidate.offerSentOn || !!candidate.respondedOn || !!candidate.declineReason || !!candidate.signedOfferUrl;

  const confirmOffer = () => {
    if (offerMutation.isPending || gaps.length > 0) return;
    Alert.alert(
      offerLabel,
      `DocuSign will email the offer letter with the full salary breakup to ${candidate.email}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: offerLabel, onPress: () => offerMutation.mutate() },
      ]
    );
  };

  const showBar = canSchedule || canOffer;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <StatusBar style="auto" />
      <YStack flex={1} bg="$background">
        {backBar}
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <YStack gap="$6">
            {offerPending && (
              <XStack bg="$surface2" rounded="$4" p="$3" gap="$2" items="center">
                <Ionicons name="mail-outline" size={18} color={theme.accentBase.val} />
                <Text flex={1} fontSize="$3" color="$text0">
                  {candidate.status === 'Offer Requested'
                    ? 'Offer requested — DocuSign is preparing the letter. This updates automatically.'
                    : 'Offer sent — waiting for the candidate to respond. This updates automatically.'}
                </Text>
              </XStack>
            )}

            <YStack bg="$surface1" rounded="$5" p="$4" gap="$3" borderWidth={1} borderColor="$surface3">
              <XStack items="center" gap="$3">
                <AvatarInitials name={candidate.fullName} size="lg" />
                <YStack flex={1} gap="$1">
                  <Text fontSize="$7" fontWeight="700" color="$text0" numberOfLines={1}>
                    {candidate.fullName}
                  </Text>
                  <XStack>
                    <CandidateStatusBadge status={candidate.status} />
                  </XStack>
                </YStack>
              </XStack>
              <Text fontSize="$4" color="$text1" numberOfLines={1}>
                {[candidate.position, candidate.department].filter(Boolean).join(' · ') || 'Position not set'}
              </Text>
              <YStack gap="$1">
                {!!candidate.email && (
                  <XStack items="center" gap="$2">
                    <Ionicons name="mail-outline" size={14} color={theme.color10.val} />
                    <Text fontSize="$3" color="$text1" numberOfLines={1} flex={1}>{candidate.email}</Text>
                  </XStack>
                )}
                {!!candidate.phone && (
                  <XStack items="center" gap="$2">
                    <Ionicons name="call-outline" size={14} color={theme.color10.val} />
                    <Text fontSize="$3" color="$text1" numberOfLines={1} flex={1}>{candidate.phone}</Text>
                  </XStack>
                )}
              </YStack>
            </YStack>

            <YStack>
              <SectionHeader title="Journey" />
              <JourneyTimeline candidate={candidate} interviews={interviews} />
            </YStack>

            <YStack>
              <SectionHeader title="Profile" />
              <InfoRow label="Current company" value={candidate.currentCompany || '—'} />
              <InfoRow
                label="Experience"
                value={candidate.experienceYears !== null ? `${candidate.experienceYears} yrs` : '—'}
              />
              <InfoRow label="Employment type" value={candidate.employmentType || '—'} />
              <InfoRow label="Start date" value={candidate.startDate ? formatDate(candidate.startDate) : '—'} />
              <InfoRow label="Location" value={candidate.workLocation || '—'} />
              <InfoRow label="Hiring manager" value={candidate.hiringManager || '—'} />
              {skills.length > 0 && (
                <XStack flexWrap="wrap" gap="$2" mt="$3">
                  {skills.map((s) => (
                    <YStack key={s} bg="$surface2" rounded="$10" px="$3" py="$1.5">
                      <Text fontSize="$2" color="$text0">{s}</Text>
                    </YStack>
                  ))}
                </XStack>
              )}
              {!!candidate.aiSummary && (
                <YStack bg="$surface1" rounded="$4" p="$3" mt="$3" gap="$1">
                  <XStack items="center" gap="$1">
                    <Ionicons name="sparkles-outline" size={14} color={theme.accentBase.val} />
                    <Text fontSize="$2" fontWeight="600" color="$text1">AI summary</Text>
                  </XStack>
                  <Text fontSize="$3" color="$text0">{candidate.aiSummary}</Text>
                </YStack>
              )}
              {!!candidate.resumeUrl && (
                <Pressable
                  onPress={() => openUrl(candidate.resumeUrl)}
                  role="button"
                  aria-label="Open resume"
                  hitSlop={8}
                >
                  <XStack items="center" gap="$2" mt="$3" minH={44}>
                    <Ionicons name="document-text-outline" size={18} color={theme.accentBase.val} />
                    <Text color="$accentBase" fontSize="$4" fontWeight="600">Open resume</Text>
                  </XStack>
                </Pressable>
              )}
            </YStack>

            <YStack gap="$2">
              <SectionHeader title="Interviews" />
              {interviewsQ.isError ? (
                <Text color="$text1" fontSize="$3">Couldn't load interviews. Pull down to retry.</Text>
              ) : interviews.length === 0 ? (
                <Text color="$text1" fontSize="$3">No interviews scheduled yet.</Text>
              ) : (
                interviews.map((i) => (
                  <Pressable
                    key={i.id}
                    onPress={() => safePush(`/interviews/${i.id}`)}
                    role="button"
                    aria-label={`Open ${i.round} interview`}
                  >
                    <YStack bg="$surface1" rounded="$5" p="$3" gap="$2" borderWidth={1} borderColor="$surface3">
                      <XStack items="center" justify="space-between">
                        <RoundPill round={i.round} />
                        <ResultPill result={i.result} />
                      </XStack>
                      <Text fontSize="$3" color="$text0">
                        {formatDateTime(i.scheduledStart)} · {i.durationMinutes} min
                      </Text>
                      <Text fontSize="$3" color="$text1" numberOfLines={1}>{i.interviewerName}</Text>
                      {i.rating !== null && <StarRating value={i.rating} />}
                      {!!i.feedback && (
                        <Text fontSize="$3" color="$text1" numberOfLines={2}>{i.feedback}</Text>
                      )}
                    </YStack>
                  </Pressable>
                ))
              )}
            </YStack>

            {hasOfferInfo && (
              <YStack gap="$2">
                <SectionHeader title="Offer" />
                <YStack bg="$surface1" rounded="$5" p="$4" gap="$3" borderWidth={1} borderColor="$surface3">
                  {hasOffer && <BreakupTable ctc={candidate.salary as number} breakup={candidate.breakup} />}
                  {!!candidate.offerSentOn && (
                    <InfoRow label="Offer sent" value={formatDate(candidate.offerSentOn)} />
                  )}
                  {!!candidate.respondedOn && (
                    <InfoRow label="Responded" value={formatDate(candidate.respondedOn)} />
                  )}
                  {!!candidate.declineReason && (
                    <XStack bg="$surface2" rounded="$4" p="$3" gap="$2" items="flex-start">
                      <Ionicons name="alert-circle-outline" size={18} color={theme.statusOverdue.val} />
                      <YStack flex={1}>
                        <Text fontSize="$2" fontWeight="600" color="$statusOverdue">Decline reason</Text>
                        <Text fontSize="$3" color="$text0">{candidate.declineReason}</Text>
                      </YStack>
                    </XStack>
                  )}
                  {!!candidate.signedOfferUrl && (
                    <Pressable
                      onPress={() => openUrl(candidate.signedOfferUrl)}
                      role="button"
                      aria-label="Open signed offer"
                      hitSlop={8}
                    >
                      <XStack items="center" gap="$2" minH={44}>
                        <Ionicons name="document-attach-outline" size={18} color={theme.accentBase.val} />
                        <Text color="$accentBase" fontSize="$4" fontWeight="600">Open signed offer</Text>
                      </XStack>
                    </Pressable>
                  )}
                </YStack>
              </YStack>
            )}

            {showChecklist && (
              <Pressable
                onPress={() => safePush(`/joiners/${id}`)}
                role="button"
                aria-label="Open onboarding checklist"
              >
                <YStack bg="$surface1" rounded="$5" p="$4" gap="$2" borderWidth={1} borderColor="$surface3">
                  <XStack items="center" justify="space-between">
                    <Text fontSize="$5" fontWeight="600" color="$text0">Onboarding checklist</Text>
                    <Ionicons name="chevron-forward" size={18} color={theme.color10.val} />
                  </XStack>
                  <ProgressBar value={tasks.length > 0 ? doneCount / tasks.length : 0} />
                  <Text fontSize="$3" color="$text1">
                    {tasks.length > 0 ? `${doneCount} of ${tasks.length} tasks done` : 'No checklist yet'}
                  </Text>
                </YStack>
              </Pressable>
            )}
          </YStack>
        </ScrollView>

        {showBar && (
          <BottomActionBar>
            {actionError && <Text fontSize="$3" color="$statusOverdue">{actionError}</Text>}
            {canSchedule && round && (
              <Button
                bg="$accentBase"
                disabled={isNavigating}
                onPress={() =>
                  safePush({
                    pathname: '/candidates/schedule',
                    params: { candidateId: String(id), round },
                  })
                }
              >
                <Button.Text color="$accentOnAccent">{`Schedule ${round}`}</Button.Text>
              </Button>
            )}
            {canOffer && (
              <>
                {gaps.length > 0 && (
                  <Text fontSize="$3" color="$statusPending">
                    Complete before sending: {gaps.join(', ')}
                  </Text>
                )}
                <Button
                  bg="$accentBase"
                  disabled={gaps.length > 0 || offerMutation.isPending}
                  opacity={gaps.length > 0 ? 0.5 : 1}
                  onPress={confirmOffer}
                >
                  <Button.Text color="$accentOnAccent">
                    {offerMutation.isPending ? 'Requesting…' : offerLabel}
                  </Button.Text>
                </Button>
              </>
            )}
          </BottomActionBar>
        )}
      </YStack>
    </SafeAreaView>
  );
}
