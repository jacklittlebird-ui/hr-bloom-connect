import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Auto-checkout policy (revised):
 *
 * We DO NOT auto-close attendance records anymore for the following reasons:
 *  1. Closing with `check_in + 8h` invented work hours that never happened.
 *  2. Closing with `check_out = check_in` zeroed out legitimate work.
 *  3. Either way, the open record disappeared, and on the next day the
 *     employee was prompted to check in again — losing the previous day's
 *     entry from their portal view.
 *
 * Instead, this function only flags VERY OLD open records (>48h since
 * check-in) so admins can review and close them manually. Same-day or
 * recent records are NEVER touched.
 *
 * The flag is non-destructive:
 *  - check_out STAYS NULL (so the employee still sees their open record)
 *  - notes get appended with `[NEEDS_REVIEW]` so admins can filter them
 */
const STALE_THRESHOLD_HOURS = 48;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const cutoff = new Date(Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString();

    const { data: openRecords, error: fetchErr } = await admin
      .from("attendance_records")
      .select("id, employee_id, check_in, date, notes")
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
      console.log("[auto-checkout] No stale records found");
      return new Response(JSON.stringify({ ok: true, flagged: 0, closed: 0 }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    console.log(`[auto-checkout] Found ${openRecords.length} stale records to FLAG (no auto-close)`);

    let flagged = 0;
    let errors = 0;

    for (const record of openRecords) {
      // Skip records that are already flagged
      if (typeof record.notes === "string" && record.notes.includes("[NEEDS_REVIEW]")) {
        continue;
      }

      const newNotes = `${record.notes ?? ""} [NEEDS_REVIEW] لم يسجل الموظف انصرافاً منذ أكثر من ${STALE_THRESHOLD_HOURS} ساعة - يحتاج مراجعة من الإدارة / Employee did not check out for over ${STALE_THRESHOLD_HOURS}h - admin review needed`.trim();

      const { error: updateErr } = await admin
        .from("attendance_records")
        .update({ notes: newNotes })
        .eq("id", record.id);

      if (updateErr) {
        console.error(`[auto-checkout] Failed to flag record ${record.id}:`, updateErr);
        errors++;
      } else {
        flagged++;
        console.log(`[auto-checkout] Flagged record ${record.id} for employee ${record.employee_id}`);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, flagged, errors, total: openRecords.length, closed: 0 }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[auto-checkout] error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});

