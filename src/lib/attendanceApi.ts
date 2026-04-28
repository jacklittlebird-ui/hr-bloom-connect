export interface AttendanceFunctionResult {
  ok: boolean;
  error?: string;
  error_code?: string;
  retryable?: boolean;
  event_type?: string;
  location?: string;
  attempts?: number;
  deduplicated?: boolean;
  verified?: boolean;
  reason?: string;
  [key: string]: unknown;
}

interface InvokeAttendanceFunctionOptions {
  retryOnTransient?: boolean;
  retryDelayMs?: number;
}

const TRANSIENT_STATUSES = new Set([408, 500, 502, 503, 504]);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function invokeAttendanceFunction(
  functionName: string,
  accessToken: string,
  body: Record<string, unknown>,
  options: InvokeAttendanceFunctionOptions = {},
): Promise<AttendanceFunctionResult> {
  const { retryOnTransient = false, retryDelayMs = 1200 } = options;
  const maxAttempts = retryOnTransient ? 2 : 1;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));
      const isTransient = TRANSIENT_STATUSES.has(response.status) || payload?.retryable === true;

      if (response.ok && payload?.ok !== false) {
        return { ...(payload as AttendanceFunctionResult), ok: true, attempts: attempt };
      }

      if (retryOnTransient && attempt < maxAttempts && isTransient) {
        await delay(retryDelayMs);
        continue;
      }

      return {
        ok: false,
        error: payload?.error ?? response.statusText,
        error_code: payload?.error_code,
        retryable: payload?.retryable ?? isTransient,
        attempts: attempt,
      };
    } catch (error: any) {
      const message = error?.message ?? 'Network request failed';

      if (retryOnTransient && attempt < maxAttempts) {
        await delay(retryDelayMs);
        continue;
      }

      return {
        ok: false,
        error: message,
        error_code: 'NETWORK_ERROR',
        retryable: true,
        attempts: attempt,
      };
    }
  }

  return {
    ok: false,
    error: 'Unexpected attendance request failure',
    error_code: 'UNKNOWN_ATTENDANCE_ERROR',
    retryable: false,
    attempts: maxAttempts,
  };
}