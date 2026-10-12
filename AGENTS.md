# Project rules

- Saved payroll rows (`payroll_entries`) keep a snapshot of the employee's `station_id` / `department_id` (filled by a DB trigger on insert, never overwritten on update); salary screens and reports must group by this snapshot, not the employee's current placement — so a saved month never changes when an employee is moved or deactivated.
