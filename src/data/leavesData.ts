import { LeaveRequest, PermissionRequest, MissionRequest, OvertimeRequest, EmployeeLeaveBalance } from '@/types/leaves';

export const sampleLeaveRequests: LeaveRequest[] = [
  { id: '1', employeeId: 'Emp001', employeeName: 'Galal AbdelRazek', employeeNameAr: 'جلال عبد الرازق', department: 'الإدارة', station: '', leaveType: 'annual', startDate: '2024-02-15', endDate: '2024-02-20', days: 5, reason: 'Family vacation', status: 'pending', submittedDate: '2024-02-10' },
  { id: '2', employeeId: 'Emp002', employeeName: 'Ahmed Mohamed Ali', employeeNameAr: 'أحمد محمد علي', department: 'تقنية المعلومات', station: '', leaveType: 'sick', startDate: '2024-02-12', endDate: '2024-02-13', days: 2, reason: 'Medical appointment', status: 'approved', submittedDate: '2024-02-11', approvedBy: 'Manager', approvedDate: '2024-02-11' },
  { id: '3', employeeId: 'Emp003', employeeName: 'Sara Ahmed Hassan', employeeNameAr: 'سارة أحمد حسن', department: 'الإدارة', station: '', leaveType: 'casual', startDate: '2024-02-18', endDate: '2024-02-18', days: 1, reason: 'Personal matter', status: 'pending', submittedDate: '2024-02-15' },
  { id: '4', employeeId: 'Emp001', employeeName: 'Galal AbdelRazek', employeeNameAr: 'جلال عبد الرازق', department: 'الإدارة', station: '', leaveType: 'annual', startDate: '2024-02-25', endDate: '2024-03-01', days: 5, reason: 'Travel abroad', status: 'rejected', submittedDate: '2024-02-14', rejectionReason: 'Conflict with project deadline' },
];

export const samplePermissionRequests: PermissionRequest[] = [
  { id: 'P1', employeeId: 'Emp001', employeeName: 'Galal AbdelRazek', employeeNameAr: 'جلال عبد الرازق', department: 'الإدارة', station: '', permissionType: 'early_leave', date: '2024-02-14', fromTime: '14:00', toTime: '16:00', durationHours: 2, reason: 'Doctor appointment', status: 'approved', submittedDate: '2024-02-13' },
  { id: 'P2', employeeId: 'Emp002', employeeName: 'Ahmed Mohamed Ali', employeeNameAr: 'أحمد محمد علي', department: 'تقنية المعلومات', station: '', permissionType: 'late_arrival', date: '2024-02-15', fromTime: '08:00', toTime: '10:00', durationHours: 2, reason: 'Car maintenance', status: 'pending', submittedDate: '2024-02-14' },
  { id: 'P3', employeeId: 'Emp003', employeeName: 'Sara Ahmed Hassan', employeeNameAr: 'سارة أحمد حسن', department: 'الإدارة', station: '', permissionType: 'personal', date: '2024-02-16', fromTime: '11:00', toTime: '13:00', durationHours: 2, reason: 'Bank visit', status: 'pending', submittedDate: '2024-02-15' },
];

export const sampleMissionRequests: MissionRequest[] = [
  { id: 'M1', employeeId: 'Emp001', employeeName: 'Galal AbdelRazek', employeeNameAr: 'جلال عبد الرازق', department: 'الإدارة', station: '', missionType: 'morning', date: '2024-02-20', destination: 'Cairo Airport', reason: 'Equipment inspection', status: 'approved', submittedDate: '2024-02-18' },
  { id: 'M2', employeeId: 'Emp003', employeeName: 'Sara Ahmed Hassan', employeeNameAr: 'سارة أحمد حسن', department: 'الإدارة', station: '', missionType: 'full_day', date: '2024-02-22', destination: 'Ministry of Finance', reason: 'Annual audit meeting', status: 'pending', submittedDate: '2024-02-20' },
  { id: 'M3', employeeId: 'Emp002', employeeName: 'Ahmed Mohamed Ali', employeeNameAr: 'أحمد محمد علي', department: 'تقنية المعلومات', station: '', missionType: 'evening', date: '2024-02-25', destination: 'Training Center', reason: 'HR certification workshop', status: 'pending', submittedDate: '2024-02-22' },
  { id: 'M4', employeeId: 'Emp001', employeeName: 'Galal AbdelRazek', employeeNameAr: 'جلال عبد الرازق', department: 'الإدارة', station: '', missionType: 'full_day', date: '2024-03-01', destination: 'Alexandria Branch', reason: 'Client meeting', status: 'pending', submittedDate: '2024-02-25' },
];

export const sampleOvertimeRequests: OvertimeRequest[] = [
  { id: 'O1', employeeId: 'Emp001', employeeName: 'Galal AbdelRazek', employeeNameAr: 'جلال عبد الرازق', department: 'الإدارة', station: '', date: '2024-02-14', hours: 3, overtimeType: 'regular', reason: 'System deployment', status: 'approved', submittedDate: '2024-02-13' },
  { id: 'O2', employeeId: 'Emp003', employeeName: 'Sara Ahmed Hassan', employeeNameAr: 'سارة أحمد حسن', department: 'الإدارة', station: '', date: '2024-02-16', hours: 4, overtimeType: 'weekend', reason: 'Quarter-end closing', status: 'pending', submittedDate: '2024-02-15' },
  { id: 'O3', employeeId: 'Emp001', employeeName: 'Galal AbdelRazek', employeeNameAr: 'جلال عبد الرازق', department: 'الإدارة', station: '', date: '2024-02-20', hours: 2, overtimeType: 'holiday', reason: 'Urgent maintenance', status: 'approved', submittedDate: '2024-02-19' },
];

export const sampleLeaveBalances: EmployeeLeaveBalance[] = [
  { employeeId: 'Emp001', employeeName: 'Galal AbdelRazek', employeeNameAr: 'جلال عبد الرازق', department: 'الإدارة', station: '', annualTotal: 21, annualUsed: 5, annualRemaining: 16, sickTotal: 15, sickUsed: 2, sickRemaining: 13, casualTotal: 7, casualUsed: 1, casualRemaining: 6, permissionsTotal: 24, permissionsUsed: 4, permissionsRemaining: 20 },
  { employeeId: 'Emp002', employeeName: 'Ahmed Mohamed Ali', employeeNameAr: 'أحمد محمد علي', department: 'تقنية المعلومات', station: '', annualTotal: 21, annualUsed: 10, annualRemaining: 11, sickTotal: 15, sickUsed: 5, sickRemaining: 10, casualTotal: 7, casualUsed: 3, casualRemaining: 4, permissionsTotal: 24, permissionsUsed: 8, permissionsRemaining: 16 },
  { employeeId: 'Emp003', employeeName: 'Sara Ahmed Hassan', employeeNameAr: 'سارة أحمد حسن', department: 'الإدارة', station: '', annualTotal: 21, annualUsed: 0, annualRemaining: 21, sickTotal: 15, sickUsed: 0, sickRemaining: 15, casualTotal: 7, casualUsed: 2, casualRemaining: 5, permissionsTotal: 24, permissionsUsed: 0, permissionsRemaining: 24 },
];
