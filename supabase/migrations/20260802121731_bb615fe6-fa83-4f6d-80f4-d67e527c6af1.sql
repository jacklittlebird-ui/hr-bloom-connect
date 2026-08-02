WITH targets AS (
  SELECT li.id, li.loan_id
  FROM public.loan_installments li
  JOIN public.payroll_entries p
    ON p.employee_id = li.employee_id
   AND p.month = '07' AND p.year = '2026'
   AND COALESCE(p.loan_payment, 0) > 0
  WHERE li.due_date >= '2026-07-01' AND li.due_date < '2026-08-01'
    AND li.status = 'pending'
), upd AS (
  UPDATE public.loan_installments li
  SET status = 'paid', paid_at = now()
  FROM targets t
  WHERE li.id = t.id
  RETURNING li.loan_id
), affected AS (
  SELECT DISTINCT loan_id FROM upd
), sums AS (
  SELECT l.id,
         COUNT(*) FILTER (WHERE li.status = 'paid') AS paid_count,
         COALESCE(SUM(li.amount) FILTER (WHERE li.status = 'paid'), 0) AS paid_amount,
         l.amount AS loan_amount,
         l.installments_count
  FROM public.loans l
  JOIN affected a ON a.loan_id = l.id
  LEFT JOIN public.loan_installments li ON li.loan_id = l.id
  GROUP BY l.id, l.amount, l.installments_count
)
UPDATE public.loans l
SET paid_count = s.paid_count,
    remaining = GREATEST(s.loan_amount - s.paid_amount, 0),
    status = CASE WHEN s.installments_count > 0 AND s.paid_count >= s.installments_count THEN 'completed' ELSE 'active' END
FROM sums s
WHERE l.id = s.id;