import { describe, it, expect } from 'vitest';

/**
 * Mirrors the matching logic in GpsCheckinButton.verifyOnServer.
 * The contract under test: when a check-out timestamp falls AFTER midnight
 * on day D+1 but the original record has date=D, the match must still
 * succeed because we do NOT filter by date — we only fetch the most recent
 * records and compare the requested stamp against check_in (for check_in
 * events) or check_out (for check_out events) within a 5-minute tolerance.
 */
type Rec = { id: string; date: string; check_in: string | null; check_out: string | null };

function findMatch(
  recs: Rec[],
  eventType: 'check_in' | 'check_out',
  expectedRecordedAt: string,
): { matchedAt: string | null; matchedDate: string | null } {
  const expectedTs = new Date(expectedRecordedAt).getTime();
  for (const rec of recs) {
    const stamp = eventType === 'check_in' ? rec.check_in : rec.check_out;
    if (!stamp) continue;
    if (Math.abs(new Date(stamp).getTime() - expectedTs) <= 5 * 60_000) {
      return { matchedAt: stamp, matchedDate: rec.date };
    }
  }
  return { matchedAt: null, matchedDate: null };
}

describe('verifyOnServer match logic — night shift crossing midnight', () => {
  it('matches a 04:10 check-out belonging to yesterday\'s record', () => {
    const recs: Rec[] = [
      // Yesterday's open record now closed at 04:10 today
      {
        id: 'r1',
        date: '2026-05-05',
        check_in: '2026-05-05T22:00:00.000Z',
        check_out: '2026-05-06T02:10:00.000Z',
      },
    ];
    const expected = '2026-05-06T02:10:30.000Z'; // 30s skew
    const r = findMatch(recs, 'check_out', expected);
    expect(r.matchedAt).toBe('2026-05-06T02:10:00.000Z');
    expect(r.matchedDate).toBe('2026-05-05');
  });

  it('matches a check-out within 5 minutes of expected timestamp', () => {
    const recs: Rec[] = [
      { id: 'r1', date: '2026-05-05', check_in: '2026-05-05T20:00:00.000Z', check_out: '2026-05-06T03:00:00.000Z' },
    ];
    const expected = '2026-05-06T03:04:30.000Z';
    expect(findMatch(recs, 'check_out', expected).matchedAt).toBe('2026-05-06T03:00:00.000Z');
  });

  it('does NOT match when timestamp drift is more than 5 minutes', () => {
    const recs: Rec[] = [
      { id: 'r1', date: '2026-05-05', check_in: '2026-05-05T20:00:00.000Z', check_out: '2026-05-06T03:00:00.000Z' },
    ];
    const expected = '2026-05-06T03:10:00.000Z'; // 10 min off
    expect(findMatch(recs, 'check_out', expected).matchedAt).toBeNull();
  });

  it('skips records without the required stamp', () => {
    const recs: Rec[] = [
      { id: 'r1', date: '2026-05-06', check_in: '2026-05-06T08:00:00.000Z', check_out: null },
      { id: 'r2', date: '2026-05-05', check_in: '2026-05-05T22:00:00.000Z', check_out: '2026-05-06T02:00:00.000Z' },
    ];
    const r = findMatch(recs, 'check_out', '2026-05-06T02:00:30.000Z');
    expect(r.matchedAt).toBe('2026-05-06T02:00:00.000Z');
    expect(r.matchedDate).toBe('2026-05-05');
  });

  it('matches check_in events on the most recent record', () => {
    const recs: Rec[] = [
      { id: 'r1', date: '2026-05-06', check_in: '2026-05-06T08:00:00.000Z', check_out: null },
    ];
    const r = findMatch(recs, 'check_in', '2026-05-06T08:00:15.000Z');
    expect(r.matchedAt).toBe('2026-05-06T08:00:00.000Z');
  });

  it('returns null for empty record list', () => {
    expect(findMatch([], 'check_out', '2026-05-06T02:00:00.000Z').matchedAt).toBeNull();
  });
});
