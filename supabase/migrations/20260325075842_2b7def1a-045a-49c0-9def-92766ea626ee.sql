-- Add HR access to user_devices
CREATE POLICY "hr_manage_devices" ON public.user_devices FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

-- Add HR access to device_alerts
CREATE POLICY "hr_device_alerts_all" ON public.device_alerts FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));
