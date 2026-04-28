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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ ok: false, error: "Missing auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) return json({ ok: false, error: "Invalid token" }, 401);

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("employee_id")
      .eq("user_id", user.id)
      .eq("role", "employee")
      .limit(1)
      .single();

    if (!role?.employee_id) return json({ ok: false, error: "Employee not found" }, 404);

    const { data: emp } = await supabaseAdmin
      .from("employees")
      .select("id, station_id, stations(id, checkin_method, timezone)")
      .eq("id", role.employee_id)
      .limit(1)
      .single();

    const station = emp?.stations as { checkin_method?: string; timezone?: string } | null;
    const timezone = station?.timezone || "Africa/Cairo";
    const now = new Date();
    const localTimeStr = now.toLocaleString("en-US", { timeZone: timezone });
    const localDate = new Date(localTimeStr);
    const today = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;

    const { data: openRecord, error: openErr } = await supabaseAdmin
      .from("attendance_records")
      .select("id, date, check_in, check_out")
      .eq("employee_id", role.employee_id)
      .not("check_in", "is", null)
      .is("check_out", null)
      .order("check_in", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openErr) return json({ ok: false, error: openErr.message }, 500);

    const { data: todayRecord, error: todayErr } = await supabaseAdmin
      .from("attendance_records")
      .select("id, date, check_in, check_out")
      .eq("employee_id", role.employee_id)
      .eq("date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (todayErr) return json({ ok: false, error: todayErr.message }, 500);

    return json({
      ok: true,
      employee_id: role.employee_id,
      station_id: emp?.station_id ?? null,
      checkin_method: station?.checkin_method || "qr",
      today,
      open_record: openRecord ?? null,
      today_record: todayRecord ?? null,
    });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Attendance state error" }, 500);
  }
});