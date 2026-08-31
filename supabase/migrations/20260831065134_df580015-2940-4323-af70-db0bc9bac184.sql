DO $$
DECLARE r record; q text; w text; sql text; roles_txt text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies WHERE schemaname='public'
  LOOP
    q := r.qual; w := r.with_check;
    IF q IS NOT NULL THEN
      q := regexp_replace(q, '\(\s*SELECT ([a-z_]+\(auth\.uid\(\)[^()]*\))( AS [a-z_]+)?\)', '\1', 'g');
      q := regexp_replace(q, '([a-z_]+\(auth\.uid\(\)[^()]*\))', '(SELECT \1)', 'g');
    END IF;
    IF w IS NOT NULL THEN
      w := regexp_replace(w, '\(\s*SELECT ([a-z_]+\(auth\.uid\(\)[^()]*\))( AS [a-z_]+)?\)', '\1', 'g');
      w := regexp_replace(w, '([a-z_]+\(auth\.uid\(\)[^()]*\))', '(SELECT \1)', 'g');
    END IF;
    CONTINUE WHEN q IS NOT DISTINCT FROM r.qual AND w IS NOT DISTINCT FROM r.with_check;

    SELECT string_agg(quote_ident(x), ', ') INTO roles_txt FROM unnest(r.roles) x;

    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    sql := format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s',
      r.policyname, r.tablename,
      CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      r.cmd, roles_txt);
    IF q IS NOT NULL THEN sql := sql || ' USING (' || q || ')'; END IF;
    IF w IS NOT NULL THEN sql := sql || ' WITH CHECK (' || w || ')'; END IF;
    EXECUTE sql;
  END LOOP;
END $$;