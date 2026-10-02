// Branded email layout shared by app-sent messages (mirrors flows/email_templates.py).
// Table layout + inline styles so it renders the same in Outlook, Gmail and mobile.

export const COMPANY = 'Power Platform AI Solution';
const PRIMARY = '#4F46E5';
const VIOLET = '#7C3AED';
const INK = '#0F172A';
const MUTED = '#64748B';
const FONT = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface EmailOptions {
  pill: string;
  heading: string;
  intro: string; // trusted HTML
  rows?: [string, string][]; // plain text, escaped here
  body?: string; // trusted HTML
  cta?: { label: string; url: string };
  footnote?: string;
}

export function brandedEmail(o: EmailOptions): string {
  const rows = o.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:12px;border-collapse:separate;overflow:hidden;margin:20px 0">${o.rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:10px 16px;color:${MUTED};font-size:13px;border-bottom:1px solid #E2E8F0;width:40%">${esc(k)}</td>` +
            `<td style="padding:10px 16px;color:${INK};font-size:14px;font-weight:600;border-bottom:1px solid #E2E8F0">${esc(v)}</td></tr>`,
        )
        .join('')}</table>`
    : '';
  const cta = o.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td style="border-radius:10px;background:${PRIMARY};background-image:linear-gradient(135deg,${PRIMARY},${VIOLET})">` +
      `<a href="${esc(o.cta.url)}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;font-family:${FONT}">${esc(o.cta.label)} &rarr;</a></td></tr></table>`
    : '';
  const foot = o.footnote ? `<p style="margin:16px 0 0;color:${MUTED};font-size:12px;line-height:1.6">${o.footnote}</p>` : '';
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 12px;font-family:${FONT}"><tr><td align="center">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden">` +
    `<tr><td style="background:${PRIMARY};background-image:linear-gradient(135deg,${PRIMARY} 0%,${VIOLET} 60%,#DB2777 100%);padding:28px 36px">` +
    `<table role="presentation" width="100%"><tr><td style="color:#ffffff;font-size:18px;font-weight:700">&#9889; ${COMPANY}</td>` +
    `<td align="right"><span style="display:inline-block;background:rgba(255,255,255,.18);color:#ffffff;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;padding:6px 12px;border-radius:99px">${esc(o.pill)}</span></td></tr></table>` +
    `<div style="color:#ffffff;font-size:26px;font-weight:700;line-height:1.3;margin-top:22px">${o.heading}</div></td></tr>` +
    `<tr><td style="padding:32px 36px 36px;color:${INK};font-size:15px;line-height:1.65"><p style="margin:0 0 12px">${o.intro}</p>${rows}${o.body ?? ''}${cta}${foot}</td></tr>` +
    `<tr><td style="background:#F8FAFC;padding:20px 36px;border-top:1px solid #E2E8F0;color:${MUTED};font-size:12px;line-height:1.6">` +
    `<b style="color:${INK}">${COMPANY}</b> &middot; Talent &amp; People Team<br/>This is an automated message from our onboarding system.</td></tr>` +
    `</table></td></tr></table>`
  );
}

export function interviewInviteHtml(args: {
  candidateName: string;
  position: string;
  round: string;
  start: Date;
  durationMinutes: number;
  interviewerName: string;
  meetingLink: string;
  resumeUrl: string;
}): string {
  const when = args.start.toLocaleString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const first = esc(args.candidateName.split(/\s+/)[0] ?? args.candidateName);
  const roundLabel = args.round === 'HR' ? 'HR discussion' : `${args.round} technical interview`;
  const tips =
    args.round === 'HR'
      ? 'This is a conversation about your goals, culture fit, and expectations — come with your questions for us!'
      : 'Expect a mix of problem solving and a discussion of your past projects. Keep a notepad handy and test your audio/video beforehand.';
  return brandedEmail({
    pill: `${args.round} round`,
    heading: `Your ${esc(roundLabel)} is scheduled &#128197;`,
    intro: `Hi ${first}, thank you for your interest in the <b>${esc(args.position || 'open')}</b> role at ${COMPANY}. We're excited to meet you!`,
    rows: [
      ['Round', roundLabel],
      ['When', when],
      ['Duration', `${args.durationMinutes} minutes`],
      ['Interviewer', args.interviewerName],
      ['Where', args.meetingLink ? 'Online — link below' : 'Joining details will be shared shortly'],
    ],
    body: `<p style="margin:0;color:${MUTED};font-size:14px">&#128161; ${esc(tips)}</p>`,
    cta: args.meetingLink ? { label: 'Join the interview', url: args.meetingLink } : undefined,
    footnote:
      (args.resumeUrl ? `Interviewer: the candidate's resume is <a href="${esc(args.resumeUrl)}" style="color:${PRIMARY}">available here</a>. ` : '') +
      'Need to reschedule? Reply to this invite and we will find another slot.',
  });
}
