// Auto-creates notifications when vehicles exceed their per-vehicle maintenance interval
// (km since last maintenance OR months since last maintenance).
// Idempotent within a 24h window per vehicle via module='vehicles' check.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch vehicles with their thresholds
    const { data: vehicles, error: vErr } = await supabase
      .from('vehicles')
      .select('id, vehicle_code, brand, model, plate_number, station_id, current_odometer, maintenance_km_interval, maintenance_month_interval');
    if (vErr) throw vErr;

    // Fetch last maintenance per vehicle (latest)
    const { data: maint, error: mErr } = await supabase
      .from('vehicle_maintenance')
      .select('vehicle_id, maintenance_date, odometer_reading, next_maintenance_date, next_maintenance_odometer')
      .order('maintenance_date', { ascending: false });
    if (mErr) throw mErr;

    const lastByVehicle = new Map<string, any>();
    for (const row of (maint as any[]) || []) {
      if (!lastByVehicle.has(row.vehicle_id)) lastByVehicle.set(row.vehicle_id, row);
    }

    // Admins/HR users to notify (system-wide alerts)
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id, role, station_id')
      .in('role', ['admin', 'hr', 'station_vehicle_manager', 'station_manager']);

    const now = Date.now();
    const cutoff24h = new Date(now - 24 * 3600 * 1000).toISOString();

    const inserts: any[] = [];
    let alertsCreated = 0;

    for (const v of (vehicles as any[]) || []) {
      const last = lastByVehicle.get(v.id);
      const reasons: string[] = [];
      const reasonsEn: string[] = [];

      // KM-based
      const kmInterval = Number(v.maintenance_km_interval) || 0;
      const currentKm = Number(v.current_odometer) || 0;
      const lastKm = Number(last?.odometer_reading) || 0;
      if (kmInterval > 0 && lastKm > 0 && currentKm - lastKm >= kmInterval) {
        reasons.push(`تجاوز ${kmInterval} كم منذ آخر صيانة`);
        reasonsEn.push(`Exceeded ${kmInterval} km since last service`);
      }

      // Month-based
      const monthInterval = Number(v.maintenance_month_interval) || 0;
      if (monthInterval > 0 && last?.maintenance_date) {
        const lastDate = new Date(last.maintenance_date).getTime();
        const months = (now - lastDate) / (30 * 86400000);
        if (months >= monthInterval) {
          reasons.push(`مرور ${monthInterval} شهر منذ آخر صيانة`);
          reasonsEn.push(`${monthInterval} months since last service`);
        }
      }

      // Explicit next due
      if (last?.next_maintenance_date && new Date(last.next_maintenance_date).getTime() <= now) {
        reasons.push('تاريخ الصيانة القادمة قد حان');
        reasonsEn.push('Next maintenance date reached');
      }
      if (last?.next_maintenance_odometer && currentKm >= Number(last.next_maintenance_odometer)) {
        reasons.push('وصول العداد للصيانة القادمة');
        reasonsEn.push('Odometer reached next service km');
      }

      if (reasons.length === 0) continue;

      // Idempotency: skip if a similar alert was created within last 24h
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('module', 'vehicles')
        .ilike('title_ar', `%${v.vehicle_code}%`)
        .gte('created_at', cutoff24h)
        .limit(1);
      if (existing && existing.length > 0) continue;

      // Target users: admins + station's vehicle manager + station manager of that station
      const targets = (adminRoles as any[] || []).filter((r) =>
        r.role === 'admin' || r.role === 'hr' ||
        ((r.role === 'station_vehicle_manager' || r.role === 'station_manager') && r.station_id === v.station_id)
      );

      const titleAr = `صيانة مستحقة - ${v.vehicle_code} (${v.brand} ${v.model})`;
      const titleEn = `Maintenance due - ${v.vehicle_code} (${v.brand} ${v.model})`;
      const descAr = `${v.plate_number}: ${reasons.join(' / ')}`;
      const descEn = `${v.plate_number}: ${reasonsEn.join(' / ')}`;

      const uniqueUsers = new Set<string>(targets.map((t) => t.user_id).filter(Boolean));
      for (const userId of uniqueUsers) {
        inserts.push({
          user_id: userId,
          title_ar: titleAr, title_en: titleEn,
          desc_ar: descAr, desc_en: descEn,
          type: 'warning', module: 'vehicles', target_type: 'admin',
        });
      }
      alertsCreated++;
    }

    if (inserts.length > 0) {
      // Batch in chunks of 500
      for (let i = 0; i < inserts.length; i += 500) {
        const chunk = inserts.slice(i, i + 500);
        const { error } = await supabase.from('notifications').insert(chunk);
        if (error) console.error('Insert notifications error:', error);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, vehicles_checked: vehicles?.length || 0, alerts_created: alertsCreated, notifications_inserted: inserts.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('vehicle-maintenance-alerts error:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
