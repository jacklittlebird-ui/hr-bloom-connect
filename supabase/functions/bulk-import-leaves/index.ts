import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Parse M/D/YY date to YYYY-MM-DD
function parseDate(d: string): string | null {
  if (!d || !d.trim()) return null;
  const parts = d.trim().split('/');
  if (parts.length < 3) return null;
  const month = parseInt(parts[0]);
  const day = parseInt(parts[1]);
  const year = 2000 + parseInt(parts[2]);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Each line: "empCode,fromDate,toDate,casual,annual,sick,overtime,permission,unpaid"
  const { lines, importReason } = await req.json() as { lines: string[]; importReason?: string };

  // Collect unique employee codes
  const codes = [...new Set(lines.map(l => l.split(',')[0]))];

  // Resolve employee codes → UUIDs (batch query, handle >1000)
  const codeMap = new Map<string, string>();
  for (let i = 0; i < codes.length; i += 500) {
    const batch = codes.slice(i, i + 500);
    const { data } = await supabase
      .from('employees')
      .select('id, employee_code')
      .in('employee_code', batch);
    data?.forEach(e => codeMap.set(e.employee_code, e.id));
  }

  const errors: string[] = [];
  const leaveInserts: any[] = [];
  const permissionInserts: any[] = [];
  const overtimeInserts: any[] = [];

  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 9) continue;

    const code = parts[0].trim();
    const fromDate = parseDate(parts[1]);
    const toDate = parseDate(parts[2]) || fromDate;
    const annual = parseFloat(parts[3]) || 0;
    const casual = parseFloat(parts[4]) || 0;
    const sick = parseFloat(parts[5]) || 0;
    const overtime = parseFloat(parts[6]) || 0;
    const permission = parseFloat(parts[7]) || 0;
    const unpaid = parseFloat(parts[8]) || 0;

    if (!fromDate) continue;

    const empId = codeMap.get(code);
    if (!empId) {
      errors.push(`Not found: ${code}`);
      continue;
    }

    // Skip rows with all zeros
    if (casual === 0 && annual === 0 && sick === 0 && overtime === 0 && permission === 0 && unpaid === 0) continue;

    const reason = importReason || 'استيراد جماعي';

    // Casual leave (column 4)
    if (casual > 0) {
      leaveInserts.push({
        employee_id: empId,
        leave_type: 'casual',
        start_date: fromDate,
        end_date: toDate,
        days: casual,
        status: 'approved',
        reason,
      });
    }

    // Annual leave (column 5)
    if (annual > 0) {
      leaveInserts.push({
        employee_id: empId,
        leave_type: 'annual',
        start_date: fromDate,
        end_date: toDate,
        days: annual,
        status: 'approved',
        reason,
      });
    }

    // Sick leave
    if (sick > 0) {
      leaveInserts.push({
        employee_id: empId,
        leave_type: 'sick',
        start_date: fromDate,
        end_date: toDate,
        days: sick,
        status: 'approved',
        reason,
      });
    }

    // Unpaid leave
    if (unpaid > 0) {
      leaveInserts.push({
        employee_id: empId,
        leave_type: 'unpaid',
        start_date: fromDate,
        end_date: toDate,
        days: unpaid,
        status: 'approved',
        reason,
      });
    }

    // Permission requests (hours)
    if (permission > 0) {
      const hours = Math.round(permission);
      const endHour = Math.min(9 + hours, 17);
      permissionInserts.push({
        employee_id: empId,
        permission_type: 'personal',
        date: fromDate,
        start_time: '09:00',
        end_time: `${String(endHour).padStart(2, '0')}:00`,
        hours: hours,
        status: 'approved',
        reason,
      });
    }

    // Overtime (each unit = 1 separate request for trigger compatibility)
    if (overtime > 0) {
      for (let i = 0; i < Math.round(overtime); i++) {
        const d = new Date(fromDate + 'T00:00:00');
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        overtimeInserts.push({
          employee_id: empId,
          date: dateStr,
          hours: 8,
          overtime_type: 'regular',
          status: 'approved',
          reason,
        });
      }
    }
  }

  // Insert in batches of 200
  let leaveCount = 0, permCount = 0, otCount = 0;

  for (let i = 0; i < leaveInserts.length; i += 200) {
    const batch = leaveInserts.slice(i, i + 200);
    const { error } = await supabase.from('leave_requests').upsert(batch, { onConflict: 'employee_id,leave_type,start_date,end_date', ignoreDuplicates: true });
    if (error) errors.push(`Leave batch ${i}: ${error.message}`);
    else leaveCount += batch.length;
  }

  for (let i = 0; i < permissionInserts.length; i += 200) {
    const batch = permissionInserts.slice(i, i + 200);
    const { error } = await supabase.from('permission_requests').upsert(batch, { onConflict: 'employee_id,date,start_time,end_time', ignoreDuplicates: true });
    if (error) errors.push(`Permission batch ${i}: ${error.message}`);
    else permCount += batch.length;
  }

  for (let i = 0; i < overtimeInserts.length; i += 200) {
    const batch = overtimeInserts.slice(i, i + 200);
    const { error } = await supabase.from('overtime_requests').upsert(batch, { onConflict: 'employee_id,date,overtime_type', ignoreDuplicates: true });
    if (error) errors.push(`Overtime batch ${i}: ${error.message}`);
    else otCount += batch.length;
  }

  return new Response(JSON.stringify({
    success: errors.length === 0,
    leaves: leaveCount,
    permissions: permCount,
    overtime: otCount,
    notFound: [...new Set(errors.filter(e => e.startsWith('Not found')))],
    insertErrors: errors.filter(e => !e.startsWith('Not found')),
    totalRows: lines.length,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
