COMMENT ON COLUMN public.user_devices.expires_at IS 'DEPRECATED: devices stay valid until replaced by a newly approved device';
UPDATE public.user_devices SET is_active=false, approved_status='revoked' WHERE (device_type='desktop' OR os IN ('windows','macos','linux')) AND is_active;
UPDATE public.user_devices SET expires_at=NULL WHERE expires_at IS NOT NULL;
UPDATE public.user_devices SET is_active=true, approved_status='approved' WHERE user_id='574c3580-592e-45e1-b116-eb7ef43a16dd' AND device_id='96d90910f7a31d8a6121c835f9b1c518';
UPDATE public.attendance_tamper_incidents SET review_status='resolved', review_notes='جهاز الموظف المعتمد - انتهاء صلاحية خاطئ', reviewed_at=now() WHERE user_id='574c3580-592e-45e1-b116-eb7ef43a16dd' AND category='new_device' AND review_status='new';