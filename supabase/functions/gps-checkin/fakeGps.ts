// Fake-GPS detection from several live samples collected on the device.
// Real satellite fixes always jitter between readings; mock-location apps
// return frozen coordinates / accuracy and usually an altitude of exactly 0.
export interface GpsSample {
  lat: number; lng: number; acc: number | null; alt: number | null;
  alt_acc: number | null; speed: number | null; ts: number;
}

export interface FakeGpsVerdict {
  block: boolean;
  reasons: string[]; // block reasons + soft flags
}

const r7 = (n: number) => Math.round(Number(n) * 1e7);

export function analyzeGpsSamples(raw: unknown): FakeGpsVerdict {
  const reasons: string[] = [];
  if (!Array.isArray(raw)) return { block: false, reasons: ["no_samples"] };
  const s = (raw as GpsSample[]).filter(
    (x) => x && Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lng)),
  ).slice(0, 10);
  if (s.length < 3) return { block: false, reasons: ["few_samples"] };

  const sameCoords = s.every((x) => r7(x.lat) === r7(s[0].lat) && r7(x.lng) === r7(s[0].lng));
  const sameAcc = s.every((x) => x.acc === s[0].acc);
  const altZero = s.every((x) => x.alt === 0);
  const altMissing = s.every((x) => x.alt == null);
  const intAcc = s.every((x) => x.acc != null && Number.isInteger(x.acc));

  if (sameCoords && sameAcc) reasons.push("zero_jitter");
  if (altZero) reasons.push("zero_altitude");
  if (altMissing) reasons.push("missing_altitude");
  if (intAcc) reasons.push("rounded_accuracy");

  // Block on strong signals: perfectly frozen readings, or zero altitude
  // combined with any other mock fingerprint.
  const block = reasons.includes("zero_jitter") && (altZero || altMissing || intAcc)
    || (altZero && (sameCoords || intAcc));
  return { block, reasons };
}
