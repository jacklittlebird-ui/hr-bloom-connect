import { describe, it, expect } from 'vitest';
import { cairoLocalToIso, toCairoHHMM, validateMissionWindow, MISSION_WINDOWS } from '@/lib/missionTime';

describe('mission time / Africa/Cairo', () => {
  it('Morning mission stored at 09:00 Cairo reads back as 09:00 in DST (June)', () => {
    const iso = cairoLocalToIso('2026-06-17', '09:00');
    // June Cairo = UTC+3, so 09:00 Cairo = 06:00 UTC
    expect(iso).toBe('2026-06-17T06:00:00.000Z');
    expect(toCairoHHMM(iso)).toBe('09:00');
  });

  it('Evening mission window roundtrips for July (DST)', () => {
    const ci = cairoLocalToIso('2026-07-05', '13:00');
    const co = cairoLocalToIso('2026-07-05', '17:00');
    expect(toCairoHHMM(ci)).toBe('13:00');
    expect(toCairoHHMM(co)).toBe('17:00');
  });

  it('Winter (January) handles UTC+2 correctly', () => {
    const iso = cairoLocalToIso('2026-01-15', '09:00');
    expect(iso).toBe('2026-01-15T07:00:00.000Z');
    expect(toCairoHHMM(iso)).toBe('09:00');
  });

  it('validateMissionWindow accepts a correct morning mission', () => {
    const ci = cairoLocalToIso('2026-06-17', '09:00');
    const co = cairoLocalToIso('2026-06-17', '13:00');
    const r = validateMissionWindow('morning', ci, co);
    expect(r.ok).toBe(true);
  });

  it('validateMissionWindow flags an evening mission stored as 14:00–20:00 UTC-shifted', () => {
    // Simulate the old bug: stored as raw "14:00"/"20:00" UTC -> reads as 17:00/23:00 Cairo
    const ci = '2026-06-17T14:00:00.000Z';
    const co = '2026-06-17T20:00:00.000Z';
    const r = validateMissionWindow('evening', ci, co);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.expected).toEqual(MISSION_WINDOWS.evening);
      expect(r.actual.checkIn).not.toBe('13:00');
    }
  });

  it('full_day mission window 09:00–17:00 Cairo', () => {
    const ci = cairoLocalToIso('2026-06-17', '09:00');
    const co = cairoLocalToIso('2026-06-17', '17:00');
    expect(validateMissionWindow('full_day', ci, co).ok).toBe(true);
  });
});
