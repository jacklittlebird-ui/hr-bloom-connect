import { describe, it, expect } from 'vitest';
import { analyzeGpsSamples } from '../../supabase/functions/gps-checkin/fakeGps';

const real = [
  { lat: 30.1127312, lng: 31.3938321, acc: 12.4, alt: 104.2, alt_acc: 6.1, speed: null, ts: 1 },
  { lat: 30.1127355, lng: 31.3938299, acc: 11.8, alt: 104.9, alt_acc: 5.9, speed: null, ts: 2 },
  { lat: 30.1127290, lng: 31.3938340, acc: 12.1, alt: 103.7, alt_acc: 6.0, speed: null, ts: 3 },
];
const fake = [1, 2, 3].map((ts) => ({ lat: 30.111635, lng: 31.396729, acc: 5, alt: 0, alt_acc: null, speed: 0, ts }));

describe('fake GPS samples', () => {
  it('accepts real jittering GPS', () => expect(analyzeGpsSamples(real).block).toBe(false));
  it('blocks frozen mock-location readings', () => expect(analyzeGpsSamples(fake).block).toBe(true));
  it('does not block old clients without samples', () => expect(analyzeGpsSamples(null).block).toBe(false));
});
