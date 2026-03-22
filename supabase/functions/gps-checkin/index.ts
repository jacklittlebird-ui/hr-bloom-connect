import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Validate user via getUser
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const userId = user.id;

    const { event_type, gps_lat, gps_lng, gps_accuracy, device_id } = await req.json();

    if (!event_type || !gps_lat || !gps_lng || !device_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Get employee_id from user_roles
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("employee_id")
      .eq("user_id", userId)
      .eq("role", "employee")
      .single();

    if (!role?.employee_id) {
      return new Response(JSON.stringify({ error: "Employee not found" }), {
        status: 404,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const employeeId = role.employee_id;

    // Get station_id
    const { data: emp } = await supabaseAdmin
      .from("employees")
      .select("station_id")
      .eq("id", employeeId)
      .single();

    if (!emp?.station_id) {
      return new Response(JSON.stringify({ error: "No station assigned" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Verify station allows GPS
    const { data: station } = await supabaseAdmin
      .from("stations")
      .select("checkin_method")
      .eq("id", emp.station_id)
      .single();

    if (station && station.checkin_method !== "gps" && station.checkin_method !== "both") {
      return new Response(
        JSON.stringify({ error: "GPS check-in not enabled for this station" }),
        { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Get allowed locations for station
    const { data: locations } = await supabaseAdmin
      .from("qr_locations")
      .select("*")
      .eq("station_id", emp.station_id)
      .eq("is_active", true);

    if (!locations || locations.length === 0) {
      return new Response(
        JSON.stringify({ error: "No GPS locations configured for this station" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Find nearest location and check geofence
    let nearestDist = Infinity;
    let matchedLocation: any = null;
    for (const loc of locations) {
      if (!loc.latitude || !loc.longitude) continue;
      const dist = haversine(gps_lat, gps_lng, loc.latitude, loc.longitude);
      if (dist < nearestDist) {
        nearestDist = dist;
        if (dist <= (loc.radius_m || 150)) {
          matchedLocation = loc;
        }
      }
    }

    if (!matchedLocation) {
      return new Response(
        JSON.stringify({
          error: `خارج النطاق المسموح - المسافة ${Math.round(nearestDist)} متر / Out of range - distance ${Math.round(nearestDist)}m`,
        }),
        { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Device binding check
    const { data: existingDevice } = await supabaseAdmin
      .from("user_devices")
      .select("device_id")
      .eq("user_id", userId)
      .single();

    if (existingDevice) {
      if (existingDevice.device_id !== device_id) {
        // Log alert
        await supabaseAdmin.from("device_alerts").insert({
          user_id: userId,
          device_id,
          reason: "device_mismatch",
          meta: { expected: existingDevice.device_id, got: device_id },
        });
        return new Response(
          JSON.stringify({ error: "جهاز غير مصرح / Unauthorized device" }),
          { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } }
        );
      }
    } else {
      // Bind device
      await supabaseAdmin.from("user_devices").insert({
        user_id: userId,
        device_id,
      });
    }

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    // Insert attendance event
    await supabaseAdmin.from("attendance_events").insert({
      user_id: userId,
      employee_id: employeeId,
      event_type,
      device_id,
      location_id: matchedLocation.id,
      token_ts: now.toISOString(),
      gps_lat,
      gps_lng,
    });

    // Check if employee has a fully_flexible attendance rule (no late/early tracking)
    const { data: assignment } = await supabaseAdmin
      .from("attendance_assignments")
      .select("rule_id, attendance_rules(schedule_type)")
      .eq("employee_id", employeeId)
      .eq("is_active", true)
      .maybeSingle();

    const scheduleType = (assignment?.attendance_rules as any)?.schedule_type || "fixed";
    const isFlexible = ["flexible", "fully-flexible", "fully_flexible"].includes(scheduleType);

    if (event_type === "check_in") {
      // Close any open record (no check_out) for today before creating a new one
      const { data: openRecord } = await supabaseAdmin
        .from("attendance_records")
        .select("id")
        .eq("employee_id", employeeId)
        .eq("date", dateStr)
        .is("check_out", null)
        .maybeSingle();

      if (openRecord) {
        await supabaseAdmin.from("attendance_records").update({
          check_out: now.toISOString(),
        }).eq("id", openRecord.id);
      }

      const isLate = !isFlexible && now.getHours() >= 9;
      await supabaseAdmin.from("attendance_records").insert({
        employee_id: employeeId,
        date: dateStr,
        check_in: now.toISOString(),
        status: isLate ? "late" : "present",
        is_late: isLate,
        notes: `GPS - ${matchedLocation.name_ar}`,
      });
    } else {
      // check_out — find the latest open record for today
      const { data: openRecord } = await supabaseAdmin
        .from("attendance_records")
        .select("id")
        .eq("employee_id", employeeId)
        .is("check_out", null)
        .order("check_in", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!openRecord) {
        return new Response(
          JSON.stringify({ error: "لا يوجد سجل حضور مفتوح / No open check-in found" }),
          { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } }
        );
      }

      const isEarly = !isFlexible && now.getHours() < 17;
      await supabaseAdmin.from("attendance_records").update({
        check_out: now.toISOString(),
        status: isEarly ? "early-leave" : undefined,
      }).eq("id", openRecord.id);
    }

    return new Response(
      JSON.stringify({ ok: true, event_type, location: matchedLocation.name_ar }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
