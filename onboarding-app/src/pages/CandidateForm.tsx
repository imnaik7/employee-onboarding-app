import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Button,
  Dropdown,
  Field,
  Input,
  Link,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Option,
  Spinner,
  Switch,
  Textarea,
} from '@fluentui/react-components';
import {
  ArrowReset20Regular,
  Briefcase20Regular,
  Calculator20Regular,
  DocumentArrowUp24Regular,
  Money20Regular,
  Person20Regular,
  Save20Regular,
  Sparkle20Filled,
} from '@fluentui/react-icons';
import {
  EMPLOYMENT_TYPES,
  EMPTY_BREAKUP,
  breakupTotal,
  computeBreakup,
  createCandidate,
  updateCandidate,
  type Candidate,
  type CandidateInput,
  type SalaryBreakup,
} from '../services/onboarding';
import { MAX_RESUME_MB, RESUME_ACCEPT, processResume } from '../services/resume';
import { useAppData } from '../state/appDataContext';
import type { Navigate } from '../state/nav';
import { GlassCard } from '../ui/GlassCard';
import { StackedBar } from '../ui/charts';
import { errorText, useToast } from '../hooks/useToast';
import { formatSalary } from '../utils/format';

interface Props {
  existing?: Candidate;
  onNavigate: Navigate;
}

type Errors = Partial<Record<keyof CandidateInput, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const empty: CandidateInput = {
  fullName: '',
  email: '',
  phone: '',
  position: '',
  department: '',
  hiringManager: '',
  managerEmail: '',
  salary: null,
  breakup: EMPTY_BREAKUP,
  startDate: '',
  workLocation: '',
  employmentType: 'Full-time',
  currentCompany: '',
  experienceYears: null,
  skills: '',
  aiSummary: '',
  resumeFileName: '',
  resumeUrl: '',
  source: 'Web app',
  notes: '',
};

const BREAKUP_ROWS: { key: keyof SalaryBreakup; label: string; hint: string; color: string }[] = [
  { key: 'basic', label: 'Basic', hint: '40% of CTC', color: '#6366f1' },
  { key: 'hra', label: 'HRA', hint: '50% of Basic', color: '#8b5cf6' },
  { key: 'special', label: 'Special allowance', hint: 'Balancing figure', color: '#ec4899' },
  { key: 'employerPf', label: 'Employer PF', hint: '12% of Basic', color: '#14b8a6' },
  { key: 'gratuity', label: 'Gratuity', hint: '4.81% of Basic', color: '#f59e0b' },
  { key: 'variable', label: 'Variable / bonus', hint: 'Optional', color: '#38bdf8' },
];

const SECTIONS = [
  { id: 'sec-resume', label: 'Resume', icon: <DocumentArrowUp24Regular /> },
  { id: 'sec-person', label: 'Personal', icon: <Person20Regular /> },
  { id: 'sec-role', label: 'Role', icon: <Briefcase20Regular /> },
  { id: 'sec-pay', label: 'Compensation', icon: <Money20Regular /> },
];

function validate(v: CandidateInput): Errors {
  const e: Errors = {};
  if (!v.fullName.trim()) e.fullName = 'Full name is required';
  if (!v.email.trim()) e.email = 'Email is required';
  else if (!EMAIL.test(v.email.trim())) e.email = 'Enter a valid email address';
  if (v.managerEmail.trim() && !EMAIL.test(v.managerEmail.trim())) e.managerEmail = 'Enter a valid email address';
  if (v.salary !== null && v.salary < 0) e.salary = 'CTC cannot be negative';
  if (v.salary && breakupTotal(v.breakup) !== 0 && breakupTotal(v.breakup) !== v.salary) {
    e.breakup = `Components add up to ${formatSalary(breakupTotal(v.breakup))}, not the CTC of ${formatSalary(v.salary)}`;
  }
  return e;
}

export function CandidateForm({ existing, onNavigate }: Props) {
  const { refresh } = useAppData();
  const notify = useToast();
  const [values, setValues] = useState<CandidateInput>(() =>
    existing ? (Object.fromEntries(Object.keys(empty).map((k) => [k, existing[k as keyof CandidateInput]])) as CandidateInput) : empty,
  );
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [variablePct, setVariablePct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Fields the AI filled — highlighted until the user edits them
  const [aiFilled, setAiFilled] = useState<Set<keyof CandidateInput>>(new Set());
  const [resumeNotice, setResumeNotice] = useState<{ intent: 'success' | 'warning' | 'info'; title: string; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof CandidateInput>(key: K, value: CandidateInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setAiFilled((s) => {
      if (!s.has(key)) return s;
      const n = new Set(s);
      n.delete(key);
      return n;
    });
  };

  const onResume = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setResumeNotice(null);
    try {
      const r = await processResume(file, useAi);
      const filled = new Set<keyof CandidateInput>();
      setValues((v) => {
        const next = { ...v, resumeUrl: r.resumeUrl, resumeFileName: r.resumeFileName };
        const x = r.extracted;
        if (x) {
          // AI only fills fields HR hasn't typed yet
          const fill = <K extends keyof CandidateInput>(k: K, val: CandidateInput[K], cur: CandidateInput[K]) => {
            if ((cur === '' || cur === null) && val !== '' && val !== null) {
              next[k] = val;
              filled.add(k);
            }
          };
          fill('fullName', x.fullName, v.fullName);
          fill('email', x.email, v.email);
          fill('phone', x.phone, v.phone);
          fill('currentCompany', x.currentCompany, v.currentCompany);
          fill('experienceYears', x.experienceYears, v.experienceYears);
          fill('skills', x.skills, v.skills);
          fill('workLocation', x.location, v.workLocation);
          if (x.summary) {
            next.aiSummary = x.summary;
            filled.add('aiSummary');
          }
        }
        return next;
      });
      setAiFilled(filled);
      if (r.aiStatus === 'done') setResumeNotice({ intent: 'success', title: 'Auto-filled with AI', text: 'Glowing fields came from the resume — review them before saving.' });
      else if (r.aiStatus === 'failed')
        setResumeNotice({ intent: 'warning', title: 'AI auto-fill unavailable', text: 'The resume is saved, but AI could not read it (AI credits may be used up, or it is a Word file). Please enter the details manually.' });
      else setResumeNotice({ intent: 'info', title: 'Resume attached', text: 'Enter the candidate details manually below.' });
    } catch (err) {
      setResumeNotice({ intent: 'warning', title: 'Upload failed', text: errorText(err) });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const save = async () => {
    const e = validate(values);
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      notify('Check the highlighted fields', undefined, 'warning');
      return;
    }
    setSaving(true);
    try {
      const input = values.salary && breakupTotal(values.breakup) === 0 ? { ...values, breakup: computeBreakup(values.salary, variablePct) } : values;
      const saved = existing ? await updateCandidate(existing.id, input) : await createCandidate(input);
      notify(existing ? 'Changes saved' : 'Candidate created', saved.fullName);
      await refresh();
      onNavigate({ page: 'detail', id: saved.id });
    } catch (err) {
      notify('Could not save', errorText(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const glow = (key: keyof CandidateInput) => (aiFilled.has(key) ? 'ai-glow' : undefined);
  const field = (key: keyof CandidateInput, label: string, required = false, type: 'text' | 'email' | 'tel' = 'text') => (
    <Field label={label} required={required} validationMessage={errors[key]} validationState={errors[key] ? 'error' : 'none'} className={glow(key)}>
      <Input type={type} value={String(values[key] ?? '')} onChange={(_, d) => set(key, d.value as never)} />
    </Field>
  );

  const total = breakupTotal(values.breakup);
  const cancel = () => onNavigate(existing ? { page: 'detail', id: existing.id } : { page: 'candidates' });

  return (
    <div className="page form-page">
      <div className="page-head">
        <div>
          <h2>{existing ? `Edit ${existing.fullName}` : 'New candidate'}</h2>
          <p className="muted">Start with the resume — AI fills in the rest, or enter everything by hand.</p>
        </div>
      </div>

      <div className="form-layout">
        <nav className="form-nav" aria-label="Form sections">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
              {s.icon}
              <span>{s.label}</span>
            </a>
          ))}
        </nav>

        <div className="form-main">
          <GlassCard id="sec-resume" className="form-card">
            <div className="row-between">
              <h3>Resume</h3>
              <Switch
                checked={useAi}
                onChange={(_, d) => setUseAi(d.checked)}
                label={
                  <span className="ai-label">
                    <Sparkle20Filled /> Auto-fill with AI
                  </span>
                }
              />
            </div>
            <input ref={fileInput} type="file" accept={RESUME_ACCEPT} hidden onChange={(e) => onResume(e.target.files?.[0])} />
            <button
              type="button"
              className={`dropzone ${dragOver ? 'over' : ''} ${uploading ? 'busy' : ''}`}
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void onResume(e.dataTransfer.files?.[0]);
              }}
            >
              {uploading ? (
                <div className="ai-reading">
                  <Spinner size="small" />
                  <span>{useAi ? 'Reading the resume with AI…' : 'Uploading resume…'}</span>
                  {useAi && <span className="scanline" aria-hidden />}
                </div>
              ) : (
                <>
                  <span className="dz-icon">
                    <DocumentArrowUp24Regular />
                  </span>
                  <strong>{values.resumeFileName ? 'Replace resume' : 'Drop a resume here or click to browse'}</strong>
                  <span className="muted small">PDF or image for AI · Word uploads too · up to {MAX_RESUME_MB} MB</span>
                </>
              )}
            </button>
            {values.resumeUrl && (
              <span className="small">
                Attached:{' '}
                <Link href={values.resumeUrl} target="_blank" rel="noreferrer">
                  {values.resumeFileName}
                </Link>
              </span>
            )}
            <AnimatePresence>
              {resumeNotice && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <MessageBar intent={resumeNotice.intent}>
                    <MessageBarBody>
                      <MessageBarTitle>{resumeNotice.title}</MessageBarTitle>
                      {resumeNotice.text}
                    </MessageBarBody>
                  </MessageBar>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          <GlassCard id="sec-person" className="form-card" index={1}>
            <h3>Personal details</h3>
            <div className="form-grid">
              {field('fullName', 'Full name', true)}
              {field('email', 'Email', true, 'email')}
              {field('phone', 'Phone', false, 'tel')}
              {field('currentCompany', 'Current company')}
              <Field label="Experience (years)" className={glow('experienceYears')}>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={values.experienceYears === null ? '' : String(values.experienceYears)}
                  onChange={(_, d) => set('experienceYears', d.value === '' ? null : Number(d.value))}
                />
              </Field>
            </div>
            <Field label="Key skills" className={glow('skills')}>
              <Input value={values.skills} onChange={(_, d) => set('skills', d.value)} placeholder="e.g. React, TypeScript, Power Platform" />
            </Field>
            <Field label="Profile summary" className={glow('aiSummary')}>
              <Textarea value={values.aiSummary} onChange={(_, d) => set('aiSummary', d.value)} resize="vertical" rows={3} />
            </Field>
          </GlassCard>

          <GlassCard id="sec-role" className="form-card" index={2}>
            <h3>Role</h3>
            <div className="form-grid">
              {field('position', 'Position')}
              {field('department', 'Department')}
              <Field label="Employment type">
                <Dropdown value={values.employmentType} selectedOptions={[values.employmentType]} onOptionSelect={(_, d) => set('employmentType', d.optionValue ?? 'Full-time')}>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <Option key={t} value={t}>
                      {t}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              <Field label="Start date">
                <Input type="date" value={values.startDate} onChange={(_, d) => set('startDate', d.value)} />
              </Field>
              {field('workLocation', 'Work location')}
              {field('hiringManager', 'Hiring manager')}
              {field('managerEmail', 'Manager email', false, 'email')}
            </div>
          </GlassCard>

          <GlassCard id="sec-pay" className="form-card" index={3}>
            <div className="row-between">
              <h3>Compensation</h3>
              <span className="muted small">Printed as a table on the offer letter</span>
            </div>
            <div className="form-grid">
              <Field
                label="Annual CTC (₹)"
                validationMessage={errors.salary}
                validationState={errors.salary ? 'error' : 'none'}
                hint={values.salary ? `₹ ${formatSalary(values.salary)} / year · ₹ ${formatSalary(Math.round(values.salary / 12))} / month` : undefined}
              >
                <Input type="number" min={0} value={values.salary === null ? '' : String(values.salary)} onChange={(_, d) => set('salary', d.value === '' ? null : Number(d.value))} />
              </Field>
              <Field label="Variable pay (% of CTC)">
                <Input type="number" min={0} max={50} value={String(variablePct)} onChange={(_, d) => setVariablePct(Number(d.value) || 0)} />
              </Field>
            </div>
            <div className="row-actions">
              <Button icon={<Calculator20Regular />} onClick={() => values.salary && set('breakup', computeBreakup(values.salary, variablePct))} disabled={!values.salary}>
                Calculate breakup
              </Button>
              <Button appearance="subtle" icon={<ArrowReset20Regular />} onClick={() => set('breakup', EMPTY_BREAKUP)}>
                Clear
              </Button>
            </div>
            {total > 0 && <StackedBar parts={BREAKUP_ROWS.map((r) => ({ label: r.label, value: values.breakup[r.key], color: r.color }))} height={14} />}
            <table className="breakup">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Annual</th>
                  <th className="num">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {BREAKUP_ROWS.map((r) => (
                  <tr key={r.key}>
                    <td>
                      <span className="legend-dot" style={{ background: r.color }} /> {r.label}
                      <span className="muted small block">{r.hint}</span>
                    </td>
                    <td>
                      <Input
                        type="number"
                        min={0}
                        size="small"
                        value={String(values.breakup[r.key] || '')}
                        onChange={(_, d) => set('breakup', { ...values.breakup, [r.key]: Number(d.value) || 0 })}
                      />
                    </td>
                    <td className="num">{formatSalary(Math.round(values.breakup[r.key] / 12))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={values.salary && total && total !== values.salary ? 'mismatch' : ''}>
                  <td>Total CTC</td>
                  <td className="num">{formatSalary(total)}</td>
                  <td className="num">{formatSalary(Math.round(total / 12))}</td>
                </tr>
              </tfoot>
            </table>
            {errors.breakup && (
              <MessageBar intent="error">
                <MessageBarBody>{errors.breakup}</MessageBarBody>
              </MessageBar>
            )}
            <Field label="Notes">
              <Textarea value={values.notes} onChange={(_, d) => set('notes', d.value)} resize="vertical" />
            </Field>
          </GlassCard>
        </div>
      </div>

      <div className="sticky-actions glass">
        <span className="muted small">{aiFilled.size ? `✨ ${aiFilled.size} fields filled by AI` : existing ? 'Editing candidate' : 'New candidate'}</span>
        <span className="grow" />
        <Button onClick={cancel} disabled={saving}>
          Cancel
        </Button>
        <Button appearance="primary" icon={saving ? <Spinner size="tiny" /> : <Save20Regular />} onClick={save} disabled={saving || uploading}>
          {existing ? 'Save changes' : 'Create candidate'}
        </Button>
      </div>
    </div>
  );
}
