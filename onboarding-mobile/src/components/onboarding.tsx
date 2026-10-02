/**
 * Onboarding-specific shared UI. Import from '@/components/onboarding'.
 *   CandidateStatusBadge, RoundPill, ResultPill, StarRating, ProgressBar,
 *   JourneyTimeline, CandidateRow, InterviewCard, BreakupTable
 */
import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack, Text, useTheme } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { AvatarInitials, StatusPill, type StatusVariant } from '@/components';
import {
  ROUNDS,
  type Candidate,
  type CandidateStatus,
  type Interview,
  type InterviewResult,
  type SalaryBreakup,
} from '@/services/onboarding';
import { formatDate, formatDateTime } from '@/utils';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<CandidateStatus, StatusVariant> = {
  Applied: 'draft',
  Interviewing: 'in-progress',
  'Not Selected': 'cancelled',
  Selected: 'complete',
  'Offer Requested': 'pending',
  'Offer Sent': 'pending',
  Accepted: 'complete',
  Declined: 'overdue',
  Expired: 'cancelled',
  Onboarded: 'complete',
};

export function CandidateStatusBadge({ status }: { status: CandidateStatus }) {
  return <StatusPill status={STATUS_VARIANT[status]} label={status} />;
}

export function RoundPill({ round }: { round: string }) {
  return (
    <XStack bg="$accentSoft" px="$2" py="$1" rounded="$10" items="center" aria-label={`Round: ${round}`}>
      <Text fontSize="$1" fontWeight="700" color="$accentDeep">
        {round}
      </Text>
    </XStack>
  );
}

const RESULT_VARIANT: Record<InterviewResult, StatusVariant> = {
  Scheduled: 'in-progress',
  Pass: 'complete',
  Fail: 'overdue',
  'No Show': 'pending',
  Cancelled: 'cancelled',
};

export function ResultPill({ result }: { result: InterviewResult }) {
  return <StatusPill status={RESULT_VARIANT[result]} label={result} />;
}

// ─── Star rating (display + input) ────────────────────────────────────────────

export function StarRating({
  value,
  onChange,
  size = 18,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <XStack gap="$1" role={onChange ? 'radiogroup' : undefined} aria-label={`Rating ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = (
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={theme.statusPending.val} />
        );
        return onChange ? (
          <Pressable
            key={n}
            hitSlop={8}
            role="radio"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            aria-checked={n === value}
            onPress={() => onChange(n === value ? 0 : n)}
            style={{ padding: 4 }}
          >
            {icon}
          </Pressable>
        ) : (
          <React.Fragment key={n}>{icon}</React.Fragment>
        );
      })}
    </XStack>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

export function ProgressBar({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'warning' }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <YStack height={8} rounded="$10" bg="$surface2" overflow="hidden" aria-label={`${Math.round(pct * 100)}% complete`}>
      <YStack height="100%" width={`${Math.round(pct * 100)}%`} rounded="$10" bg={tone === 'warning' ? '$statusPending' : '$accentBase'} />
    </YStack>
  );
}

// ─── Journey timeline (port of web Timeline) ──────────────────────────────────

type StepState = 'done' | 'current' | 'failed' | 'todo';
interface Step {
  title: string;
  detail: string;
  state: StepState;
}

const OFFER_STAGE: CandidateStatus[] = ['Offer Requested', 'Offer Sent', 'Accepted', 'Declined', 'Expired', 'Onboarded'];

export function buildJourney(c: Candidate, interviews: Interview[]): Step[] {
  const steps: Step[] = [
    { title: 'Resume received', detail: `${formatDateTime(c.created)}${c.source ? ` · via ${c.source}` : ''}`, state: 'done' },
  ];
  let blocked = false;
  for (const round of ROUNDS) {
    const latest = interviews.filter((i) => i.round === round && i.result !== 'Cancelled').sort((a, b) => b.id - a.id)[0];
    let state: StepState = 'todo';
    let detail = '';
    if (latest) {
      detail = `${formatDateTime(latest.scheduledStart)} · ${latest.interviewerName}`;
      state = latest.result === 'Pass' ? 'done' : latest.result === 'Fail' ? 'failed' : 'current';
      if (latest.result !== 'Scheduled') detail += ` · ${latest.result}${latest.rating ? ` (${latest.rating}/5)` : ''}`;
    } else if (!blocked && c.status !== 'Not Selected') {
      state = 'current';
      detail = 'Ready to schedule';
    }
    if (blocked) state = 'todo';
    if (state !== 'done') blocked = true;
    steps.push({ title: `${round} interview`, detail, state });
  }
  if (c.status === 'Not Selected') {
    steps.push({ title: 'Not selected', detail: 'Did not clear the interview rounds', state: 'failed' });
    return steps;
  }
  const offerOut = OFFER_STAGE.includes(c.status);
  steps.push({
    title: 'Offer sent via DocuSign',
    detail: c.status === 'Offer Requested' ? 'Generating & sending…' : offerOut ? formatDateTime(c.offerSentOn) : c.status === 'Selected' ? 'Ready to send' : '',
    state: offerOut && c.status !== 'Offer Requested' ? 'done' : c.status === 'Selected' || c.status === 'Offer Requested' ? 'current' : 'todo',
  });
  if (c.status === 'Expired') {
    steps.push({ title: 'Offer expired', detail: 'No response within 30 days', state: 'failed' });
  } else if (c.status === 'Declined') {
    steps.push({ title: 'Offer declined', detail: `${formatDateTime(c.respondedOn)}${c.declineReason ? ` — “${c.declineReason}”` : ''}`, state: 'failed' });
  } else {
    const accepted = c.status === 'Accepted' || c.status === 'Onboarded';
    steps.push({
      title: 'Offer signed & accepted',
      detail: accepted ? formatDateTime(c.respondedOn) : c.status === 'Offer Sent' ? 'Waiting for candidate' : '',
      state: accepted ? 'done' : c.status === 'Offer Sent' ? 'current' : 'todo',
    });
    steps.push({
      title: 'Onboarding complete',
      detail: c.status === 'Onboarded' ? 'All checklist tasks done' : accepted ? 'Checklist in progress' : '',
      state: c.status === 'Onboarded' ? 'done' : accepted ? 'current' : 'todo',
    });
  }
  return steps;
}

const STEP_ICON: Record<StepState, { name: React.ComponentProps<typeof Ionicons>['name']; token: string }> = {
  done: { name: 'checkmark-circle', token: 'statusComplete' },
  current: { name: 'time-outline', token: 'accentBase' },
  failed: { name: 'close-circle', token: 'statusOverdue' },
  todo: { name: 'ellipse-outline', token: 'text3' },
};

export function JourneyTimeline({ candidate, interviews }: { candidate: Candidate; interviews: Interview[] }) {
  const theme = useTheme() as unknown as Record<string, { val: string }>;
  const steps = buildJourney(candidate, interviews);
  return (
    <YStack>
      {steps.map((s, i) => (
        <XStack key={s.title} gap="$3">
          <YStack items="center" width={22}>
            <Ionicons name={STEP_ICON[s.state].name} size={22} color={theme[STEP_ICON[s.state].token]?.val} />
            {i < steps.length - 1 && (
              <YStack width={2} flex={1} minH={18} bg={s.state === 'done' ? '$statusComplete' : '$surface3'} />
            )}
          </YStack>
          <YStack flex={1} pb="$3">
            <Text fontSize="$4" fontWeight={s.state === 'todo' ? '400' : '600'} color={s.state === 'todo' ? '$text2' : '$text0'}>
              {s.title}
            </Text>
            {!!s.detail && (
              <Text fontSize="$2" color="$text1">
                {s.detail}
              </Text>
            )}
          </YStack>
        </XStack>
      ))}
    </YStack>
  );
}

// ─── Candidate row ────────────────────────────────────────────────────────────

export function CandidateRow({ candidate, onPress }: { candidate: Candidate; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} role="button" aria-label={`Open ${candidate.fullName}`}>
      <XStack bg="$surface1" rounded="$5" p="$3" gap="$3" items="center" borderWidth={1} borderColor="$surface3">
        <AvatarInitials name={candidate.fullName} />
        <YStack flex={1} gap="$1">
          <Text fontSize="$4" fontWeight="600" color="$text0" numberOfLines={1}>
            {candidate.fullName}
          </Text>
          <Text fontSize="$2" color="$text1" numberOfLines={1}>
            {candidate.position || 'Position not set'}
            {candidate.department ? ` · ${candidate.department}` : ''}
          </Text>
        </YStack>
        <YStack items="flex-end" gap="$1">
          <CandidateStatusBadge status={candidate.status} />
          {!!candidate.startDate && (
            <Text fontSize="$1" color="$text2">
              Starts {formatDate(candidate.startDate)}
            </Text>
          )}
        </YStack>
      </XStack>
    </Pressable>
  );
}

// ─── Interview card ───────────────────────────────────────────────────────────

export function InterviewCard({
  interview,
  candidate,
  onPress,
  onJoin,
}: {
  interview: Interview;
  candidate?: Candidate;
  onPress: () => void;
  /** Shown as a Join button when the interview is Scheduled and has a meeting link */
  onJoin?: () => void;
}) {
  return (
    <Pressable onPress={onPress} role="button" aria-label={`Open ${interview.round} interview`}>
      <YStack bg="$surface1" rounded="$5" p="$3" gap="$2" borderWidth={1} borderColor="$surface3">
        <XStack items="center" gap="$3">
          <AvatarInitials name={candidate?.fullName ?? '?'} />
          <YStack flex={1}>
            <Text fontSize="$4" fontWeight="600" color="$text0" numberOfLines={1}>
              {candidate?.fullName ?? `Candidate #${interview.candidateId}`}
            </Text>
            <Text fontSize="$2" color="$text1" numberOfLines={1}>
              {candidate?.position ?? ''}
            </Text>
          </YStack>
          <RoundPill round={interview.round} />
        </XStack>
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$1">
            <Ionicons name="time-outline" size={14} />
            <Text fontSize="$2" color="$text1">
              {formatDateTime(interview.scheduledStart)} · {interview.durationMinutes} min
            </Text>
          </XStack>
          {onJoin && interview.result === 'Scheduled' && interview.meetingLink ? (
            <Pressable onPress={onJoin} role="button" aria-label="Join interview meeting" hitSlop={8}>
              <XStack bg="$accentBase" px="$3" py="$1.5" rounded="$10" items="center" gap="$1">
                <Ionicons name="videocam-outline" size={14} color="white" />
                <Text fontSize="$2" fontWeight="700" color="$accentOnAccent">
                  Join
                </Text>
              </XStack>
            </Pressable>
          ) : (
            <ResultPill result={interview.result} />
          )}
        </XStack>
      </YStack>
    </Pressable>
  );
}

// ─── Salary breakup table ─────────────────────────────────────────────────────

const BREAKUP_ROWS: [keyof SalaryBreakup, string][] = [
  ['basic', 'Basic'],
  ['hra', 'HRA'],
  ['special', 'Special allowance'],
  ['employerPf', 'Employer PF'],
  ['gratuity', 'Gratuity'],
  ['variable', 'Variable / bonus'],
];

const inr = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

export function BreakupTable({ ctc, breakup }: { ctc: number; breakup: SalaryBreakup }) {
  return (
    <YStack rounded="$4" overflow="hidden" borderWidth={1} borderColor="$surface3">
      <XStack bg="$accentSoft" px="$3" py="$2">
        <Text flex={1} fontSize="$1" fontWeight="700" color="$accentDeep">COMPONENT</Text>
        <Text width={90} fontSize="$1" fontWeight="700" color="$accentDeep" text="right">ANNUAL</Text>
        <Text width={80} fontSize="$1" fontWeight="700" color="$accentDeep" text="right">MONTHLY</Text>
      </XStack>
      {BREAKUP_ROWS.filter(([k]) => breakup[k] > 0).map(([k, label]) => (
        <XStack key={String(k)} px="$3" py="$2" borderTopWidth={1} borderColor="$surface3">
          <Text flex={1} fontSize="$3" color="$text0">{label}</Text>
          <Text width={90} fontSize="$3" color="$text0" text="right">{inr(breakup[k])}</Text>
          <Text width={80} fontSize="$3" color="$text1" text="right">{inr(Math.round(breakup[k] / 12))}</Text>
        </XStack>
      ))}
      <XStack px="$3" py="$2" bg="$surface2" borderTopWidth={1} borderColor="$surface3">
        <Text flex={1} fontSize="$3" fontWeight="700" color="$text0">Total CTC</Text>
        <Text width={90} fontSize="$3" fontWeight="700" color="$text0" text="right">{inr(ctc)}</Text>
        <Text width={80} fontSize="$3" fontWeight="700" color="$text0" text="right">{inr(Math.round(ctc / 12))}</Text>
      </XStack>
    </YStack>
  );
}
