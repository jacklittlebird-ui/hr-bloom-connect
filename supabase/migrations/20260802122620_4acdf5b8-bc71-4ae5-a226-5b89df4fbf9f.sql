WITH agg AS (
  SELECT l.id,
         COUNT(*) FILTER (WHERE li.status = 'paid') AS paid_cnt,
         COALESCE(SUM(li.amount) FILTER (WHERE li.status = 'paid'), 0) AS paid_amt
  FROM public.loans l
  LEFT JOIN public.loan_installments li ON li.loan_id = l.id
  GROUP BY l.id
)
UPDATE public.loans l
SET paid_count = agg.paid_cnt,
    remaining = GREATEST(ROUND(l.amount - agg.paid_amt, 2), 0),
    status = CASE
      WHEN l.installments_count > 0 AND agg.paid_cnt >= l.installments_count THEN 'completed'
      ELSE 'active'
    END
FROM agg
WHERE agg.id = l.id
  AND (l.paid_count IS DISTINCT FROM agg.paid_cnt
       OR l.remaining IS DISTINCT FROM GREATEST(ROUND(l.amount - agg.paid_amt, 2), 0));