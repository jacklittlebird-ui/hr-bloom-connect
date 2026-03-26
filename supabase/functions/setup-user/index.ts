import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function findAuthUserByEmail(supabaseAdmin: ReturnType<typeof createClient>, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data.users ?? [];
    const existingUser = users.find((user) => user.email?.trim().toLowerCase() === normalizedEmail);
    if (existingUser) return existingUser;
    if (users.length < perPage) return null;

    page += 1;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { email, password, full_name, role, station_code, employee_code, station_codes } = await req.json();

    // Input validation
    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['admin', 'station_manager', 'employee', 'kiosk', 'training_manager', 'hr', 'area_manager'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if ANY admin exists — if yes, require auth
    const { count: adminCount } = await supabaseAdmin
      .from('user_roles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (adminCount && adminCount > 0) {
      // Admins exist — caller must be authenticated admin
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const anonClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: userData, error: userError } = await anonClient.auth.getUser();
      if (userError || !userData?.user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check caller is admin
      const { data: callerRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.user.id)
        .eq('role', 'admin');

      if (!callerRoles || callerRoles.length === 0) {
        return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    // else: no admins exist, allow first admin creation without auth

    const existingAuthUser = await findAuthUserByEmail(supabaseAdmin, email);
    let userId = existingAuthUser?.id;
    let createdNewUser = false;

    if (!userId) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      userId = authData.user.id;
      createdNewUser = true;
    }

    // Ensure profile exists (trigger may not fire for admin-created users)
    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email,
      full_name,
    }, { onConflict: 'id' });

    // Resolve station/employee references
    let stationId: string | null = null;
    let employeeId: string | null = null;

    if (role === 'station_manager' && station_code) {
      const { data: station } = await supabaseAdmin
        .from('stations')
        .select('id')
        .eq('code', station_code)
        .single();
      stationId = station?.id || null;
    }

    // Handle area_manager with multiple stations
    if (role === 'area_manager' && station_codes && Array.isArray(station_codes)) {
      const stationInserts = [];
      for (const code of station_codes) {
        const { data: station } = await supabaseAdmin
          .from('stations')
          .select('id')
          .eq('code', code)
          .single();
        if (station?.id) {
          stationInserts.push({ user_id: userId, station_id: station.id });
        }
      }
      if (stationInserts.length > 0) {
        await supabaseAdmin.from('area_manager_stations').insert(stationInserts);
      }
    }

    if (role === 'employee' && employee_code) {
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('employee_code', employee_code)
        .single();
      employeeId = emp?.id || null;

      if (employeeId) {
        await supabaseAdmin
          .from('employees')
          .update({ user_id: userId })
          .eq('id', employeeId);
      }
    }

    // Insert role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role,
        station_id: stationId,
        employee_id: employeeId,
      }, { onConflict: 'user_id,role' });

    if (roleError) {
      // Rollback: delete the auth user if role insert fails
      if (createdNewUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
