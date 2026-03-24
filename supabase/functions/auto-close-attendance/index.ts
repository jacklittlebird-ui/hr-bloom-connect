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
    // where check_in is older than 18 hours
    const cutoff = new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString();

    const { data: openRecords, error: fetchError } = await admin
      .from("attendance_records")
      .select("id, employee_id, check_in, date")
      .is("check_out", null)
      .not("check_in", "is", null)
      .lt("check_in", cutoff);

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    if (!openRecords || openRecords.length === 0) {
      return new Response(JSON.stringify({ ok: true, closed: 0 }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Close each record: set status to auto-closed, leave check_out as null
    // This way the record is marked as closed but without a checkout time
    const ids = openRecords.map((r: any) => r.id);

    const { error: updateError } = await admin
      .from("attendance_records")
      .update({
        status: "auto-closed",
        notes: "إغلاق تلقائي بعد 18 ساعة / Auto-closed after 18 hours",
      })
      .in("id", ids);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, closed: ids.length }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
