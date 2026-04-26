import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Auto-checkout policy:
 *
 *  - Run hourly via pg_cron.
 *  - Close any attendance record whose check_in is older than EXACTLY 18 hours
 *    and which has no check_out yet.
 *  - check_out is set to check_in + 18h (not "now"), so the record reflects
 *    the policy boundary, not the time the cron happened to run.
 *  - status is set to 'auto-closed', notes are appended, and an audit log
 *    entry is inserted into audit_logs (action_type = 'AUTO_CLOSED').
 *  - The unique partial index `idx_attendance_one_open_per_employee` guarantees
 *    only ONE open record per employee at any moment.
 */
const AUTO_CLOSE_AFTER_HOURS = 18;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Cutoff: any check_in strictly earlier than (now - 18h) is eligible.
    const cutoffMs = Date.now() - AUTO_CLOSE_AFTER_HOURS * 60 * 60 * 1000;
    const cutoff = new Date(cutoffMs).toISOString();

    const { data: openRecords, error: fetchErr } = await admin
      .from("attendance_records")
      .select("id, employee_id, check_in, date, notes, status")
      .is("check_out", null)
      .not("check_in", "is", null)
      .lt("check_in", cutoff)
      .limit(500);

    if (fetchErr) {
      console.error("[auto-checkout] fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    if (!openRecords || openRecords.length === 0) {
      console.log("[auto-checkout] No records older than 18h to close");
      return new Response(JSON.stringify({ ok: true, closed: 0 }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    console.log(`[auto-checkout] Found ${openRecords.length} record(s) to AUTO-CLOSE at 18h`);

    let closed = 0;
    let errors = 0;

    for (const record of openRecords) {
      const checkInMs = new Date(record.check_in).getTime();
      // SAFETY: never close a record that is not actually >= 18h old.
      if (Date.now() - checkInMs < AUTO_CLOSE_AFTER_HOURS * 60 * 60 * 1000) {
        console.log(`[auto-checkout] SKIP record ${record.id} - not yet 18h old`);
        continue;
      }

      const autoCheckoutIso = new Date(checkInMs + AUTO_CLOSE_AFTER_HOURS * 60 * 60 * 1000).toISOString();
      const noteSuffix = `[AUTO_CLOSED] Automatically closed after ${AUTO_CLOSE_AFTER_HOURS} hours because employee did not check out`;
      const newNotes = record.notes && !record.notes.includes("[AUTO_CLOSED]")
        ? `${record.notes} ${noteSuffix}`
        : (record.notes ?? noteSuffix);

      const { error: updateErr } = await admin
        .from("attendance_records")
        .update({
          check_out: autoCheckoutIso,
          status: "auto-closed",
          notes: newNotes,
        })
        .eq("id", record.id)
        .is("check_out", null); // Only close if still open (guards against race)

      if (updateErr) {
        console.error(`[auto-checkout] Failed to close record ${record.id}:`, updateErr);
        errors++;
        continue;
      }

      // Audit log (non-blocking — log errors but keep going)
      const { error: auditErr } = await admin.from("audit_logs").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        action_type: "AUTO_CLOSED",
        affected_table: "attendance_records",
        record_id: record.id,
        new_data: {
          employee_id: record.employee_id,
          check_in: record.check_in,
          check_out: autoCheckoutIso,
          reason: `Automatically closed after ${AUTO_CLOSE_AFTER_HOURS} hours because employee did not check out`,
          policy_hours: AUTO_CLOSE_AFTER_HOURS,
        },
      });

      if (auditErr) {
        console.error(`[auto-checkout] audit log insert failed for ${record.id}:`, auditErr);
      }

      closed++;
      console.log(`[auto-checkout] CLOSED record ${record.id} for employee ${record.employee_id} at ${autoCheckoutIso}`);
    }

    return new Response(
      JSON.stringify({ ok: true, closed, errors, total: openRecords.length }),
      { headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[auto-checkout] error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
