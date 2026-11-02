# بدل عمل أيام إضافية

New tab in الرواتب beside «المكافآت الغير دورية», named «بدل عمل أيام إضافية», working the same way.

## How it works
1. Download a template with two columns: كود الموظف، عدد الأيام الإضافية.
2. Pick the month, then upload the filled file.
3. For each row the system:
   - finds the employee by code
   - takes their net salary from the employee's «الرواتب والبدلات» tab (the same «الصافي» figure shown there), using the salary year of the chosen month, or the latest saved year if that year is missing
   - day rate = net salary / 30
   - allowance = day rate x number of days
4. Preview table shows code, name, net salary, day rate, days, amount, bank details. Rows with an unknown code or no salary saved are flagged and not saved.
5. Save as a batch; a history tab lists saved batches with export and delete, exactly like the non-recurring bonuses.

## Export
Same file layout as the non-recurring bonuses export: كود الموظف، اسم الموظف، المبلغ، رقم البطاقة البنكية، رقم الحساب البنكي.

## Technical details
- New table `extra_days_allowances` (batch_id, employee_id, employee_code, employee_name, days, net_salary, daily_rate, amount, bank fields, allowance_month, uploaded_by, created_at) with the same grants and access rules as `non_recurring_bonuses`.
- New component `src/components/salaries/ExtraDaysAllowance.tsx`, modelled on `NonRecurringBonuses.tsx`; net salary via `calcNet` from `SalaryDataContext` on the employee's salary record.
- Calculation in a small helper in `src/lib/` with a test (e.g. net 6000, 3 days -> 600); rounding kept to 2 decimals.
- Register the tab in `src/pages/Salaries.tsx`.
