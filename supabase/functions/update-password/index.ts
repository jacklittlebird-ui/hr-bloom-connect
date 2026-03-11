import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { user_id, email, password } = await req.json();

  let targetId = user_id;

  if (!targetId && email) {
    // Search across pages
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      const found = users.find(u => u.email === email);
      if (found) { targetId = found.id; break; }
      if (users.length < perPage) break;
      page++;
    }
  }

  if (!targetId) return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: corsHeaders });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(targetId, { password });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });

  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
