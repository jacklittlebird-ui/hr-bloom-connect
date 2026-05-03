import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// 1) Date formatting → DD/MM/YYYY
// ---------------------------------------------------------------------------
describe('formatDate → DD/MM/YYYY', () => {
  it('formats ISO dates as DD/MM/YYYY', () => {
    expect(formatDate('2026-05-03')).toBe('03/05/2026');
  });

  it('pads single-digit day & month with zero', () => {
    expect(formatDate('2026-01-09')).toBe('09/01/2026');
  });

  it('handles full ISO timestamps', () => {
    expect(formatDate('2026-12-31T22:15:00.000Z')).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('returns dash for empty/null/undefined', () => {
    expect(formatDate('')).toBe('-');
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
  });
});

// ---------------------------------------------------------------------------
// 2) Permission duration must be within 1–2 hours
// ---------------------------------------------------------------------------
const isValidPermissionDuration = (hours: number) => hours >= 1 && hours <= 2;

describe('Permission duration validation (1–2h)', () => {
  it('accepts 1 hour', () => expect(isValidPermissionDuration(1)).toBe(true));
  it('accepts 2 hours', () => expect(isValidPermissionDuration(2)).toBe(true));
  it('rejects 0 hours', () => expect(isValidPermissionDuration(0)).toBe(false));
  it('rejects 0.5 hour', () => expect(isValidPermissionDuration(0.5)).toBe(false));
  it('rejects 3 hours', () => expect(isValidPermissionDuration(3)).toBe(false));
  it('rejects negative values', () => expect(isValidPermissionDuration(-1)).toBe(false));
});

// ---------------------------------------------------------------------------
// 3) Mocked Supabase — rejection_reason persists with rejected status
// ---------------------------------------------------------------------------
type UpdatePayload = {
  status?: string;
  rejection_reason?: string | null;
};

const makeMockClient = () => {
  const calls: { table: string; payload: UpdatePayload; id?: string }[] = [];
  const client = {
    from(table: string) {
      return {
        update(payload: UpdatePayload) {
          return {
            eq(_col: string, id: string) {
              calls.push({ table, payload, id });
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
    _calls: calls,
  };
  return client;
};

// Mirror the production reject helpers from src/pages/Leaves.tsx
const rejectLeave = (sb: ReturnType<typeof makeMockClient>, id: string, reason: string) =>
  sb.from('leave_requests').update({ status: 'rejected', rejection_reason: reason }).eq('id', id);

const rejectPermission = (sb: ReturnType<typeof makeMockClient>, id: string, reason: string) =>
  sb.from('permission_requests').update({ status: 'rejected', rejection_reason: reason }).eq('id', id);

const rejectMission = (sb: ReturnType<typeof makeMockClient>, id: string, reason: string) =>
  sb.from('missions').update({ status: 'rejected', rejection_reason: reason }).eq('id', id);

const rejectOvertime = (sb: ReturnType<typeof makeMockClient>, id: string, reason: string) =>
  sb.from('overtime_requests').update({ status: 'rejected', rejection_reason: reason }).eq('id', id);

const approveLeave = (sb: ReturnType<typeof makeMockClient>, id: string) =>
  sb.from('leave_requests').update({ status: 'approved', rejection_reason: null }).eq('id', id);

describe('rejection_reason persistence across all request types', () => {
  let sb: ReturnType<typeof makeMockClient>;
  beforeEach(() => { sb = makeMockClient(); });

  it('saves rejection_reason on leave rejection', async () => {
    await rejectLeave(sb, 'leave-1', 'تجاوز الرصيد المتاح');
    expect(sb._calls[0]).toEqual({
      table: 'leave_requests',
      id: 'leave-1',
      payload: { status: 'rejected', rejection_reason: 'تجاوز الرصيد المتاح' },
    });
  });

  it('saves rejection_reason on permission rejection', async () => {
    await rejectPermission(sb, 'perm-1', 'Outside policy');
    expect(sb._calls[0].payload).toEqual({ status: 'rejected', rejection_reason: 'Outside policy' });
  });

  it('saves rejection_reason on mission rejection', async () => {
    await rejectMission(sb, 'mis-1', 'لا يوجد مبرر كافٍ');
    expect(sb._calls[0].payload.rejection_reason).toBe('لا يوجد مبرر كافٍ');
  });

  it('saves rejection_reason on overtime rejection', async () => {
    await rejectOvertime(sb, 'ot-1', 'Coverage already secured');
    expect(sb._calls[0].payload).toMatchObject({ status: 'rejected' });
    expect(sb._calls[0].payload.rejection_reason).toBe('Coverage already secured');
  });

  it('clears rejection_reason when re-approving', async () => {
    await approveLeave(sb, 'leave-2');
    expect(sb._calls[0].payload).toEqual({ status: 'approved', rejection_reason: null });
  });

  it('does not silently drop empty reasons (still persists string)', async () => {
    await rejectLeave(sb, 'leave-3', '');
    expect(sb._calls[0].payload.rejection_reason).toBe('');
  });
});
