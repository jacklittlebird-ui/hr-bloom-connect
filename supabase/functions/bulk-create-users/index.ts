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

    // Verify caller is admin
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

    // Parse request: array of { employee_code, password }
    const { users, domain } = await req.json();
    
    if (!Array.isArray(users) || users.length === 0) {
      return new Response(JSON.stringify({ error: 'users array required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: { employee_code: string; status: string; error?: string }[] = [];

    for (const { employee_code, password } of users) {
      try {
        if (!employee_code || !password) {
          results.push({ employee_code, status: 'skipped', error: 'Missing code or password' });
          continue;
        }

        const email = `${employee_code}@${domain || 'linkagency.com'}`;

        // Find employee by code
        const { data: emp } = await supabaseAdmin
          .from('employees')
          .select('id, name_ar, name_en')
          .eq('employee_code', employee_code)
          .single();

        if (!emp) {
          results.push({ employee_code, status: 'skipped', error: 'Employee not found in DB' });
          continue;
        }

        // Check if user already exists for this employee
        const { data: existingRole } = await supabaseAdmin
          .from('user_roles')
          .select('id, user_id')
          .eq('employee_id', emp.id)
          .eq('role', 'employee');

        const existingAuthUser = await findAuthUserByEmail(supabaseAdmin, email);

        if (existingRole && existingRole.length > 0 && !existingAuthUser) {
          results.push({ employee_code, status: 'skipped', error: 'Account already exists' });
          continue;
        }

        let userId = existingAuthUser?.id;
        let createdNewUser = false;

        if (existingRole && existingRole.length > 0 && existingAuthUser && existingRole[0].user_id !== existingAuthUser.id) {
          results.push({ employee_code, status: 'error', error: 'Employee role is linked to another account' });
          continue;
        }

        if (!userId) {
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: emp.name_ar || emp.name_en },
          });

          if (authError) {
            results.push({ employee_code, status: 'error', error: authError.message });
            continue;
          }

          userId = authData.user.id;
          createdNewUser = true;
        }

        // Ensure profile
        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          email,
          full_name: emp.name_ar || emp.name_en,
        }, { onConflict: 'id' });

        // Link employee to user
        await supabaseAdmin
          .from('employees')
          .update({ user_id: userId })
          .eq('id', emp.id);

        // Insert role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: 'employee',
            employee_id: emp.id,
          }, { onConflict: 'user_id,role' });

        if (roleError) {
          if (createdNewUser) {
            await supabaseAdmin.auth.admin.deleteUser(userId);
          }
          results.push({ employee_code, status: 'error', error: roleError.message });
          continue;
        }

        results.push({ employee_code, status: createdNewUser ? 'created' : 'repaired' });
      } catch (e) {
        results.push({ employee_code, status: 'error', error: e.message });
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;

    return new Response(JSON.stringify({ 
      summary: { total: users.length, created, skipped, errors },
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
