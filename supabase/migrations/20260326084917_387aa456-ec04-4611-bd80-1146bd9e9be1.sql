
-- Update loans that had January 2026 payroll deductions: increment paid_count by 1, reduce remaining
UPDATE loans 
SET 
  paid_count = COALESCE(paid_count, 0) + 1,
  remaining = GREATEST(COALESCE(remaining, amount) - COALESCE(monthly_installment, 0), 0),
  status = CASE 
    WHEN COALESCE(paid_count, 0) + 1 >= installments_count THEN 'completed' 
    ELSE status 
  END
WHERE status = 'active' 
  AND employee_id IN (
    SELECT DISTINCT employee_id FROM payroll_entries 
    WHERE loan_payment > 0 AND month = '01' AND year = '2026'
  );

-- Mark the first pending installment as paid for each of these loans
UPDATE loan_installments 
SET status = 'paid', paid_at = '2026-01-31T23:59:59Z'
WHERE id IN (
  SELECT DISTINCT ON (loan_id) li.id
  FROM loan_installments li
  JOIN loans l ON li.loan_id = l.id
  WHERE l.employee_id IN (
    SELECT DISTINCT employee_id FROM payroll_entries 
    WHERE loan_payment > 0 AND month = '01' AND year = '2026'
  )
  AND li.status = 'pending'
  ORDER BY loan_id, installment_number ASC
);
