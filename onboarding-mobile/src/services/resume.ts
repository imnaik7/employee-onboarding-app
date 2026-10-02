import { File } from 'expo-file-system';
import { Onboarding_ProcessResumeService } from '../generated';

// Mobile port of onboarding-app/src/services/resume.ts — same flow, same manual fallback.

export const MAX_RESUME_MB = 10;
export const RESUME_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/*',
];

export interface PickedFile {
  uri: string;
  name: string;
  size?: number | null;
}

export interface ExtractedResume {
  fullName: string;
  email: string;
  phone: string;
  currentCompany: string;
  currentTitle: string;
  experienceYears: number | null;
  skills: string;
  location: string;
  summary: string;
}

export interface ResumeResult {
  resumeUrl: string;
  resumeFileName: string;
  /** done = AI filled the fields; skipped = manual entry chosen; failed = AI unavailable (e.g. no credits) */
  aiStatus: 'done' | 'skipped' | 'failed';
  extracted: ExtractedResume | null;
}

function parseExtracted(raw: string | undefined): ExtractedResume | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const s = (k: string) => (typeof j[k] === 'string' ? (j[k] as string).trim() : '');
    const years = Number(j.experienceYears);
    const result: ExtractedResume = {
      fullName: s('fullName'),
      email: s('email'),
      phone: s('phone'),
      currentCompany: s('currentCompany'),
      currentTitle: s('currentTitle'),
      experienceYears: Number.isFinite(years) && years > 0 ? years : null,
      skills: s('skills'),
      location: s('location'),
      summary: s('summary'),
    };
    return result.fullName || result.email ? result : null;
  } catch {
    return null;
  }
}

/**
 * Uploads the resume to SharePoint (always) and optionally asks AI to extract details.
 * AI problems never throw — they come back as aiStatus 'failed' so the user continues manually.
 */
export async function processResume(file: PickedFile, useAi: boolean): Promise<ResumeResult> {
  if (file.size && file.size > MAX_RESUME_MB * 1024 * 1024) throw new Error(`Resume must be under ${MAX_RESUME_MB} MB`);
  const base64 = await new File(file.uri).base64();
  const res = await Onboarding_ProcessResumeService.Run({
    text: file.name,
    text_1: base64,
    text_2: useAi ? 'true' : 'false',
  });
  if (!res.success) {
    const err = res.error as { message?: string } | undefined;
    throw new Error(`Uploading the resume failed${err?.message ? `: ${err.message}` : ''}`);
  }
  const extracted = parseExtracted(res.data?.extracted);
  const aiStatus: ResumeResult['aiStatus'] = !useAi ? 'skipped' : res.data?.aistatus === 'done' && extracted ? 'done' : 'failed';
  return {
    resumeUrl: res.data?.resumeurl ?? '',
    resumeFileName: res.data?.resumefilename ?? file.name,
    aiStatus,
    extracted: aiStatus === 'done' ? extracted : null,
  };
}
