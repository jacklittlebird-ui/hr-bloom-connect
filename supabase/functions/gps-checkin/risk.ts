// Pure risk-assessment rules for attendance attempts (no Deno/network APIs, unit-tested in src/test).

export interface RiskRules {
  max_accuracy_m: number;
  max_speed_kmh: number;
}

export interface RiskInput {
  accuracy_m: number | null;
  lat: number;
  lng: number;
  now_ms: number;
  prev?: { lat: number; lng: number; at_ms: number } | null;
  new_device?: boolean;
}

export interface RiskResult {
  level: "low" | "medium" | "high";
  reasons: string[];
  category: string;
  speed_kmh: number | null;
}

export const DEFAULT_RULES: RiskRules = { max_accuracy_m: 150, max_speed_kmh: 250 };

export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function assessRisk(input: RiskInput, rules: RiskRules = DEFAULT_RULES): RiskResult {
  const reasons: string[] = [];
  let score = 0;
  let category = "other";
  let speed: number | null = null;

  if (input.accuracy_m != null && input.accuracy_m > rules.max_accuracy_m) {
    reasons.push("low_accuracy");
    score += 1;
    category = "suspicious_location";
  }

  if (input.prev) {
    const dtH = (input.now_ms - input.prev.at_ms) / 3_600_000;
    const dKm = distanceMeters(input.prev.lat, input.prev.lng, input.lat, input.lng) / 1000;
    // ignore tiny moves (GPS jitter) under 2 km
    if (dtH > 0 && dKm >= 2) {
      speed = dKm / dtH;
      if (speed > rules.max_speed_kmh) {
        reasons.push("impossible_travel");
        score += 2;
        category = "suspicious_location";
      }
    }
  }

  if (input.new_device) {
    reasons.push("new_device");
    score += 1;
    if (category === "other") category = "new_device";
  }

  const level = score >= 2 ? "high" : score === 1 ? "medium" : "low";
  return { level, reasons, category, speed_kmh: speed == null ? null : Math.round(speed) };
}
