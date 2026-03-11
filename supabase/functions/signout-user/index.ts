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

  const { user_id } = await req.json();
  if (!user_id) return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: corsHeaders });

  // Invalidate all refresh tokens by calling the GoTrue admin API directly
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user_id}/factors`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${serviceKey}`, "apikey": serviceKey },
  });

  // Force sign out by changing the user's password temporarily and back, or use logout endpoint
  const logoutRes = await fetch(`${supabaseUrl}/auth/v1/logout?scope=global`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "apikey": serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id }),
  });

  // Alternative: just revoke by updating user ban_duration briefly
  // Most reliable: generate a new password hash to invalidate sessions
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
    // Setting ban_duration to force logout, then immediately unban
    ban_duration: "1s",
  });
  
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });

  // Immediately unban
  await supabaseAdmin.auth.admin.updateUserById(user_id, {
    ban_duration: "none",
  });

  return new Response(JSON.stringify({ success: true, message: "User signed out from all devices" }), { 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
});
