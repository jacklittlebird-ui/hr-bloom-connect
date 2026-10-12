ALTER TABLE public.quality_records DROP CONSTRAINT quality_records_record_type_check;
ALTER TABLE public.quality_records ADD CONSTRAINT quality_records_record_type_check CHECK (record_type IN ('deduction','gratitude','warning'));
ALTER TABLE public.quality_records ADD COLUMN IF NOT EXISTS warning_level smallint CHECK (warning_level IN (1,2));