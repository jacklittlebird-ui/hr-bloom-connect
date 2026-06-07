import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

const ACCOUNTS = [
  { email: 'atzstn@hr.com', password: 'Atz#115544sd', station_code: 'asyut', name: 'مدير محطة أسيوط' },
  { email: 'hmbstn@hr.com', password: 'Hmb#225544ds', station_code: 'sohag', name: 'مدير محطة سوهاج' },
  { email: 'aswstn@hr.com', password: 'Asw#665544es', station_code: 'aswan', name: 'مدير محطة أسوان' },
  { email: 'lxrstn@hr.com', password: 'Lxr#554488sd', station_code: 'luxor', name: 'مدير محطة الأقصر' },
  { email: 'rmfstn@hr.com', password: 'Rmf#998844sd', station_code: 'marsa', name: 'مدير محطة مرسى علم' },
];

async function findUser(admin: any, email: string) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = (data.users ?? []).find((x: any) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u;
    if ((data.users ?? []).length < 200) return null;
    page++;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Require authenticated admin caller
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user: caller }, error: callerErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: callerRoles } = await admin.from('user_roles').select('role').eq('user_id', caller.id).eq('role', 'admin');
    if (!callerRoles || callerRoles.length === 0) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results: any[] = [];

    for (const acc of ACCOUNTS) {
      try {
        const { data: station } = await admin.from('stations').select('id').eq('code', acc.station_code).single();
        if (!station) { results.push({ email: acc.email, status: 'error', error: 'station not found' }); continue; }

        let user = await findUser(admin, acc.email);
        let created = false;
        if (!user) {
          const { data, error } = await admin.auth.admin.createUser({
            email: acc.email, password: acc.password, email_confirm: true,
            user_metadata: { full_name: acc.name },
          });
          if (error) { results.push({ email: acc.email, status: 'error', error: error.message }); continue; }
          user = data.user; created = true;
        } else {
          await admin.auth.admin.updateUserById(user.id, { password: acc.password });
        }

        await admin.from('profiles').upsert({ id: user.id, email: acc.email, full_name: acc.name }, { onConflict: 'id' });
        const { error: rErr } = await admin.from('user_roles').upsert({
          user_id: user.id, role: 'station_manager', station_id: station.id,
        }, { onConflict: 'user_id,role' });
        if (rErr) { results.push({ email: acc.email, status: 'error', error: rErr.message }); continue; }

        results.push({ email: acc.email, status: created ? 'created' : 'updated' });
      } catch (e: any) {
        results.push({ email: acc.email, status: 'error', error: e.message });
      }
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
