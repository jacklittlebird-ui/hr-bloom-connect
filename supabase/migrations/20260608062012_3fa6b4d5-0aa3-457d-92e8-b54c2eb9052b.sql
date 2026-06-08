
-- 1) Fix the stuck open record for emp0169 (manually auto-close to 5h per policy)
UPDATE public.attendance_records
SET check_out = check_in + interval '5 hours',
    status = 'auto-closed',
    work_hours = 5,
    work_minutes = 300,
    notes = COALESCE(notes || ' ', '') || '[AUTO_CLOSED] Manually corrected after cron auth failure — work hours set to 5h per policy.'
WHERE id = '43a962f8-0be0-447b-9ac0-9fb6820851a0';

-- Audit log
INSERT INTO public.audit_logs (user_id, action_type, affected_table, record_id, new_data)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'AUTO_CLOSED_MANUAL_FIX',
  'attendance_records',
  '43a962f8-0be0-447b-9ac0-9fb6820851a0',
  jsonb_build_object('reason','cron auth was failing; record older than 18h normalized to 5h policy')
);

-- 2) Reschedule the auto-checkout cron to pass x-cron-secret (read from vault).
--    We store CRON_SECRET in vault and let pg_cron read it at runtime.
SELECT cron.unschedule('auto-checkout-hourly');

SELECT cron.schedule(
  'auto-checkout-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://iygkzkglrkdrmuyeuiht.supabase.co/functions/v1/auto-checkout',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1),
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);
