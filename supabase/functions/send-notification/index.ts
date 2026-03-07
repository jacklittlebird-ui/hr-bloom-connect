import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin or training_manager
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check role
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const userRoles = (roles || []).map((r: any) => r.role);
    if (!userRoles.includes("admin") && !userRoles.includes("training_manager")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      target_type,
      target_employee_ids,
      target_department_ids,
      target_station_ids,
      title_ar,
      title_en,
      desc_ar,
      desc_en,
      type = "info",
      module = "general",
      sender_name,
    } = body;

    if (!title_ar || !title_en || !target_type) {
      return new Response(
        JSON.stringify({ error: "title_ar, title_en, and target_type are required" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Resolve target user IDs based on target_type
    let targetUserIds: string[] = [];

    if (target_type === "employee" && target_employee_ids?.length) {
      // Get user_ids for these employees
      const { data: emps } = await adminClient
        .from("employees")
        .select("user_id")
        .in("id", target_employee_ids)
        .not("user_id", "is", null);
      targetUserIds = (emps || []).map((e: any) => e.user_id);
    } else if (target_type === "department" && target_department_ids?.length) {
      const { data: emps } = await adminClient
        .from("employees")
        .select("user_id")
        .in("department_id", target_department_ids)
        .not("user_id", "is", null);
      targetUserIds = (emps || []).map((e: any) => e.user_id);
    } else if (target_type === "station" && target_station_ids?.length) {
      const { data: emps } = await adminClient
        .from("employees")
        .select("user_id")
        .in("station_id", target_station_ids)
        .not("user_id", "is", null);
      targetUserIds = (emps || []).map((e: any) => e.user_id);
    } else if (target_type === "broadcast") {
      // All employees with user accounts
      const { data: emps } = await adminClient
        .from("employees")
        .select("user_id")
        .not("user_id", "is", null);
      targetUserIds = (emps || []).map((e: any) => e.user_id);
    }

    // De-duplicate
    targetUserIds = [...new Set(targetUserIds)];

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No target users found", count: 0 }),
        { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Get employee_id mapping for each user
    const { data: empMap } = await adminClient
      .from("employees")
      .select("id, user_id")
      .in("user_id", targetUserIds);
    const userToEmployee: Record<string, string> = {};
    (empMap || []).forEach((e: any) => {
      userToEmployee[e.user_id] = e.id;
    });

    // Create notification rows
    const rows = targetUserIds.map((uid) => ({
      user_id: uid,
      employee_id: userToEmployee[uid] || null,
      title_ar,
      title_en,
      desc_ar: desc_ar || null,
      desc_en: desc_en || null,
      type,
      module,
      target_type,
      sender_name: sender_name || null,
      is_read: false,
    }));

    // Insert in batches of 500
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error: insertError } = await adminClient.from("notifications").insert(batch);
      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
        );
      }
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, count: inserted }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e: any) {
    console.error("send-notification error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
