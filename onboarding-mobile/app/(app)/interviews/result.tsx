import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { YStack, XStack, Text, Button, ScrollView, useTheme } from 'tamagui';
import { ModalHeader, BottomActionBar, FormField, LoadingState, ErrorState, EmptyState } from '@/components';
import { StarRating, RoundPill } from '@/components/onboarding';
import { listInterviews, recordResult, type InterviewResult } from '@/services/onboarding';

type Outcome = Exclude<InterviewResult, 'Scheduled'>;
const OUTCOMES: Outcome[] = ['Pass', 'Fail', 'No Show', 'Cancelled'];

export default function RecordResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  // iOS presents this as a sheet; Android renders it full screen under the status bar
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'android' ? insets.top : 0;
  const theme = useTheme();
  const qc = useQueryClient();

  const interviewId = Number(id);
  const validId = Number.isFinite(interviewId) && interviewId > 0;

  const [result, setResult] = React.useState<Outcome>('Pass');
  const [rating, setRating] = React.useState(0);
  const [feedback, setFeedback] = React.useState('');
  const [touched, setTouched] = React.useState(false);

  const query = useQuery({
    queryKey: ['interviews', { id: interviewId }],
    enabled: validId,
    queryFn: async () => {
      const all = await listInterviews();
      return all.find((i) => i.id === interviewId) ?? null;
    },
  });
  const interview = query.data ?? null;

  const feedbackRequired = result === 'Pass' || result === 'Fail';
  const feedbackMissing = feedbackRequired && feedback.trim().length === 0;

  const save = useMutation({
    mutationFn: async () => {
      if (!interview) throw new Error('Interview not loaded');
      return recordResult(interview, result, rating || null, feedback.trim());
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['interviews'] }),
        qc.invalidateQueries({ queryKey: ['candidates'] }),
        qc.invalidateQueries({ queryKey: ['candidate'] }),
      ]);
      router.back();
    },
    onError: (e) => console.error('[record-result] save failed', e),
  });

  const onSave = () => {
    if (save.isPending || !interview) return;
    setTouched(true);
    if (feedbackMissing) return;
    save.mutate();
  };

  let banner: { text: string; tone: 'fail' | 'pass' } | null = null;
  if (result === 'Fail') banner = { text: 'The candidate will be marked Not Selected', tone: 'fail' };
  else if (result === 'Pass' && interview?.round === 'HR')
    banner = { text: 'All rounds cleared — candidate moves to Selected, ready for an offer', tone: 'pass' };

  const header = <ModalHeader title="Record result" onCancel={() => router.back()} />;

  if (!validId || (!query.isLoading && !query.isError && !interview)) {
    return (
      <YStack flex={1} bg="$surface0">
        <StatusBar style="auto" />
        {header}
        <EmptyState icon="calendar-outline" title="Interview not found" message="This interview may have been removed." />
      </YStack>
    );
  }

  if (query.isLoading) {
    return (
      <YStack flex={1} bg="$surface0">
        <StatusBar style="auto" />
        {header}
        <LoadingState variant="form" rows={4} />
      </YStack>
    );
  }

  if (query.isError || !interview) {
    return (
      <YStack flex={1} bg="$surface0">
        <StatusBar style="auto" />
        {header}
        <ErrorState message="Couldn't load this interview. Please try again." onRetry={() => void query.refetch()} />
      </YStack>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <YStack flex={1} bg="$surface0" pt={topInset}>
        <StatusBar style="auto" />
        {header}
        <ScrollView keyboardShouldPersistTaps="handled">
          <YStack gap="$5" p="$4" pb="$6">
            <XStack items="center" gap="$2">
              <RoundPill round={interview.round} />
              <Text fontSize="$3" color="$text1" flex={1} numberOfLines={1}>
                {interview.interviewerName}
              </Text>
            </XStack>

            <FormField label="Outcome">
              <XStack bg="$surface2" rounded="$4" p="$1" gap="$1" role="radiogroup">
                {OUTCOMES.map((o) => {
                  const selected = o === result;
                  return (
                    <Pressable
                      key={o}
                      role="radio"
                      aria-checked={selected}
                      aria-label={o}
                      onPress={() => setResult(o)}
                      style={{ flex: 1 }}
                    >
                      <YStack
                        minH={44}
                        items="center"
                        justify="center"
                        rounded="$3"
                        px="$1"
                        bg={selected ? '$accentBase' : 'transparent'}
                      >
                        <Text fontSize="$2" fontWeight="600" color={selected ? '$accentOnAccent' : '$text1'} numberOfLines={1}>
                          {o}
                        </Text>
                      </YStack>
                    </Pressable>
                  );
                })}
              </XStack>
            </FormField>

            {banner && (
              <XStack
                bg={banner.tone === 'fail' ? '$surface2' : '$accentSoft'}
                rounded="$4"
                p="$3"
                gap="$2"
                items="center"
              >
                <Ionicons
                  name={banner.tone === 'fail' ? 'alert-circle' : 'checkmark-circle'}
                  size={20}
                  color={banner.tone === 'fail' ? theme.statusOverdue.val : theme.statusComplete.val}
                />
                <Text flex={1} fontSize="$3" fontWeight="600" color="$text0">
                  {banner.text}
                </Text>
              </XStack>
            )}

            <FormField label="Rating">
              <StarRating value={rating} onChange={setRating} size={32} />
            </FormField>

            <FormField label={feedbackRequired ? 'Feedback (required)' : 'Feedback'}>
              <TextInput
                value={feedback}
                onChangeText={setFeedback}
                onBlur={() => setTouched(true)}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                placeholder="How did the interview go?"
                placeholderTextColor={theme.text2.val}
                aria-label="Feedback"
                style={{
                  minHeight: 120,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: touched && feedbackMissing ? theme.statusOverdue.val : theme.surface3.val,
                  backgroundColor: theme.surface1.val,
                  color: theme.text0.val,
                  fontSize: 16,
                }}
              />
              {touched && feedbackMissing && (
                <Text fontSize="$2" color="$statusOverdue">
                  Feedback is required for a Pass or Fail result.
                </Text>
              )}
            </FormField>

            {save.isError && (
              <Text fontSize="$3" color="$statusOverdue">
                Couldn't save the result. Please try again.
              </Text>
            )}
          </YStack>
        </ScrollView>
        <BottomActionBar>
          <Button
            bg="$accentBase"
            disabled={save.isPending}
            opacity={save.isPending ? 0.6 : 1}
            onPress={onSave}
            pressStyle={{ scale: 0.98 }}
          >
            <Button.Text color="$accentOnAccent">{save.isPending ? 'Saving…' : 'Save result'}</Button.Text>
          </Button>
        </BottomActionBar>
      </YStack>
    </KeyboardAvoidingView>
  );
}
