import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

// ─── Haversine ─────────────────────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── In-memory dedup (per isolate) ─────────────────────────────────────────

const recentCheckins = new Map<string, number>();
const DEDUP_WINDOW_MS = 10_000; // 10 seconds dedup only
const MIN_INTERVAL_MS = 60_000; // 1 minute between same event type (reduced from 5 min)

const MAX_DEVICES_PER_USER = 3;
const DEVICE_EXPIRY_DAYS = 90;
const SOFT_MATCH_THRESHOLD = 2;

function isDeduplicate(userId: string, eventType: string): boolean {
  const key = `${userId}:${eventType}`;
  const last = recentCheckins.get(key);
  return !!(last && Date.now() - last < DEDUP_WINDOW_MS);
}

function isMinIntervalViolated(userId: string, eventType: string): boolean {
  const key = `${userId}:${eventType}`;
  const last = recentCheckins.get(key);
  return !!(last && Date.now() - last < MIN_INTERVAL_MS);
}

function recordCheckin(userId: string, eventType: string): void {
  recentCheckins.set(`${userId}:${eventType}`, Date.now());
  if (recentCheckins.size > 500) {
    const cutoff = Date.now() - MIN_INTERVAL_MS;
    for (const [k, v] of recentCheckins) {
      if (v < cutoff) recentCheckins.delete(k);
    }
  }
}

// ─── Device binding helper ─────────────────────────────────────────────────

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

  return {
    allowed: false,
    reason: "device_limit",
    action: "show_update_button",
  };
}

// ─── Monitoring ────────────────────────────────────────────────────────────

let totalRequests = 0;
let totalErrors = 0;
let totalDuplicates = 0;

// ─── Main handler ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  totalRequests++;

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) return json({ error: "Invalid token" }, 401);
    const userId = user.id;

    const { event_type, gps_lat, gps_lng, gps_accuracy, device_id, device_meta } = await req.json();
    if (!event_type || !gps_lat || !gps_lng || !device_id) {
      return json({ error: "Missing fields" }, 400);
    }

    // Dedup check (10 seconds)
    if (isDeduplicate(userId, event_type)) {
      totalDuplicates++;
      return json({ ok: true, event_type, deduplicated: true }, 200);
    }

    // Min interval check (1 minute)
    if (isMinIntervalViolated(userId, event_type)) {
      return json({ error: "يرجى الانتظار دقيقة واحدة / Please wait 1 minute between attempts" }, 429);
    }

    // Resolve employee
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("employee_id")
      .eq("user_id", userId)
      .eq("role", "employee")
      .limit(1)
      .single();

    if (!role?.employee_id) return json({ error: "Employee not found" }, 404);
    const employeeId = role.employee_id;

    // Get station
    const { data: emp } = await supabaseAdmin
      .from("employees")
      .select("station_id, stations(id, checkin_method, timezone)")
      .eq("id", employeeId)
      .limit(1)
      .single();

    if (!emp?.station_id) return json({ error: "No station assigned" }, 400);

    const station = emp.stations as any;
    if (station && station.checkin_method !== "gps" && station.checkin_method !== "both") {
      return json({ error: "GPS check-in not enabled for this station" }, 403);
    }

    // Anti-fraud: each device can only be used by ONE user per day
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: otherUsersOnDevice } = await supabaseAdmin
      .from("attendance_events")
      .select("user_id")
      .eq("device_id", device_id)
      .gte("scan_time", todayStr + "T00:00:00Z")
      .neq("user_id", userId)
      .limit(1);

    if (otherUsersOnDevice && otherUsersOnDevice.length > 0) {
      await supabaseAdmin.from("device_alerts").insert({
        user_id: userId, device_id,
        reason: "device_shared_fraud",
        meta: { date: todayStr, other_user: otherUsersOnDevice[0].user_id },
      });
      return json({
        error: "هذا الجهاز مسجل لموظف آخر اليوم. لا يمكن استخدام نفس الجهاز لأكثر من موظف / This device was used by another employee today.",
        device_fraud: true,
      }, 403);
    }

    // Multi-device binding
    const deviceResult = await resolveDevice(
      supabaseAdmin, userId, device_id,
      device_meta ? { browser: device_meta.browser, os: device_meta.os, deviceType: device_meta.deviceType } : null
    );

    if (!deviceResult.allowed) {
      await supabaseAdmin.from("device_alerts").insert({
        user_id: userId, device_id,
        reason: "device_limit_reached",
        meta: { action: deviceResult.action },
      });
      return json({
        error: "تم الوصول للحد الأقصى للأجهزة (3). يرجى تحديث الأجهزة / Max devices (3) reached.",
        device_limit: true,
      }, 403);
    }

    if (deviceResult.action) {
      await supabaseAdmin.from("device_alerts").insert({
        user_id: userId, device_id,
        reason: deviceResult.action,
        meta: { device_meta: device_meta || null },
      });
    }

    // GPS geofence validation
    const empStationId = emp.station_id;

    const { data: junctionLinks } = await supabaseAdmin
      .from("qr_location_stations")
      .select("location_id")
      .eq("station_id", empStationId);

    const junctionLocationIds = (junctionLinks || []).map((r: any) => r.location_id);

    const { data: allLocations } = await supabaseAdmin
      .from("qr_locations")
      .select("id, name_ar, latitude, longitude, radius_m, station_id")
      .eq("is_active", true);

    const locations = (allLocations || []).filter((loc: any) =>
      loc.station_id === empStationId || junctionLocationIds.includes(loc.id)
    );

    if (!locations || locations.length === 0) {
      return json({ error: "No GPS locations configured for this station" }, 400);
    }

    const accuracyBuffer = Math.min(gps_accuracy || 0, 150);

    let nearestDist = Infinity;
    let matchedLocation: any = null;
    for (const loc of locations) {
      if (!loc.latitude || !loc.longitude) continue;
      const dist = haversine(gps_lat, gps_lng, loc.latitude, loc.longitude);
      if (dist < nearestDist) {
        nearestDist = dist;
        const effectiveRadius = (loc.radius_m || 150) + accuracyBuffer;
        if (dist <= effectiveRadius) {
          matchedLocation = loc;
        }
      }
    }

    if (!matchedLocation) {
      return json({
        error: `خارج النطاق المسموح - المسافة ${Math.round(nearestDist)} متر / Out of range - distance ${Math.round(nearestDist)}m`,
      }, 403);
    }

    // Record the check-in in dedup map
    recordCheckin(userId, event_type);

    const now = new Date();
    const stationTz = (emp.stations as any)?.timezone || "Africa/Cairo";
    const localTimeStr = now.toLocaleString("en-US", { timeZone: stationTz });
    const localDate = new Date(localTimeStr);
    const localHour = localDate.getHours();
    const dateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;

    // Attendance rule check
    const { data: assignment } = await supabaseAdmin
      .from("attendance_assignments")
      .select("rule_id, attendance_rules(schedule_type)")
      .eq("employee_id", employeeId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const scheduleType = (assignment?.attendance_rules as any)?.schedule_type || "fixed";
    const isFlexible = ["flexible", "fully-flexible", "fully_flexible"].includes(scheduleType);

    // Fire-and-forget: attendance event logging
    const eventPromise = supabaseAdmin.from("attendance_events").insert({
      user_id: userId,
      employee_id: employeeId,
      event_type,
      device_id,
      location_id: matchedLocation.id,
      token_ts: now.toISOString(),
      gps_lat,
      gps_lng,
    });

    // Attendance record upsert
    let recordPromise: Promise<any>;

    if (event_type === "check_in") {
      recordPromise = (async () => {
        // Close any open records from PREVIOUS days
        const { data: oldOpenRecords } = await supabaseAdmin
          .from("attendance_records")
          .select("id, check_in, date")
          .eq("employee_id", employeeId)
          .is("check_out", null)
          .not("check_in", "is", null)
          .neq("date", dateStr);

        if (oldOpenRecords && oldOpenRecords.length > 0) {
          for (const rec of oldOpenRecords) {
            await supabaseAdmin.from("attendance_records")
              .update({
                check_out: rec.check_in,
                work_hours: 0,
                work_minutes: 0,
                notes: "لم يتم تسجيل انصراف / No checkout recorded - auto-closed",
              })
              .eq("id", rec.id);
          }
        }

        // Check if there's an OPEN record for today (no check_out) — block duplicate check-in
        const { data: openTodayRecord } = await supabaseAdmin
          .from("attendance_records")
          .select("id")
          .eq("employee_id", employeeId)
          .eq("date", dateStr)
          .is("check_out", null)
          .limit(1)
          .maybeSingle();

        if (openTodayRecord) {
          console.log("[gps-checkin] Already has OPEN record for today, skipping:", openTodayRecord.id);
          return; // Don't create another open record
        }

        // Allow new check-in even if there are closed records for today
        const isLate = !isFlexible && localHour >= 9;
        const insertPayload = {
          employee_id: employeeId,
          date: dateStr,
          check_in: now.toISOString(),
          status: isLate ? "late" : "present",
          is_late: isLate,
          notes: `GPS - ${matchedLocation.name_ar}`,
        };

        const { error } = await supabaseAdmin.from("attendance_records").insert(insertPayload);
        if (error) {
          console.error("[gps-checkin] CHECK_IN INSERT FAILED:", JSON.stringify(error));
          throw new Error("Failed to create attendance record: " + error.message);
        }
        console.log("[gps-checkin] CHECK_IN record created for", employeeId, "date:", dateStr);
      })();
    } else {
      recordPromise = (async () => {
        // Find the most recent open record (any date)
        const { data: openRecord, error: findErr } = await supabaseAdmin
          .from("attendance_records")
          .select("id")
          .eq("employee_id", employeeId)
          .is("check_out", null)
          .order("check_in", { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log("[gps-checkin] checkout lookup:", { employeeId, openRecord, findErr });

        if (!openRecord) {
          throw new Error("لا يوجد سجل حضور مفتوح / No open check-in found");
        }

        const isEarly = !isFlexible && localHour < 17;
        const updatePayload: Record<string, any> = { check_out: now.toISOString() };
        if (isEarly) updatePayload.status = "early-leave";

        const { error: updateErr } = await supabaseAdmin.from("attendance_records")
          .update(updatePayload)
          .eq("id", openRecord.id);

        if (updateErr) {
          console.error("[gps-checkin] checkout update FAILED:", updateErr);
          throw new Error("Failed to save checkout: " + updateErr.message);
        }
        console.log("[gps-checkin] checkout saved for record:", openRecord.id);
      })();
    }

    const [, recordResult] = await Promise.allSettled([eventPromise, recordPromise]);

    if (recordResult.status === "rejected") {
      return json({ error: recordResult.reason?.message || "Record error" }, 404);
    }

    const elapsed = Math.round(performance.now() - startTime);
    return json({
      ok: true,
      event_type,
      location: matchedLocation.name_ar,
      response_ms: elapsed,
    }, 200);
  } catch (e: any) {
    totalErrors++;
    return json({ error: e.message }, 500);
  }
});
