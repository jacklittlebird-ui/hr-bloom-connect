# Project rules
- Employee form PDF downloads use a shared wrapper around the rendered preview in both document entry points; export each existing page separately to preserve current values and pagination without duplicating template logic.
- Insurance Form 1 and Form 6 PDF exports use native browser text layout through foreignObject rendering to keep Arabic text baselines and boxed digits aligned with their previews.
- Marriage leave day counting is shared through `src/lib/leaveDays.ts` and enforced by a database trigger on insert/date/type/day edits; this keeps all entry paths consistent and prevents bypassing validation.

- Permit lists load all pages through `fetchAllPages` with stable ordering and reject partial failures — combined linked lists can exceed the Data API row limit.

- Saved payroll rows (`payroll_entries`) keep a snapshot of the employee's `station_id` / `department_id` (filled by a DB trigger on insert, never overwritten on update); salary screens and reports must group by this snapshot, not the employee's current placement — so a saved month never changes when an employee is moved or deactivated.
- Attendance fraud signals are written to `attendance_tamper_incidents` (gps-checkin directly, device_alerts via trigger); evidence columns are immutable by trigger and the risk engine only flags, never blocks — so reviews never alter attendance or payroll.
- Violation deductions sync to `penalty_deductions` (days, by chosen month) via DB trigger on violations insert/reject/delete; month rules (no past month, current month only up to day 25 Cairo) are enforced in both the DB trigger and `src/lib/violationPenalty.ts` — so payroll picks them up automatically and the rule can't be bypassed.
- Unpaid leave (incl. station-recorded unauthorized absence) gets `leave_requests.deduction_month` set by DB trigger on insert (current Cairo month, next month after day 25) and syncs days to `leave_deductions` immediately unless rejected (moved on month/days edit, reversed on reject/delete) — so payroll deducts automatically and the month can't be chosen client-side.
