import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { openBrowserAsync } from 'expo-web-browser';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { YStack, XStack, Text, Button, Input, TextArea, useTheme } from 'tamagui';
import { useThemeTokens } from '@microsoft/power-apps-native-host';
import { BottomActionBar, FormField } from '@/components';
import { createCandidate, EMPTY_BREAKUP } from '@/services/onboarding';
import type { CandidateInput } from '@/services/onboarding';
import type { ResumeResult } from '@/services/resume';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parsePayload(raw: string | string[] | undefined): ResumeResult | null {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s) return null;
  try {
    const j = JSON.parse(s) as ResumeResult;
    if (!j || typeof j !== 'object') return null;
    return j;
  } catch {
    return null;
  }
}

type Tone = 'success' | 'warning' | 'info' | 'danger';

function Banner({ tone, text }: { tone: Tone; text: string }) {
  const theme = useTheme();
  const map: Record<Tone, { color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
    success: { color: '$statusComplete', icon: 'sparkles-outline' },
    warning: { color: '$statusPending', icon: 'warning-outline' },
    info: { color: '$accentBase', icon: 'information-circle-outline' },
    danger: { color: '$statusOverdue', icon: 'alert-circle-outline' },
  };
  const m = map[tone];
  const iconColor =
    tone === 'success' ? theme.statusComplete?.val : tone === 'warning' ? theme.statusPending?.val : tone === 'danger' ? theme.statusOverdue?.val : theme.accentBase?.val;
  return (
    <XStack bg="$surface1" rounded="$3" p="$3" gap="$3" items="center" borderLeftWidth={3} borderLeftColor={m.color as any}>
      <Ionicons name={m.icon} size={20} color={iconColor} />
      <Text flex={1} fontSize="$3" color="$text0">
        {text}
      </Text>
    </XStack>
  );
}

export default function ReviewCandidateScreen() {
  const router = useRouter();
  const theme = useThemeTokens();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ payload?: string }>();
  const result = React.useMemo(() => parsePayload(params.payload), [params.payload]);
  const ex = result?.extracted ?? null;

  const [fullName, setFullName] = React.useState(ex?.fullName ?? '');
  const [email, setEmail] = React.useState(ex?.email ?? '');
  const [phone, setPhone] = React.useState(ex?.phone ?? '');
  const [currentCompany, setCurrentCompany] = React.useState(ex?.currentCompany ?? '');
  const [experience, setExperience] = React.useState(ex?.experienceYears != null ? String(ex.experienceYears) : '');
  const [skills, setSkills] = React.useState(ex?.skills ?? '');
  const [summary, setSummary] = React.useState(ex?.summary ?? '');
  const [position, setPosition] = React.useState('');
  const [department, setDepartment] = React.useState('');
  const [workLocation, setWorkLocation] = React.useState(ex?.location ?? '');
  const [hiringManager, setHiringManager] = React.useState('');
  const [managerEmail, setManagerEmail] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: CandidateInput) => createCandidate(input),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: ['candidates'] });
      router.replace(`/candidates/${created.id}` as any);
    },
    onError: (e) => {
      console.error('[review] create failed', e);
      setSaveError("Couldn't create the candidate. Check your connection and try again. Your details are kept.");
    },
  });

  const banner = (): { tone: Tone; text: string } => {
    if (!result) return { tone: 'info', text: 'No resume attached' };
    if (result.aiStatus === 'done') return { tone: 'success', text: 'Auto-filled with AI — please review' };
    if (result.aiStatus === 'failed')
      return {
        tone: 'warning',
        text: 'AI auto-fill unavailable (AI credits may be used up) — please enter details manually. Your resume is saved.',
      };
    return { tone: 'info', text: 'Resume attached — enter details manually' };
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email address';
    if (managerEmail.trim() && !EMAIL_RE.test(managerEmail.trim())) e.managerEmail = 'Enter a valid email address';
    if (experience.trim()) {
      const n = Number(experience);
      if (!Number.isFinite(n) || n < 0) e.experience = 'Enter a number of years';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSave = () => {
    if (mutation.isPending) return;
    setSaveError(null);
    if (!validate()) return;
    const years = experience.trim() ? Number(experience) : null;
    const input: CandidateInput = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      position: position.trim(),
      department: department.trim(),
      hiringManager: hiringManager.trim(),
      managerEmail: managerEmail.trim(),
      salary: null,
      breakup: EMPTY_BREAKUP,
      startDate: '',
      workLocation: workLocation.trim(),
      employmentType: 'Full-time',
      currentCompany: currentCompany.trim(),
      experienceYears: years,
      skills: skills.trim(),
      aiSummary: summary.trim(),
      resumeFileName: result?.resumeFileName ?? '',
      resumeUrl: result?.resumeUrl ?? '',
      source: 'Mobile app',
      notes: '',
    };
    mutation.mutate(input);
  };

  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/capture' as any);
  };

  const openResume = async () => {
    if (!result?.resumeUrl) return;
    try {
      await openBrowserAsync(result.resumeUrl);
    } catch (e) {
      console.error('[review] open resume failed', e);
      setSaveError("Couldn't open the resume.");
    }
  };

  const err = (k: string) =>
    errors[k] ? (
      <Text fontSize="$2" color="$statusOverdue">
        {errors[k]}
      </Text>
    ) : null;

  const b = banner();
  const busy = mutation.isPending;

  return (
    <YStack flex={1} bg="$surface0">
      <StatusBar style="auto" />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <XStack px="$2" py="$2" items="center" gap="$2">
          <Button
            chromeless
            circular
            aria-label="Back"
            onPress={onBack}
            icon={<Ionicons name="chevron-back" size={24} color={theme.text0} />}
          />
          <Text fontSize="$6" fontWeight="700" color="$text0">
            Review candidate
          </Text>
        </XStack>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 16 }}
          >
            <Banner tone={b.tone} text={b.text} />
            {!!result?.resumeUrl && (
              <XStack
                bg="$surface1"
                rounded="$3"
                p="$3"
                gap="$3"
                items="center"
                role="button"
                aria-label="Open attached resume"
                onPress={openResume}
                pressStyle={{ scale: 0.98 }}
              >
                <Ionicons name="document-text-outline" size={24} color={theme.accentBase} />
                <YStack flex={1}>
                  <Text fontSize="$3" fontWeight="600" color="$text0" numberOfLines={1}>
                    {result.resumeFileName || 'Resume'}
                  </Text>
                  <Text fontSize="$2" color="$text2">
                    Tap to open
                  </Text>
                </YStack>
                <Ionicons name="open-outline" size={20} color={theme.text2} />
              </XStack>
            )}
            {saveError && <Banner tone="danger" text={saveError} />}

            <FormField label="Full name *">
              <Input value={fullName} onChangeText={setFullName} placeholder="Full name" autoComplete="name" enterKeyHint="next" />
              {err('fullName')}
            </FormField>
            <FormField label="Email *">
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="email"
                enterKeyHint="next"
              />
              {err('email')}
            </FormField>
            <FormField label="Phone">
              <Input value={phone} onChangeText={setPhone} placeholder="Phone number" inputMode="tel" autoComplete="tel" />
            </FormField>
            <FormField label="Current company">
              <Input value={currentCompany} onChangeText={setCurrentCompany} placeholder="Current company" />
            </FormField>
            <FormField label="Experience (years)">
              <Input value={experience} onChangeText={setExperience} placeholder="e.g. 5" inputMode="decimal" />
              {err('experience')}
            </FormField>
            <FormField label="Key skills">
              <Input value={skills} onChangeText={setSkills} placeholder="e.g. React, Node.js, SQL" />
            </FormField>
            <FormField label="Profile summary">
              <TextArea value={summary} onChangeText={setSummary} placeholder="Short summary of the candidate" minH={100} />
            </FormField>
            <FormField label="Position">
              <Input value={position} onChangeText={setPosition} placeholder="Position applied for" />
            </FormField>
            <FormField label="Department">
              <Input value={department} onChangeText={setDepartment} placeholder="Department" />
            </FormField>
            <FormField label="Work location">
              <Input value={workLocation} onChangeText={setWorkLocation} placeholder="Work location" />
            </FormField>
            <FormField label="Hiring manager">
              <Input value={hiringManager} onChangeText={setHiringManager} placeholder="Hiring manager name" />
            </FormField>
            <FormField label="Manager email">
              <Input
                value={managerEmail}
                onChangeText={setManagerEmail}
                placeholder="manager@example.com"
                inputMode="email"
                autoCapitalize="none"
              />
              {err('managerEmail')}
            </FormField>
          </ScrollView>
          <BottomActionBar>
            <Button theme="blue" onPress={onSave} disabled={busy} aria-label="Create candidate">
              {busy ? 'Creating…' : 'Create candidate'}
            </Button>
          </BottomActionBar>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </YStack>
  );
}
