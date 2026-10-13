# Project rules

- Saved payroll rows (`payroll_entries`) keep a snapshot of the employee's `station_id` / `department_id` (filled by a DB trigger on insert, never overwritten on update); salary screens and reports must group by this snapshot, not the employee's current placement — so a saved month never changes when an employee is moved or deactivated.
- Attendance fraud signals are written to `attendance_tamper_incidents` (gps-checkin directly, device_alerts via trigger); evidence columns are immutable by trigger and the risk engine only flags, never blocks — so reviews never alter attendance or payroll.
