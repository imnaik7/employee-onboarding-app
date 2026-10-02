import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { YStack, XStack, Text, Button, Input, useTheme } from 'tamagui';
import { ModalHeader, FormField, BottomActionBar, LoadingState, ErrorState } from '@/components';
import { ROUNDS, getCandidate, scheduleInterview } from '@/services/onboarding';
import type { Round } from '@/services/onboarding';
import { createInvite } from '@/services/calendar';
import { formatDateTime } from '@/utils';

const DURATIONS = [30, 45, 60, 90] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function defaultStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

export default function ScheduleRoundScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const qc = useQueryClient();
  const { candidateId, round } = useLocalSearchParams<{ candidateId: string; round: string }>();

  const idNum = Number(candidateId);
  const validId = Number.isInteger(idNum) && idNum > 0;
  const validRound = (ROUNDS as readonly string[]).includes(round ?? '');

  const candidateQuery = useQuery({
    queryKey: ['candidate', idNum],
    queryFn: () => getCandidate(idNum),
    enabled: validId && validRound,
  });

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [start, setStart] = React.useState<Date>(defaultStart);
  const [pickerMode, setPickerMode] = React.useState<'date' | 'time' | null>(null);
  const [duration, setDuration] = React.useState<number>(60);
  const [link, setLink] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const candidate = candidateQuery.data;
      if (!candidate) throw new Error('Candidate not loaded');
      await scheduleInterview({
        candidate,
        round: round as Round,
        interviewerName: name.trim(),
        interviewerEmail: email.trim(),
        start,
        durationMinutes: duration,
        meetingLink: link.trim(),
        createInvite,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['interviews'] });
      void qc.invalidateQueries({ queryKey: ['candidate'] });
      void qc.invalidateQueries({ queryKey: ['candidates'] });
      if (router.canGoBack()) router.back();
      else router.navigate('/(app)/candidates');
    },
    onError: (e: unknown) => {
      console.error('[schedule] failed', e);
      setSubmitError("Couldn't schedule the interview. Check the details and try again.");
    },
  });

  const nameError = name.trim() ? null : 'Interviewer name is required';
  const emailError = !email.trim()
    ? 'Interviewer email is required'
    : EMAIL_RE.test(email.trim())
      ? null
      : 'Enter a valid email address';
  const startError = start.getTime() > Date.now() ? null : 'Pick a date and time in the future';
  const linkError =
    !link.trim() || /^https?:\/\/\S+$/i.test(link.trim()) ? null : 'Enter a valid link starting with https://';
  const valid = !nameError && !emailError && !startError && !linkError;

  const cancel = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/(app)/candidates');
  };

  const submit = () => {
    if (mutation.isPending) return;
    setTouched(true);
    setSubmitError(null);
    if (!valid) return;
    mutation.mutate();
  };

  const onPickerChange = (_e: unknown, selected?: Date) => {
    const mode = pickerMode;
    if (Platform.OS !== 'ios') setPickerMode(null);
    if (!selected || !mode) return;
    setStart((prev) => {
      const next = new Date(prev);
      if (mode === 'date') next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      else next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      return next;
    });
  };

  if (!validId || !validRound) {
    return (
      <YStack flex={1} bg="$background" pt={insets.top}>
        <StatusBar style="auto" />
        <ModalHeader title="Schedule interview" onCancel={cancel} />
        <ErrorState message="This interview round can't be scheduled. Go back and try again." onRetry={cancel} />
      </YStack>
    );
  }

  if (candidateQuery.isLoading) {
    return (
      <YStack flex={1} bg="$background" pt={insets.top}>
        <StatusBar style="auto" />
        <ModalHeader title={`Schedule ${round} interview`} onCancel={cancel} />
        <LoadingState />
      </YStack>
    );
  }

  if (candidateQuery.isError || !candidateQuery.data) {
    return (
      <YStack flex={1} bg="$background" pt={insets.top}>
        <StatusBar style="auto" />
        <ModalHeader title={`Schedule ${round} interview`} onCancel={cancel} />
        <ErrorState message="Couldn't load the candidate." onRetry={() => void candidateQuery.refetch()} />
      </YStack>
    );
  }

  const candidate = candidateQuery.data;

  const fieldError = (msg: string | null) =>
    touched && msg ? (
      <Text fontSize={12} color="$red10">
        {msg}
      </Text>
    ) : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <YStack flex={1} bg="$background" pt={insets.top}>
        <StatusBar style="auto" />
        <ModalHeader title={`Schedule ${round} interview`} onCancel={cancel} />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        >
          <YStack gap="$5">
            <XStack bg="$color3" rounded="$4" p="$3" gap="$2" items="flex-start">
              <Ionicons name="mail-outline" size={18} color={theme.color10?.val} />
              <Text flex={1} fontSize={13} color="$color11">
                {`An Outlook invite will be sent from your calendar to the interviewer and ${candidate.email || 'the candidate'}`}
              </Text>
            </XStack>

            <FormField label="Interviewer name">
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                autoCapitalize="words"
                autoComplete="name"
                enterKeyHint="next"
              />
              {fieldError(nameError)}
            </FormField>

            <FormField label="Interviewer email">
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="name@company.com"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                enterKeyHint="next"
              />
              {fieldError(emailError)}
            </FormField>

            <FormField label="Date and time">
              <XStack gap="$2">
                <Button flex={1} variant="outlined" onPress={() => setPickerMode('date')} aria-label="Pick date">
                  <Text>
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(start)}
                  </Text>
                </Button>
                <Button flex={1} variant="outlined" onPress={() => setPickerMode('time')} aria-label="Pick time">
                  <Text>
                    {new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(start)}
                  </Text>
                </Button>
              </XStack>
              <Text fontSize={12} color="$color10">{formatDateTime(start.toISOString())}</Text>
              {pickerMode ? (
                <DateTimePicker
                  value={start}
                  mode={pickerMode}
                  minimumDate={pickerMode === 'date' ? new Date() : undefined}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onPickerChange}
                />
              ) : null}
              {Platform.OS === 'ios' && pickerMode ? (
                <Button chromeless onPress={() => setPickerMode(null)}>Done</Button>
              ) : null}
              {fieldError(startError)}
            </FormField>

            <FormField label="Duration">
              <XStack gap="$2" flexWrap="wrap">
                {DURATIONS.map((d) => {
                  const active = d === duration;
                  return (
                    <Button
                      key={d}
                      size="$3"
                      rounded="$10"
                      bg={active ? '$accentBase' : '$color3'}
                      onPress={() => setDuration(d)}
                      aria-label={`${d} minutes`}
                      aria-selected={active}
                    >
                      <Text color={active ? '$color1' : '$color12'} fontWeight="600">{`${d} min`}</Text>
                    </Button>
                  );
                })}
              </XStack>
            </FormField>

            <FormField label="Meeting link (optional)">
              <Input
                value={link}
                onChangeText={setLink}
                placeholder="Teams or Zoom URL"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect={false}
                enterKeyHint="done"
              />
              {fieldError(linkError)}
            </FormField>

            {submitError ? (
              <XStack bg="$red3" rounded="$4" p="$3" gap="$2" items="center">
                <Ionicons name="alert-circle" size={18} color={theme.red10?.val} />
                <Text flex={1} fontSize={13} color="$red11">{submitError}</Text>
              </XStack>
            ) : null}
          </YStack>
        </ScrollView>
        <BottomActionBar>
          <Button
            bg="$accentBase"
            disabled={mutation.isPending}
            opacity={mutation.isPending ? 0.6 : 1}
            onPress={submit}
            pressStyle={{ scale: 0.98 }}
          >
            <Button.Text color="$accentOnAccent" fontWeight="700">
              {mutation.isPending ? 'Sending invite…' : 'Send invite'}
            </Button.Text>
          </Button>
        </BottomActionBar>
      </YStack>
    </KeyboardAvoidingView>
  );
}
