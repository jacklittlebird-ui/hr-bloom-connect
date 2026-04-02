import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Find all open attendance records (check_in exists, check_out is null)
    // where check_in is more than 18 hours ago
    const cutoff = new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString();

    const { data: openRecords, error: fetchErr } = await admin
      .from("attendance_records")
      .select("id, employee_id, check_in, date")
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
      return new Response(JSON.stringify({ ok: true, closed: 0 }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    console.log(`[auto-checkout] Found ${openRecords.length} stale records to close`);

    let closed = 0;
    let errors = 0;

    for (const record of openRecords) {
      // Set check_out to 5.5 hours after check_in and record 5.5 hours of work
      const checkInTime = new Date(record.check_in);
      const autoCheckout = new Date(checkInTime.getTime() + 5.5 * 60 * 60 * 1000).toISOString();

      const { error: updateErr } = await admin
        .from("attendance_records")
        .update({
          check_out: autoCheckout,
          work_hours: 5,
          work_minutes: 330, // 5.5 hours = 330 minutes
          notes: "انصراف تلقائي / Auto checkout (5.5 work hours recorded)",
        })
        .eq("id", record.id);

      if (updateErr) {
        console.error(`[auto-checkout] Failed to close record ${record.id}:`, updateErr);
        errors++;
      } else {
        closed++;
        console.log(`[auto-checkout] Closed record ${record.id} for employee ${record.employee_id}`);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, closed, errors, total: openRecords.length }),
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
