import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const email = 'asamir@onehr.com';
  const password = 'Aone#554448sa';
  const fullName = 'A Samir - Evaluations Manager';
  const modules = ['dashboard', 'performance', 'salaries-performance-bonus'];

  // Find or create the auth user
  let userId: string | null = null;
  const norm = email.trim().toLowerCase();
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const found = data.users?.find((u: any) => u.email?.trim().toLowerCase() === norm);
    if (found) { userId = found.id; break; }
    if (!data.users?.length || data.users.length < 200) break;
    page++;
  }

  if (userId) {
    // Reset password so it matches the requested one
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    userId = data.user!.id;
  }

  // Ensure profile row
  await admin.from('profiles').upsert({ id: userId, email, full_name: fullName }, { onConflict: 'id' });

  // Assign role: use 'station_manager' as a non-admin/non-hr base; custom_modules controls UI access.
  // Wipe existing roles for this user, then insert one.
  await admin.from('user_roles').delete().eq('user_id', userId);
  const { error: roleErr } = await admin.from('user_roles').insert({
    user_id: userId,
    role: 'station_manager',
  });
  if (roleErr) {
    return new Response(JSON.stringify({ error: 'role: ' + roleErr.message, userId }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Upsert module permissions
  await admin.from('user_module_permissions').delete().eq('user_id', userId);
  const { error: permErr } = await admin.from('user_module_permissions').insert({
    user_id: userId,
    custom_modules: modules,
  });
  if (permErr) {
    return new Response(JSON.stringify({ error: 'perm: ' + permErr.message, userId }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, userId, email, modules }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
