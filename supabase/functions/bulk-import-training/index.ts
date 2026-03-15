import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { lines } = await req.json() as { lines: string[] };

    if (!lines?.length) {
      return new Response(JSON.stringify({ error: "No lines" }), { status: 400, headers: corsHeaders });
    }

    // Parse lines - format: |emp_code|course_name|provider|location|start_date|end_date|planned_date|result|cert|cr|ss|cb|
    const records: any[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('|ID|') || trimmed.startsWith('|-')) continue;
      
      const parts = trimmed.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
      if (parts.length < 12) continue;
      
      const [empCode, courseName, provider, location, startDate, endDate, plannedDate, result, cert, cr, ss, cb] = parts.map(s => s.trim());
      
      if (!empCode || empCode === 'ID') continue;
      
      records.push({
        emp_code: empCode,
        course_name: courseName,
        provider,
        location,
        start_date: startDate,
        end_date: endDate,
        planned_date: plannedDate,
        result,
        cert: cert === 'TRUE',
        cr: cr === 'TRUE',
        ss: ss === 'TRUE',
        cb: cb === 'TRUE',
      });
    }

    // 1. Get all unique employee codes and resolve to UUIDs
    const empCodes = [...new Set(records.map(r => r.emp_code))];
    const empMap = new Map<string, string>();
    
    // The DB stores codes like "Emp0019" but file has "emp0019" - try multiple formats
    const codesToSearch: string[] = [];
    for (const code of empCodes) {
      codesToSearch.push(code);
      // Also try: Emp0019, EMP0019, emp0019
      const num = code.replace(/^emp/i, '');
      codesToSearch.push(`Emp${num}`, `emp${num}`, `EMP${num}`);
    }
    const uniqueCodes = [...new Set(codesToSearch)];
    
    for (let i = 0; i < uniqueCodes.length; i += 100) {
      const batch = uniqueCodes.slice(i, i + 100);
      const { data } = await supabase
        .from("employees")
        .select("id, employee_code")
        .in("employee_code", batch);
      if (data) {
        for (const e of data) {
          empMap.set(e.employee_code.toLowerCase(), e.id);
        }
      }
    }

    // 2. Get all courses and resolve names to IDs (case-insensitive)
    const { data: courses } = await supabase
      .from("training_courses")
      .select("id, name_en");
    
    const courseMap = new Map<string, string>();
    if (courses) {
      for (const c of courses) {
        courseMap.set(c.name_en.toLowerCase().trim(), c.id);
      }
    }

    // 3. Parse dates - M/D/YY or M/D/YYYY format
    function parseDate(d: string): string | null {
      if (!d || d.trim() === '') return null;
      const parts = d.trim().split('/');
      if (parts.length !== 3) return null;
      let [m, day, y] = parts.map(Number);
      if (isNaN(m) || isNaN(day) || isNaN(y)) return null;
      if (y < 100) {
        y = y >= 50 ? 1900 + y : 2000 + y;
      }
      const mm = String(m).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }

    // 4. Map result to status
    function mapStatus(result: string): string {
      const r = (result || '').toLowerCase().replace(/<br\/?>/g, '').trim();
      if (r.includes('passed') || r.includes('paased')) return 'completed';
      if (r.includes('attendance') || r.includes('good participation')) return 'completed';
      if (r.includes('failed')) return 'failed';
      return 'enrolled';
    }

    // 5. Build insert rows
    const rows: any[] = [];
    let skipped = 0;
    const missingEmps = new Set<string>();

    for (const rec of records) {
      const normalizedCode = rec.emp_code.toLowerCase();
      const empId = empMap.get(normalizedCode);
      
      if (!empId) {
        skipped++;
        missingEmps.add(rec.emp_code);
        continue;
      }

      const courseId = courseMap.get(rec.course_name.toLowerCase().trim()) || null;

      rows.push({
        employee_id: empId,
        course_id: courseId,
        start_date: parseDate(rec.start_date),
        end_date: parseDate(rec.end_date),
        planned_date: parseDate(rec.planned_date),
        status: mapStatus(rec.result),
        provider: rec.provider || null,
        location: rec.location || null,
        has_cert: rec.cert,
        has_cr: rec.cr,
        has_ss: rec.ss,
        has_cb: rec.cb,
        cost: 0,
        total_cost: 0,
      });
    }

    // 6. Batch insert
    let inserted = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      const { error } = await supabase.from("training_records").insert(batch);
      if (error) {
        console.error(`Batch ${i}-${i + batch.length} error:`, error.message);
        errorDetails.push(`Batch ${i}: ${error.message}`);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ 
        total_lines: lines.length,
        parsed_records: records.length,
        inserted, 
        skipped, 
        errors,
        employees_found: empMap.size,
        courses_found: courseMap.size,
        missing_employees: [...missingEmps].slice(0, 20),
        error_details: errorDetails.slice(0, 5),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
