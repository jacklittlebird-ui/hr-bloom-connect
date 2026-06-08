import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Manual close attendance record.
 *
 * - Auth: Admin or HR only (verified via user_roles).
 * - Hard cap: work hours can be 0.25 - 12. Any value > 12 is rejected.
 * - The record must currently be OPEN (check_out IS NULL). Closed records
 *   cannot be re-closed via this endpoint — protects against double counting.
 * - Writes an audit_logs entry with action_type = 'MANUAL_CLOSED' and the
 *   acting user's id so finance/audit can trace who closed what and why.
 */
const MAX_MANUAL_HOURS = 12;
const MIN_MANUAL_HOURS = 0.25;

interface Body { record_id?: string; work_hours?: number; reason?: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await authed.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Role check: admin or hr
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "hr"]);
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: admin or hr role required" }), {
        status: 403, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Parse + validate body
    const body = (await req.json().catch(() => ({}))) as Body;
    const recordId = String(body.record_id ?? "").trim();
    const workHours = Number(body.work_hours);
    const reason = String(body.reason ?? "").trim();

    if (!recordId) {
      return new Response(JSON.stringify({ error: "record_id is required" }), {
        status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    if (!Number.isFinite(workHours) || workHours < MIN_MANUAL_HOURS || workHours > MAX_MANUAL_HOURS) {
      return new Response(JSON.stringify({
        error: `work_hours must be between ${MIN_MANUAL_HOURS} and ${MAX_MANUAL_HOURS}`,
      }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    // Fetch record — must be currently open
    const { data: record, error: fetchErr } = await admin
      .from("attendance_records")
      .select("id, employee_id, check_in, check_out, status, notes, work_hours")
      .eq("id", recordId)
      .maybeSingle();

    if (fetchErr || !record) {
      return new Response(JSON.stringify({ error: "Record not found" }), {
        status: 404, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    if (record.check_out) {
      return new Response(JSON.stringify({
        error: "Record is already closed — cannot re-close to avoid double counting",
        current: { check_out: record.check_out, work_hours: record.work_hours },
      }), { status: 409, headers: { ...corsHeaders, "content-type": "application/json" } });
    }
    if (!record.check_in) {
      return new Response(JSON.stringify({ error: "Record has no check_in" }), {
        status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const checkInMs = new Date(record.check_in as string).getTime();
    const checkOutIso = new Date(checkInMs + workHours * 60 * 60 * 1000).toISOString();
    const workMinutes = Math.round(workHours * 60);

    const noteSuffix = `[MANUAL_CLOSED] Manually closed by user ${userId}. Hours: ${workHours}. Reason: ${reason || "n/a"}.`;
    const newNotes = record.notes && !String(record.notes).includes("[MANUAL_CLOSED]")
      ? `${record.notes} ${noteSuffix}`
      : (record.notes ?? noteSuffix);

    const { error: updateErr } = await admin
      .from("attendance_records")
      .update({
        check_out: checkOutIso,
        status: "manually-closed",
        work_hours: workHours,
        work_minutes: workMinutes,
        notes: newNotes,
      })
      .eq("id", recordId)
      .is("check_out", null);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Audit log entry with the actual user
    await admin.from("audit_logs").insert({
      user_id: userId,
      action_type: "MANUAL_CLOSED",
      affected_table: "attendance_records",
      record_id: recordId,
      old_data: { check_in: record.check_in, status: record.status },
      new_data: {
        employee_id: record.employee_id,
        check_in: record.check_in,
        check_out: checkOutIso,
        work_hours: workHours,
        reason,
        closed_by: userId,
      },
    });

    return new Response(JSON.stringify({
      ok: true,
      record_id: recordId,
      check_out: checkOutIso,
      work_hours: workHours,
    }), { headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e: any) {
    console.error("[manual-close-attendance] error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
