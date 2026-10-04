// Demo-mode stand-in for src/generated (aliased only by `vite --mode demo`).
// Mirrors the generated connector services the app uses, backed by in-memory fictional data.
import { DEMO_RESUME, DEMO_USER, buildDemoData } from './data';

type Row = Record<string, unknown>;
interface Result<T> {
  success: boolean;
  data: T;
  error?: Error;
}

// Built lazily: data.ts imports from services/onboarding, which imports this module (circular)
let cache: Record<string, Row[]> | null = null;
const db = () => (cache ??= buildDemoData());
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ok = async <T,>(data: T, latency = 220): Promise<Result<T>> => {
  await wait(latency);
  return { success: true, data };
};

/** Supports the OData subset the app uses: `Field eq 5`, `Field eq 'x'`, joined by `and`. */
function matches(row: Row, filter?: string): boolean {
  if (!filter) return true;
  return filter.split(/\s+and\s+/i).every((clause) => {
    const m = clause.match(/^(\w+)\s+eq\s+(?:'((?:[^']|'')*)'|(\S+))$/);
    if (!m) return true;
    const [, field, str, num] = m;
    const v = row[field!];
    return str !== undefined ? String(v ?? '').toLowerCase() === str.replace(/''/g, "'").toLowerCase() : Number(v) === Number(num);
  });
}

function sortRows(rows: Row[], orderby?: string): Row[] {
  if (!orderby) return rows;
  const [field, dir] = orderby.split(/\s+/);
  const sign = dir?.toLowerCase() === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => String(a[field!] ?? '').localeCompare(String(b[field!] ?? '')) * sign);
}

const nextId = (rows: Row[]) => rows.reduce((m, r) => Math.max(m, Number(r.ID)), 0) + 1;

export class SharePointService {
  static async GetItems(_dataset: string, table: string, $filter?: string, $orderby?: string, $top?: number): Promise<Result<{ value: Row[] }>> {
    const rows = sortRows((db()[table] ?? []).filter((r) => matches(r, $filter)), $orderby).slice(0, $top ?? 5000);
    return ok({ value: rows.map((r) => ({ ...r })) }, 350);
  }

  static async GetItem(_dataset: string, table: string, id: number): Promise<Result<Row>> {
    const row = (db()[table] ?? []).find((r) => Number(r.ID) === Number(id));
    return row ? ok({ ...row }) : { success: false, data: {}, error: new Error('Item not found') };
  }

  static async PostItem(_dataset: string, table: string, item: Record<string, unknown>): Promise<Result<Row>> {
    const rows = (db()[table] ??= []);
    const now = new Date().toISOString();
    const row: Row = { ...item, ID: nextId(rows), Created: now, Modified: now };
    rows.push(row);
    return ok({ ...row }, 450);
  }

  static async PatchItem(_dataset: string, table: string, id: number, item: Record<string, unknown>): Promise<Result<Row>> {
    const row = (db()[table] ?? []).find((r) => Number(r.ID) === Number(id));
    if (!row) return { success: false, data: {}, error: new Error('Item not found') };
    Object.assign(row, item, { Modified: new Date().toISOString() });
    // Simulate the DocuSign flow picking up the offer a moment later
    const status = (item.Status as { Value?: string } | undefined)?.Value;
    if (status === 'Offer Requested') {
      setTimeout(() => Object.assign(row, { Status: { Value: 'Offer Sent' }, OfferSentOn: new Date().toISOString(), EnvelopeId: 'demo-envelope' }), 4000);
    }
    return ok({ ...row }, 400);
  }

  static async HttpRequest(): Promise<Result<void>> {
    return ok(DEMO_USER as unknown as void);
  }
}

export class Office365OutlookService {
  static async CalendarGetTables() {
    return ok({ value: [{ Name: 'demo-calendar', DisplayName: 'Calendar' }] });
  }

  static async V4CalendarPostItem() {
    return ok({ id: `demo-event-${Date.now()}` }, 700);
  }
}

export class Onboarding_ProcessResumeService {
  static async Run(input: { text: string; text_1: string; text_2: string }) {
    const useAi = input.text_2 === 'true';
    await wait(useAi ? 3200 : 900);
    return {
      success: true,
      data: {
        resumeurl: 'https://example.com/resume.pdf',
        resumefilename: input.text.replace(/\s+/g, '_'),
        aistatus: useAi ? 'done' : 'skipped',
        extracted: useAi ? JSON.stringify(DEMO_RESUME) : '{}',
      },
    };
  }
}
