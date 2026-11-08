// ─── Stable Device ID ─────────────────────────────────────────────────
// Persisted in localStorage. Never regenerated on login.
// Only regenerated if localStorage is cleared (browser reset / reinstall).

const DEVICE_ID_KEY = "attendance_device_id";

export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    id = [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// ─── Device Metadata (stable identifiers only) ───────────────────────
// We do NOT include: IP address, browser version, screen resolution
// Only: browser family, OS family, device type

export interface DeviceMeta {
  browser: string;
  os: string;
  deviceType: string;
}

export function getDeviceMeta(): DeviceMeta {
  const ua = navigator.userAgent;

  // Browser family (stable — not version)
  let browser = "unknown";
  if (/Edg\//i.test(ua)) browser = "edge";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "opera";
  else if (/SamsungBrowser/i.test(ua)) browser = "samsung";
  else if (/Chrome/i.test(ua)) browser = "chrome";
  else if (/Firefox/i.test(ua)) browser = "firefox";
  else if (/Safari/i.test(ua)) browser = "safari";

  // OS family (stable — not version)
  let os = "unknown";
  if (/Android/i.test(ua)) os = "android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "ios";
  else if (/Windows/i.test(ua)) os = "windows";
  else if (/Mac/i.test(ua)) os = "macos";
  else if (/Linux/i.test(ua)) os = "linux";

  // Device type
  let deviceType = "desktop";
  if (/Mobi|Android/i.test(ua)) deviceType = "mobile";
  else if (/Tablet|iPad/i.test(ua)) deviceType = "tablet";

  // Phones with "Desktop site" enabled report a Linux/Mac desktop UA.
  // Detect real touch phones/tablets via hints and touch capability.
  if (deviceType === "desktop") {
    const uaData = (navigator as any).userAgentData;
    const touch = (navigator.maxTouchPoints || 0) > 1;
    const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    const smallScreen = typeof screen !== "undefined" && Math.min(screen.width, screen.height) <= 1024;
    const isTouchDevice = uaData?.mobile === true || (touch && coarse && smallScreen);
    if (isTouchDevice) {
      if (os === "macos") { os = "ios"; deviceType = "tablet"; }
      else if (os === "linux" || os === "unknown") { os = "android"; deviceType = "mobile"; }
    }
  }

  return { browser, os, deviceType };
}

// ─── Soft match score ────────────────────────────────────────────────
// Returns similarity 0-3 based on browser + os + deviceType matching.
export function deviceMatchScore(
  a: DeviceMeta,
  b: { browser?: string; os?: string; device_type?: string }
): number {
  let score = 0;
  if (a.browser === b.browser) score++;
  if (a.os === b.os) score++;
  if (a.deviceType === b.device_type) score++;
  return score;
}
