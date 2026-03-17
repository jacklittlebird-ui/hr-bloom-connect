import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const HMAC_SECRET = Deno.env.get("QR_HMAC_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require Supabase user session
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Validate user via getUser (service role)
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
    const { token, event_type, device_id, gps } = body;

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

    // Parse and verify token
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

    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - tsSec) > 8) {
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

    // Device binding & enforcement
    // A user can only check in/out from ONE mobile device.
    // First scan binds the device; subsequent scans from a different device are rejected.
    const { data: devByUser } = await admin
      .from("user_devices")
      .select("device_id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!devByUser) {
      // First time — bind this device to the user
      await admin.from("user_devices").insert({ user_id, device_id });
    } else if (devByUser.device_id !== device_id) {
      // User already has a bound device and is using a different one → BLOCK
      await admin.from("device_alerts").insert({
        device_id,
        user_id,
        reason: "blocked_different_device",
        meta: { bound_device: devByUser.device_id, attempted_device: device_id },
      });
      return new Response(
        JSON.stringify({ error: "يجب استخدام نفس الجهاز المسجل للحضور والانصراف / You must use your registered mobile device for check-in/out" }),
        { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Also check if this device_id is bound to a DIFFERENT user
    const { data: devById } = await admin
      .from("user_devices")
      .select("user_id")
      .eq("device_id", device_id)
      .maybeSingle();
    if (devById && devById.user_id !== user_id) {
      await admin.from("device_alerts").insert({
        device_id,
        user_id,
        reason: "shared_device_detected",
        meta: { first_user: devById.user_id },
      });
      return new Response(
        JSON.stringify({ error: "هذا الجهاز مسجل لموظف آخر / This device is registered to another employee" }),
        { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Resolve employee_id from user_roles
    const { data: roleData } = await admin
      .from("user_roles")
      .select("employee_id")
      .eq("user_id", user_id)
      .maybeSingle();

    const empId = roleData?.employee_id || null;

    // Insert attendance event
    await admin.from("attendance_events").insert({
      user_id,
      employee_id: empId,
      event_type,
      device_id,
      location_id,
      token_ts: new Date(tsSec * 1000).toISOString(),
      gps_lat: gps?.lat ?? null,
      gps_lng: gps?.lng ?? null,
    });

    // Sync to attendance_records so employee can see it
    if (empId) {
      // Get employee's station timezone (default: Africa/Cairo)
      const { data: empData } = await admin
        .from("employees")
        .select("station_id, stations(timezone)")
        .eq("id", empId)
        .maybeSingle();
      const tz = (empData?.stations as any)?.timezone || "Africa/Cairo";

      const now = new Date();
      const nowIso = now.toISOString();
      // Get local date & hour in the employee's timezone
      const localDateStr = now.toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
      const localHour = parseInt(now.toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false }));

      if (event_type === "check_in") {
        const isLate = localHour >= 9;
        await admin.from("attendance_records").insert({
          employee_id: empId,
          date: localDateStr,
          check_in: nowIso,
          status: isLate ? "late" : "present",
          is_late: isLate,
        });
      } else if (event_type === "check_out") {
        const { data: openRecord } = await admin
          .from("attendance_records")
          .select("id, date")
          .eq("employee_id", empId)
          .is("check_out", null)
          .order("check_in", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (openRecord) {
          const isEarly = localHour < 17;
          await admin
            .from("attendance_records")
            .update({
              check_out: nowIso,
              ...(isEarly ? { status: "early-leave" } : {}),
            })
            .eq("id", openRecord.id);
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
