import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { openBrowserAsync } from 'expo-web-browser';
import { useQuery } from '@tanstack/react-query';
import { YStack, XStack, Text, Button } from 'tamagui';
import {
  LoadingState,
  ErrorState,
  ScreenHeader,
  BottomActionBar,
  SectionHeader,
  AvatarInitials,
  InfoRow,
  ActionRow,
} from '@/components';
import { CandidateStatusBadge, RoundPill, ResultPill, StarRating } from '@/components/onboarding';
import { getCandidate, listInterviews } from '@/services/onboarding';
import { formatDateTime } from '@/utils';

export default function InterviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const interviewId = Number(id);
  const validId = Number.isFinite(interviewId) && interviewId > 0;
  const [isNavigating, setIsNavigating] = React.useState(false);

  const interviewQuery = useQuery({
    queryKey: ['interviews', {}],
    queryFn: () => listInterviews(),
    enabled: validId,
    refetchOnMount: 'always',
  });
  const interview = interviewQuery.data?.find((i) => i.id === interviewId);
  const candidateId = interview?.candidateId;

  const candidateQuery = useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: () => getCandidate(candidateId as number),
    enabled: candidateId !== undefined,
    refetchOnMount: 'always',
  });
  const roundsQuery = useQuery({
    queryKey: ['interviews', { candidateId }],
    queryFn: () => listInterviews({ candidateId: candidateId as number }),
    enabled: candidateId !== undefined,
    refetchOnMount: 'always',
  });

  const candidate = candidateQuery.data;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/(app)/interviews');
  };

  const header = (
    <YStack pt={insets.top} bg="$background">
      <XStack px="$3" pt="$2">
        <Button chromeless size="$3" aria-label="Back" onPress={goBack} icon={<Ionicons name="chevron-back" size={24} />} />
      </XStack>
    </YStack>
  );

  if (!validId) {
    return (
      <YStack flex={1} bg="$background">
        <StatusBar style="auto" />
        {header}
        <ErrorState title="Interview not found" message="This interview link is not valid." onRetry={goBack} />
      </YStack>
    );
  }

  if (interviewQuery.isLoading || (interview && candidateQuery.isLoading)) {
    return (
      <YStack flex={1} bg="$background">
        <StatusBar style="auto" />
        {header}
        <LoadingState variant="detail" />
      </YStack>
    );
  }

  if (interviewQuery.isError || candidateQuery.isError || !interview || !candidate) {
    if (interviewQuery.isError) console.error('[interview-detail] load failed', interviewQuery.error);
    if (candidateQuery.isError) console.error('[interview-detail] candidate failed', candidateQuery.error);
    return (
      <YStack flex={1} bg="$background">
        <StatusBar style="auto" />
        {header}
        <ErrorState
          title={interviewQuery.isError || candidateQuery.isError ? undefined : 'Interview not found'}
          message={
            interviewQuery.isError || candidateQuery.isError
              ? "Couldn't load this interview. Try again."
              : 'This interview may have been removed.'
          }
          onRetry={() => {
            void interviewQuery.refetch();
            void candidateQuery.refetch();
          }}
        />
      </YStack>
    );
  }

  const skills = candidate.skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const previous = (roundsQuery.data ?? [])
    .filter((r) => r.id !== interview.id)
    .sort((a, b) => b.scheduledStart.localeCompare(a.scheduledStart));
  const completed = interview.result !== 'Scheduled';

  const openLink = (url: string) => {
    void openBrowserAsync(url);
  };

  const recordResult = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    try {
      router.push({ pathname: '/interviews/result', params: { id: String(interview.id) } });
    } finally {
      setTimeout(() => setIsNavigating(false), 600);
    }
  };

  return (
    <YStack flex={1} bg="$background">
      <StatusBar style="auto" />
      {header}
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 24 }}>
        <ScreenHeader title={candidate.fullName} subtitle={candidate.position} status={<CandidateStatusBadge status={candidate.status} />} />

        <YStack p="$4" gap="$5">
          <YStack bg="$surface1" rounded="$4" p="$4" gap="$3">
            <XStack items="center" gap="$3">
              <AvatarInitials name={candidate.fullName} size="lg" />
              <YStack flex={1}>
                <Text fontSize="$5" fontWeight="700" numberOfLines={1}>{candidate.fullName}</Text>
                <Text color="$color10" numberOfLines={1}>{candidate.position}</Text>
              </YStack>
            </XStack>
            {candidate.experienceYears !== null && (
              <InfoRow label="Experience" value={`${candidate.experienceYears} yrs`} />
            )}
            {!!candidate.currentCompany && <InfoRow label="Current company" value={candidate.currentCompany} />}
            {skills.length > 0 && (
              <XStack flexWrap="wrap" gap="$2">
                {skills.map((s) => (
                  <XStack key={s} bg="$accentSoft" px="$2" py="$1" rounded="$10">
                    <Text fontSize="$2" color="$accentDeep" fontWeight="600">{s}</Text>
                  </XStack>
                ))}
              </XStack>
            )}
            {!!candidate.aiSummary && (
              <YStack gap="$1">
                <Text fontSize="$2" fontWeight="600" color="$color10">AI summary</Text>
                <Text color="$color11">{candidate.aiSummary}</Text>
              </YStack>
            )}
          </YStack>

          <YStack gap="$2">
            <SectionHeader title="This round" />
            <YStack bg="$surface1" rounded="$4" p="$4" gap="$2">
              <XStack items="center" justify="space-between">
                <RoundPill round={interview.round} />
                <ResultPill result={interview.result} />
              </XStack>
              <InfoRow label="When" value={formatDateTime(interview.scheduledStart)} />
              <InfoRow label="Duration" value={`${interview.durationMinutes} min`} />
              <InfoRow label="Interviewer" value={interview.interviewerName || interview.interviewerEmail} />
              {completed && interview.rating !== null && (
                <XStack items="center" justify="space-between" py="$1">
                  <Text color="$color10" fontSize="$4">Rating</Text>
                  <StarRating value={interview.rating} />
                </XStack>
              )}
              {completed && !!interview.feedback && (
                <YStack gap="$1" pt="$1">
                  <Text fontSize="$2" fontWeight="600" color="$color10">Feedback</Text>
                  <Text color="$color11">{interview.feedback}</Text>
                </YStack>
              )}
            </YStack>
          </YStack>

          {(!!candidate.resumeUrl || !!interview.meetingLink) && (
            <YStack gap="$1">
              {!!candidate.resumeUrl && (
                <ActionRow iconName="document-text-outline" label="Open resume" subtitle={candidate.resumeFileName || undefined} onPress={() => openLink(candidate.resumeUrl)} />
              )}
              {!!interview.meetingLink && (
                <ActionRow iconName="videocam-outline" label="Join meeting" onPress={() => openLink(interview.meetingLink)} />
              )}
            </YStack>
          )}

          {previous.length > 0 && (
            <YStack gap="$2">
              <SectionHeader title="Previous rounds" />
              {previous.map((r) => (
                <YStack key={r.id} bg="$surface1" rounded="$4" p="$3" gap="$2">
                  <XStack items="center" justify="space-between">
                    <XStack items="center" gap="$2">
                      <RoundPill round={r.round} />
                      <Text fontSize="$2" color="$color10">{formatDateTime(r.scheduledStart)}</Text>
                    </XStack>
                    <ResultPill result={r.result} />
                  </XStack>
                  <Text fontSize="$3" color="$color10" numberOfLines={1}>{r.interviewerName || r.interviewerEmail}</Text>
                  {r.rating !== null && r.result !== 'Scheduled' && <StarRating value={r.rating} size={14} />}
                  {!!r.feedback && r.result !== 'Scheduled' && (
                    <Text color="$color11" numberOfLines={2}>{r.feedback}</Text>
                  )}
                </YStack>
              ))}
            </YStack>
          )}
        </YStack>
      </ScrollView>

      {interview.result === 'Scheduled' && (
        <BottomActionBar>
          <Button theme="blue" disabled={isNavigating} onPress={recordResult} icon={<Ionicons name="create-outline" size={18} />}>
            Record result
          </Button>
        </BottomActionBar>
      )}
    </YStack>
  );
}
