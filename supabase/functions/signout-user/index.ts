import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Require authenticated admin caller
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(token);
  if (callerErr || !caller) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const { data: callerRoles } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin");
  if (!callerRoles || callerRoles.length === 0) {
    return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { user_id } = await req.json();
  if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });
  if (user_id === caller.id) {
    return new Response(JSON.stringify({ error: "Cannot sign yourself out via this endpoint" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Force sign out by briefly banning and unbanning
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
    ban_duration: "1s",
  });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });

  await supabaseAdmin.auth.admin.updateUserById(user_id, {
    ban_duration: "none",
  });

  return new Response(JSON.stringify({ success: true, message: "User signed out from all devices" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
