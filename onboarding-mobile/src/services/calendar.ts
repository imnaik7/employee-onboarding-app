import { Office365OutlookService } from '../generated';

let calendarId: string | null = null;

// The signed-in user's default calendar ("Calendar"); falls back to the first one returned
async function defaultCalendarId(): Promise<string> {
  if (calendarId) return calendarId;
  const res = await Office365OutlookService.CalendarGetTables();
  if (!res.success) throw new Error('Could not read your Outlook calendars');
  const tables = res.data?.value ?? [];
  const cal = tables.find((t) => t.DisplayName === 'Calendar') ?? tables[0];
  if (!cal?.Name) throw new Error('No Outlook calendar found for your account');
  calendarId = cal.Name;
  return calendarId;
}

// Graph event times are sent as UTC wall-clock without the trailing Z
const utc = (d: Date): string => d.toISOString().slice(0, 19);

/** Creates an Outlook meeting invite from the signed-in HR user and returns the event id. */
export async function createInvite(args: {
  subject: string;
  start: Date;
  end: Date;
  attendees: string[];
  body: string;
  location: string;
}): Promise<string> {
  const res = await Office365OutlookService.V4CalendarPostItem(await defaultCalendarId(), {
    subject: args.subject,
    start: utc(args.start),
    end: utc(args.end),
    timeZone: '(UTC) Coordinated Universal Time',
    requiredAttendees: args.attendees.join(';'),
    body: args.body,
    location: args.location,
    importance: 'normal',
    showAs: 'busy',
    isReminderOn: true,
    reminderMinutesBeforeStart: 15,
    responseRequested: true,
  });
  if (!res.success) {
    const err = res.error as { message?: string } | undefined;
    throw new Error(`Sending the Outlook invite failed${err?.message ? `: ${err.message}` : ''}`);
  }
  return res.data?.id ?? '';
}
