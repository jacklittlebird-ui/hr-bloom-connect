import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const HMAC_SECRET = Deno.env.get("QR_HMAC_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function auditCheckout(
  userId: string,
  employeeId: string | null,
  status: "attempt" | "success" | "failure",
  details: Record<string, unknown>,
  recordId?: string,
) {
  const { error } = await admin.from("audit_logs").insert({
    user_id: userId,
    action_type: `CHECKOUT_${status.toUpperCase()}`,
    affected_table: "attendance_records",
    record_id: recordId ?? employeeId ?? userId,
    new_data: {
      employee_id: employeeId,
      ...details,
    },
  });

  if (error) {
    console.error("[submit-scan] checkout audit FAILED:", error);
  }
}

async function getCheckoutVerificationState(employeeId: string) {
  const { data: latestRecord } = await admin
    .from("attendance_records")
    .select("id, date, check_in, check_out")
    .eq("employee_id", employeeId)
    .order("check_in", { ascending: false })
    .limit(1)
    .maybeSingle();

  const verified = !!latestRecord && !!latestRecord.check_in && !!latestRecord.check_out;
  return { latestRecord, verified };
}

const MAX_DEVICES_PER_USER = 3;
const DEVICE_EXPIRY_DAYS = 90;
const SOFT_MATCH_THRESHOLD = 2;

function b64urlToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const base64 = (s + pad).replaceAll("-", "+").replaceAll("_", "/");
  return new Uint8Array([...atob(base64)].map((c) => c.charCodeAt(0)));
}

async function hmacVerify(payload: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(HMAC_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlToBytes(signature),
    new TextEncoder().encode(payload)
  );
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ─── Device binding ─────────────────────────────────────────────────────────

interface DeviceMeta {
  browser?: string;
  os?: string;
  deviceType?: string;
}

function softMatchScore(
  meta: DeviceMeta,
  record: { browser?: string; os?: string; device_type?: string }
): number {
  let score = 0;
  if (meta.browser && meta.browser === record.browser) score++;
  if (meta.os && meta.os === record.os) score++;
  if (meta.deviceType && meta.deviceType === record.device_type) score++;
  return score;
}

async function resolveDevice(
  supabaseAdmin: any,
  userId: string,
  deviceId: string,
  meta: DeviceMeta | null
): Promise<{ allowed: boolean; reason?: string; action?: string }> {
  const now = new Date().toISOString();

  const { data: userDevices } = await supabaseAdmin
    .from("user_devices")
    .select("id, device_id, browser, os, device_type, expires_at, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);

  const devices = (userDevices || []).filter(
    (d: any) => !d.expires_at || new Date(d.expires_at) > new Date()
  );

  const exactMatch = devices.find((d: any) => d.device_id === deviceId);
  if (exactMatch) {
    await supabaseAdmin
      .from("user_devices")
      .update({ last_used_at: now })
      .eq("id", exactMatch.id);
    return { allowed: true };
  }

  if (meta && devices.length > 0) {
    for (const dev of devices) {
      const score = softMatchScore(meta, dev);
      if (score >= SOFT_MATCH_THRESHOLD) {
        await supabaseAdmin
          .from("user_devices")
          .update({
            device_id: deviceId,
            last_used_at: now,
            browser: meta.browser || dev.browser,
            os: meta.os || dev.os,
            device_type: meta.deviceType || dev.device_type,
          })
          .eq("id", dev.id);
        return { allowed: true, action: "soft_match_updated" };
      }
    }
  }

  if (devices.length < MAX_DEVICES_PER_USER) {
    await supabaseAdmin.from("user_devices").insert({
      user_id: userId,
      device_id: deviceId,
      browser: meta?.browser || null,
      os: meta?.os || null,
      device_type: meta?.deviceType || null,
      expires_at: new Date(Date.now() + DEVICE_EXPIRY_DAYS * 86400_000).toISOString(),
    });
    return { allowed: true, action: "new_device_registered" };
  }

  return { allowed: false, reason: "device_limit", action: "show_update_button" };
}

// ─── Main handler ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const token_str = authHeader.replace("Bearer ", "");
    const { data: { user: authUser }, error: userError } = await admin.auth.getUser(token_str);
    if (userError || !authUser) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const user_id = authUser.id;

    const body = await req.json();
    const { token, event_type, device_id, gps, device_meta } = body;

    if (!token || !event_type || !device_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    if (!["check_in", "check_out"].includes(event_type)) {
      return new Response(JSON.stringify({ error: "Invalid event_type" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Parse and verify QR token
    const parts = token.split(".");
    if (parts.length !== 2) {
      return new Response(JSON.stringify({ error: "Malformed token" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const [payloadB64, signature] = parts;
    let payloadStr: string;
    try {
      payloadStr = atob(payloadB64);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid token encoding" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const colonIdx = payloadStr.indexOf(":");
    if (colonIdx === -1) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const tsStr = payloadStr.substring(0, colonIdx);
    const location_id = payloadStr.substring(colonIdx + 1);
    const tsSec = Number(tsStr);
    if (!Number.isFinite(tsSec) || !location_id) {
      return new Response(JSON.stringify({ error: "Invalid payload data" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const ok = await hmacVerify(payloadStr, signature);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const TOKEN_TTL = 2700;
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - tsSec) > TOKEN_TTL + 30) {
      return new Response(JSON.stringify({ error: "Token expired" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Verify location
    const { data: loc } = await admin
      .from("qr_locations")
      .select("id, latitude, longitude, radius_m, is_active")
      .eq("id", location_id)
      .maybeSingle();
    if (!loc?.is_active) {
      return new Response(JSON.stringify({ error: "Inactive/unknown location" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Optional geofence check
    if (loc.latitude != null && loc.longitude != null && loc.radius_m != null && gps) {
      const { lat, lng, accuracy } = gps;
      if (typeof lat === "number" && typeof lng === "number") {
        const d = distanceMeters(lat, lng, loc.latitude, loc.longitude);
        const cushion = Math.max(50, Number(accuracy || 0));
        if (d > loc.radius_m + cushion) {
          await admin.from("device_alerts").insert({
            device_id,
            user_id,
            reason: "geofence_miss",
            meta: { distance_m: Math.round(d), accuracy },
          });
        }
      }
    }

    // Anti-fraud: each device can only be used by ONE user per day
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: otherUsersOnDevice } = await admin
      .from("attendance_events")
      .select("user_id")
      .eq("device_id", device_id)
      .gte("scan_time", todayStr + "T00:00:00Z")
      .neq("user_id", user_id)
      .limit(1);

    if (otherUsersOnDevice && otherUsersOnDevice.length > 0) {
      await admin.from("device_alerts").insert({
        user_id, device_id,
        reason: "device_shared_fraud",
        meta: { date: todayStr, other_user: otherUsersOnDevice[0].user_id },
      });
      return new Response(
        JSON.stringify({
          error: "هذا الجهاز مسجل لموظف آخر اليوم / This device was used by another employee today.",
          device_fraud: true,
        }),
        { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Multi-device binding
    const deviceResult = await resolveDevice(
      admin, user_id, device_id,
      device_meta ? { browser: device_meta.browser, os: device_meta.os, deviceType: device_meta.deviceType } : null
    );

    if (!deviceResult.allowed) {
      await admin.from("device_alerts").insert({
        user_id, device_id,
        reason: "device_limit_reached",
        meta: { action: deviceResult.action },
      });
      return new Response(
        JSON.stringify({
          error: "تم الوصول للحد الأقصى للأجهزة (3) / Max devices (3) reached.",
          device_limit: true,
        }),
        { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    if (deviceResult.action) {
      await admin.from("device_alerts").insert({
        user_id, device_id,
        reason: deviceResult.action,
        meta: { device_meta: device_meta || null },
      });
    }

    // Resolve employee_id
    const { data: roleData } = await admin
      .from("user_roles")
      .select("employee_id")
      .eq("user_id", user_id)
      .maybeSingle();

    const empId = roleData?.employee_id || null;

    // ─── Idempotency lock (DB-level, 30s) ───────────────────────────────
    // Atomically reserves (employee_id, device_id, event_type) so concurrent
    // double-clicks / network retries cannot both proceed.
    if (empId) {
      const { data: lockAcquired, error: lockErr } = await admin.rpc(
        "try_acquire_attendance_lock",
        {
          p_employee_id: empId,
          p_device_id: device_id,
          p_event_type: event_type,
          p_ttl_seconds: 30,
        },
      );
      if (lockErr) {
        console.error("[submit-scan] lock acquire failed:", lockErr);
      }
      if (lockAcquired === false) {
        if (event_type === "check_out") {
          const verification = await getCheckoutVerificationState(empId);
          return new Response(JSON.stringify({
            ok: verification.verified,
            event_type,
            deduplicated: true,
            verified: verification.verified,
            reason: "concurrent_lock",
            error: verification.verified ? undefined : "Check-out is still being processed",
          }), {
            status: verification.verified ? 200 : 409,
            headers: { ...corsHeaders, "content-type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true, event_type, deduplicated: true, verified: true, reason: "concurrent_lock" }), {
          status: 200,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }
    }

    // Insert attendance event
    const { error: attendanceEventError } = await admin.from("attendance_events").insert({
      user_id,
      employee_id: empId,
      event_type,
      device_id,
      location_id,
      token_ts: new Date(tsSec * 1000).toISOString(),
      gps_lat: gps?.lat ?? null,
      gps_lng: gps?.lng ?? null,
    });

    if (attendanceEventError) {
      console.error("[submit-scan] attendance event insert FAILED:", attendanceEventError);
      return new Response(JSON.stringify({ error: "Failed to record attendance event" }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Sync to attendance_records
    if (!empId) {
      console.error("[submit-scan] employee link missing for user:", user_id);
      return new Response(JSON.stringify({ error: "Employee account is not linked correctly" }), {
        status: 409,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    {
      const { data: empData } = await admin
        .from("employees")
        .select("station_id, stations(timezone)")
        .eq("id", empId)
        .maybeSingle();
      const tz = (empData?.stations as any)?.timezone || "Africa/Cairo";

      const { data: assignmentData } = await admin
        .from("attendance_assignments")
        .select("rule_id, attendance_rules(schedule_type)")
        .eq("employee_id", empId)
        .eq("is_active", true)
        .maybeSingle();

      const scheduleType = (assignmentData?.attendance_rules as any)?.schedule_type || "fixed";
      const isFlexible = ["flexible", "fully-flexible", "fully_flexible"].includes(scheduleType);

      const now = new Date();
      const nowIso = now.toISOString();
      const localDateStr = now.toLocaleDateString("en-CA", { timeZone: tz });
      const localHour = parseInt(now.toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false }));

      if (event_type === "check_in") {
        // CRITICAL: Block new check_in if ANY open record exists (today or prior days).
        // The employee MUST check out first. Stale records are auto-closed by the
        // dedicated `auto-checkout` cron job — never by check_in itself.
        const { data: anyOpenRecord } = await admin
          .from("attendance_records")
          .select("id, date, check_in")
          .eq("employee_id", empId)
          .is("check_out", null)
          .not("check_in", "is", null)
          .order("check_in", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (anyOpenRecord) {
          if (anyOpenRecord.date === localDateStr) {
            console.log("[submit-scan] Already has OPEN record for today, skipping:", anyOpenRecord.id);
          } else {
            console.warn("[submit-scan] Refusing check_in: open record from previous day", anyOpenRecord.id);
            return new Response(JSON.stringify({
              error: "يوجد سجل حضور مفتوح من يوم سابق. يرجى تسجيل الانصراف أولاً / You have an open check-in from a previous day. Please check out first.",
              error_code: "OPEN_RECORD_EXISTS",
              retryable: false,
            }), { status: 409, headers: { ...corsHeaders, "content-type": "application/json" } });
          }
        } else {
          // No open record — create a new one
          const isLate = !isFlexible && localHour >= 9;
          const { error: insertErr } = await admin.from("attendance_records").insert({
            employee_id: empId,
            date: localDateStr,
            check_in: nowIso,
            status: isLate ? "late" : "present",
            is_late: isLate,
          });
          if (insertErr) {
            if ((insertErr as any).code === "23505") {
              console.log("[submit-scan] CHECK_IN race detected (unique index), treating as duplicate");
            } else {
              console.error("[submit-scan] CHECK_IN INSERT FAILED:", JSON.stringify(insertErr));
            }
          } else {
            console.log("[submit-scan] CHECK_IN record created for", empId, "date:", localDateStr);
          }
        }
      } else if (event_type === "check_out") {
        await auditCheckout(user_id, empId, "attempt", { channel: "qr", location_id });

        const { data: openRecord, error: findErr } = await admin
          .from("attendance_records")
          .select("id, date, check_in")
          .eq("employee_id", empId)
          .is("check_out", null)
          .order("check_in", { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log("[submit-scan] checkout lookup:", { empId, openRecord, findErr });

        if (openRecord) {
          // Enforce minimum 60 minutes between check-in and check-out
          if (openRecord.check_in) {
            const checkInTime = new Date(openRecord.check_in).getTime();
            const elapsedMinutes = (Date.now() - checkInTime) / 60000;
            if (elapsedMinutes < 60) {
              const remaining = Math.ceil(60 - elapsedMinutes);
              await auditCheckout(user_id, empId, "failure", {
                channel: "qr",
                error_code: "MINIMUM_WORK_DURATION",
                remaining_minutes: remaining,
              }, openRecord.id);
              return new Response(JSON.stringify({
                error: `لا يمكن تسجيل الانصراف قبل مرور ساعة من الحضور. المتبقي: ${remaining} دقيقة / Cannot check out before 1 hour from check-in. Remaining: ${remaining} min`,
                error_code: "MINIMUM_WORK_DURATION",
                retryable: false,
              }), {
                status: 400,
                headers: { ...corsHeaders, "content-type": "application/json" },
              });
            }
          }

          const isEarly = !isFlexible && localHour < 17;
          const updatePayload: Record<string, any> = { check_out: nowIso };
          if (isEarly) updatePayload.status = "early-leave";

          const { data: updatedRecord, error: updateErr } = await admin
            .from("attendance_records")
            .update(updatePayload)
            .eq("id", openRecord.id)
            .select("id, check_out")
            .maybeSingle();

          if (updateErr || !updatedRecord?.check_out) {
            console.error("[submit-scan] checkout update FAILED:", updateErr);
            await auditCheckout(user_id, empId, "failure", {
              channel: "qr",
              error_code: "CHECKOUT_SAVE_FAILED",
              retryable: true,
              message: updateErr?.message ?? "check_out was not persisted",
            }, openRecord.id);
            return new Response(JSON.stringify({ error: "Failed to save checkout" }), {
              status: 500,
              headers: { ...corsHeaders, "content-type": "application/json" },
            });
          }
          await auditCheckout(user_id, empId, "success", {
            channel: "qr",
            checked_out_at: updatedRecord.check_out,
          }, openRecord.id);
          console.log("[submit-scan] checkout saved for record:", openRecord.id);
        } else {
          console.warn("[submit-scan] No open record found for checkout, empId:", empId);
          await auditCheckout(user_id, empId, "failure", {
            channel: "qr",
            error_code: "NO_OPEN_RECORD",
            retryable: false,
          });
          return new Response(JSON.stringify({
            error: "لا يوجد سجل حضور مفتوح لهذا الموظف لتسجيل الانصراف / No open attendance record found for checkout",
            error_code: "NO_OPEN_RECORD",
            retryable: false,
          }), {
            status: 409,
            headers: { ...corsHeaders, "content-type": "application/json" },
          });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, event_type }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
