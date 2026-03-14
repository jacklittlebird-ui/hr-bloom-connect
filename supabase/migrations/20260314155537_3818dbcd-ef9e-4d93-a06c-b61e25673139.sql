DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'salary_records'
      AND policyname = 'hr_salary_records'
  ) THEN
    CREATE POLICY "hr_salary_records"
    ON public.salary_records
    FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'hr'::app_role))
    WITH CHECK (has_role(auth.uid(), 'hr'::app_role));
  END IF;
END $$;