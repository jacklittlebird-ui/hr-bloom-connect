ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS drive_file_id text, ADD COLUMN IF NOT EXISTS mime_type text, ADD COLUMN IF NOT EXISTS size_bytes integer;
CREATE UNIQUE INDEX IF NOT EXISTS employee_documents_emp_type_uniq ON public.employee_documents(employee_id, type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_documents TO authenticated;
GRANT ALL ON public.employee_documents TO service_role;