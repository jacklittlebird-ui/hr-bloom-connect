import { describe, it, expect } from 'vitest';
import { assessRisk } from '../../supabase/functions/gps-checkin/risk';

const base = { lat: 30.1, lng: 31.4, now_ms: 10 * 3_600_000 };

describe('attendance risk rules', () => {
  it('clean attempt is low risk', () => {
    expect(assessRisk({ ...base, accuracy_m: 20 }).level).toBe('low');
  });
  it('accuracy above 150m is flagged medium', () => {
    const r = assessRisk({ ...base, accuracy_m: 200 });
    expect(r.level).toBe('medium');
    expect(r.reasons).toContain('low_accuracy');
  });
  it('300 km in 30 minutes is impossible travel (high)', () => {
    // ~3 degrees latitude ≈ 333 km
    const r = assessRisk({ ...base, accuracy_m: 20, prev: { lat: 27.1, lng: 31.4, at_ms: base.now_ms - 1_800_000 } });
    expect(r.level).toBe('high');
    expect(r.reasons).toContain('impossible_travel');
  });
  it('small GPS jitter does not count as travel', () => {
    const r = assessRisk({ ...base, accuracy_m: 20, prev: { lat: 30.1005, lng: 31.4, at_ms: base.now_ms - 1000 } });
    expect(r.reasons).not.toContain('impossible_travel');
  });
  it('new device alone is medium', () => {
    expect(assessRisk({ ...base, accuracy_m: 20, new_device: true }).level).toBe('medium');
  });
});
