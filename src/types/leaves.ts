export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNameAr: string;
  department: string;
  station: string;
  leaveType: 'annual' | 'sick' | 'casual' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectionReason?: string;
}

export interface PermissionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNameAr: string;
  department: string;
  station: string;
  permissionType: 'early_leave' | 'late_arrival' | 'personal' | 'medical';
  date: string;
  fromTime: string;
  toTime: string;
  durationHours: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
}

export type MissionType = 'morning' | 'evening' | 'full_day';

export const MISSION_TIME_CONFIG: Record<MissionType, { checkIn: string; checkOut: string; hours: number; labelAr: string; labelEn: string }> = {
  morning: { checkIn: '09:00', checkOut: '14:00', hours: 5, labelAr: 'مأمورية صباحية', labelEn: 'Morning Mission' },
  evening: { checkIn: '14:00', checkOut: '17:00', hours: 3, labelAr: 'مأمورية مسائية', labelEn: 'Evening Mission' },
  full_day: { checkIn: '09:00', checkOut: '17:00', hours: 8, labelAr: 'مأمورية يوم كامل', labelEn: 'Full Day Mission' },
};

export interface MissionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNameAr: string;
  department: string;
  station: string;
  missionType: MissionType;
  date: string;
  destination?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
}

export interface OvertimeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNameAr: string;
  department: string;
  station: string;
  date: string;
  hours: number;
  overtimeType: 'regular' | 'holiday' | 'weekend';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
}

export interface EmployeeLeaveBalance {
  employeeId: string;
  employeeName: string;
  employeeNameAr: string;
  department: string;
  station: string;
  annualTotal: number;
  annualUsed: number;
  annualRemaining: number;
  sickTotal: number;
  sickUsed: number;
  sickRemaining: number;
  casualTotal: number;
  casualUsed: number;
  casualRemaining: number;
  permissionsTotal: number;
  permissionsUsed: number;
  permissionsRemaining: number;
}
