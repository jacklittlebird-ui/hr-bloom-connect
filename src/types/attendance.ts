// ===============================================
// ATTENDANCE MANAGEMENT SYSTEM - TYPE DEFINITIONS
// ===============================================

// Location Types
export type LocationType = 'headquarters' | 'airport';

// Attendance Schedule Types
export type ScheduleType = 'fixed' | 'flexible' | 'shift' | 'fully-flexible';

// Shift Pattern Types
export type ShiftPattern = '3-shift' | '4-shift';

// ===============================================
// LOCATION DEFINITIONS
// ===============================================
export interface Location {
  id: string;
  name: string;
  nameAr: string;
  type: LocationType;
  code: string; // e.g., 'HQ', 'CAI', 'HRG'
  timezone: string;
  isActive: boolean;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
    radius: number; // Geofence radius in meters
  };
}

// ===============================================
// SHIFT DEFINITIONS (for 24/7 operations)
// ===============================================
export interface ShiftDefinition {
  id: string;
  name: string;
  nameAr: string;
  code: string; // e.g., 'MORNING', 'EVENING', 'NIGHT'
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isOvernight: boolean; // true if shift spans across two calendar days
  breakDuration: number; // in minutes
  workDuration: number; // in hours (calculated)
  color: string; // for UI display
  locationId: string; // shifts can be specific to a location
  order: number; // display order
}

// Shift Template (collection of shifts for a location)
export interface ShiftTemplate {
  id: string;
  name: string;
  nameAr: string;
  locationId: string;
  pattern: ShiftPattern;
  shifts: ShiftDefinition[];
  isActive: boolean;
}

// ===============================================
// ATTENDANCE RULE DEFINITIONS
// ===============================================
export interface AttendanceRule {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  scheduleType: ScheduleType;
  isActive: boolean;
  
  // For Fixed Schedule
  fixedSchedule?: {
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    gracePeriodMinutes: number; // Late tolerance (e.g., 15 min)
    earlyDepartureMinutes: number; // Early leave tolerance
  };
  
  // For Flexible Schedule
  flexibleSchedule?: {
    arrivalWindowStart: string; // e.g., '09:00'
    arrivalWindowEnd: string; // e.g., '09:30'
    minimumWorkHours: number; // e.g., 8 hours
    coreHoursStart?: string; // mandatory presence start
    coreHoursEnd?: string; // mandatory presence end
  };

  // For Fully Flexible Schedule (monthly hours tracking)
  fullyFlexibleSchedule?: {
    monthlyTargetHours: number; // e.g., 192 hours per month
    allowAnyTime: boolean; // check in/out anytime
  };
  
  // For Shift-based Schedule
  shiftSchedule?: {
    shiftTemplateId: string;
    allowShiftSwap: boolean;
    overtimeThresholdMinutes: number; // After this, overtime kicks in
    nightShiftAllowance: boolean;
  };
  
  // Common Settings
  weekendDays: number[]; // 0=Sunday, 5=Friday, 6=Saturday
  workingDaysPerWeek: number;
  maxOvertimeHoursDaily: number;
  maxOvertimeHoursWeekly: number;
}

// ===============================================
// EMPLOYEE ATTENDANCE ASSIGNMENT
// ===============================================
export interface EmployeeAttendanceAssignment {
  id: string;
  employeeId: string;
  attendanceRuleId: string;
  locationId: string;
  shiftId?: string; // Current shift (for shift workers)
  rotationGroupId?: string; // For rotating shifts
  effectiveFrom: string; // Date
  effectiveTo?: string; // Date (null = ongoing)
  isActive: boolean;
  overrideRules?: Partial<AttendanceRule>; // Individual exceptions
}

// ===============================================
// SHIFT ROTATION SCHEDULE
// ===============================================
export interface ShiftRotation {
  id: string;
  employeeId: string;
  shiftId: string;
  date: string;
  isPlanned: boolean;
  isOvertime: boolean;
  createdAt: string;
  updatedAt: string;
}

// ===============================================
// ATTENDANCE RECORD (Enhanced)
// ===============================================
export interface EnhancedAttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNameAr: string;
  department: string;
  locationId: string;
  locationName: string;
  attendanceRuleId: string;
  shiftId?: string;
  
  // Timestamps
  date: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualCheckIn: string | null;
  actualCheckOut: string | null;
  
  // Calculated Values
  scheduledWorkHours: number;
  actualWorkHours: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  breakMinutes: number;
  
  // Status
  status: AttendanceStatus;
  isOvernight: boolean; // Shift spans two days
  
  // Approval
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvalDate?: string;
  
  // Check-in Method
  checkInMethod: CheckInMethod;
  checkOutMethod?: CheckInMethod;
  checkInLocation?: { lat: number; lng: number };
  checkOutLocation?: { lat: number; lng: number };
  
  // Notes
  notes?: string;
  exceptionReason?: string;
  
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 
  | 'present' 
  | 'absent' 
  | 'late' 
  | 'early-leave' 
  | 'late-and-early' 
  | 'on-leave' 
  | 'on-mission'
  | 'holiday'
  | 'weekend'
  | 'incomplete'; // Checked in but no checkout

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'auto-approved';

export type CheckInMethod = 'biometric' | 'mobile-app' | 'manual' | 'system';

// ===============================================
// EXCEPTION / MANUAL OVERRIDE
// ===============================================
export interface AttendanceException {
  id: string;
  employeeId: string;
  recordId: string;
  type: ExceptionType;
  originalValue: string;
  newValue: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export type ExceptionType = 
  | 'missed-checkin' 
  | 'missed-checkout' 
  | 'time-correction' 
  | 'status-change' 
  | 'shift-swap'
  | 'overtime-request'
  | 'force-close';

// ===============================================
// HOLIDAY DEFINITIONS
// ===============================================
export interface Holiday {
  id: string;
  name: string;
  nameAr: string;
  date: string;
  type: 'public' | 'company' | 'optional';
  locationIds: string[]; // Empty = all locations
  isRecurring: boolean; // Repeats annually
}

// ===============================================
// ATTENDANCE CALCULATION RESULT
// ===============================================
export interface AttendanceCalculation {
  date: string;
  employeeId: string;
  
  // Input
  rule: AttendanceRule;
  scheduledShift?: ShiftDefinition;
  checkIn: string | null;
  checkOut: string | null;
  
  // Output
  status: AttendanceStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workMinutes: number;
  overtimeMinutes: number;
  breakMinutes: number;
  
  // Flags
  isOvernight: boolean;
  isHoliday: boolean;
  isWeekend: boolean;
  nightShiftHours: number;
  
  // Penalties/Bonuses (for payroll integration)
  latePenaltyApplied: boolean;
  overtimeMultiplier: number; // 1.25, 1.5, 2.0 based on rules
}

// ===============================================
// SAMPLE DATA GENERATORS
// ===============================================
export const sampleLocations: Location[] = [
  {
    id: 'loc-hq',
    name: 'Link Cargo',
    nameAr: 'لينك كارجو',
    type: 'headquarters',
    code: 'HQ',
    timezone: 'Africa/Cairo',
    isActive: true,
    address: 'Cairo, Egypt',
  },
  {
    id: 'loc-cai',
    name: 'Cairo Airport',
    nameAr: 'مطار القاهرة',
    type: 'airport',
    code: 'CAI',
    timezone: 'Africa/Cairo',
    isActive: true,
    coordinates: {
      latitude: 30.1219,
      longitude: 31.4056,
      radius: 500,
    },
  },
  {
    id: 'loc-hrg',
    name: 'Hurghada Airport',
    nameAr: 'مطار الغردقة',
    type: 'airport',
    code: 'HRG',
    timezone: 'Africa/Cairo',
    isActive: true,
    coordinates: {
      latitude: 27.1783,
      longitude: 33.7994,
      radius: 500,
    },
  },
  {
    id: 'loc-ssh',
    name: 'Sharm El Sheikh Airport',
    nameAr: 'مطار شرم الشيخ',
    type: 'airport',
    code: 'SSH',
    timezone: 'Africa/Cairo',
    isActive: true,
    coordinates: {
      latitude: 27.9773,
      longitude: 34.3950,
      radius: 500,
    },
  },
];

export const sampleShiftDefinitions: ShiftDefinition[] = [
  {
    id: 'shift-morning',
    name: 'Morning Shift',
    nameAr: 'وردية صباحية',
    code: 'MORNING',
    startTime: '06:00',
    endTime: '14:00',
    isOvernight: false,
    breakDuration: 30,
    workDuration: 8,
    color: '#22c55e',
    locationId: 'loc-cai',
    order: 1,
  },
  {
    id: 'shift-afternoon',
    name: 'Afternoon Shift',
    nameAr: 'وردية مسائية',
    code: 'AFTERNOON',
    startTime: '14:00',
    endTime: '22:00',
    isOvernight: false,
    breakDuration: 30,
    workDuration: 8,
    color: '#f59e0b',
    locationId: 'loc-cai',
    order: 2,
  },
  {
    id: 'shift-night',
    name: 'Night Shift',
    nameAr: 'وردية ليلية',
    code: 'NIGHT',
    startTime: '22:00',
    endTime: '06:00',
    isOvernight: true,
    breakDuration: 30,
    workDuration: 8,
    color: '#6366f1',
    locationId: 'loc-cai',
    order: 3,
  },
];

export const sampleAttendanceRules: AttendanceRule[] = [
  {
    id: 'rule-hq-fixed',
    name: 'HQ Fixed Schedule',
    nameAr: 'دوام ثابت - لينك كارجو',
    description: 'Standard 8AM to 6PM schedule for Link Cargo employees',
    descriptionAr: 'دوام ثابت من 8 صباحاً حتى 6 مساءً لموظفي لينك كارجو',
    scheduleType: 'fixed',
    isActive: true,
    fixedSchedule: {
      startTime: '08:00',
      endTime: '18:00',
      gracePeriodMinutes: 15,
      earlyDepartureMinutes: 15,
    },
    weekendDays: [5, 6], // Friday, Saturday
    workingDaysPerWeek: 5,
    maxOvertimeHoursDaily: 4,
    maxOvertimeHoursWeekly: 20,
  },
  {
    id: 'rule-hq-flexible',
    name: 'HQ Flexible Schedule',
    nameAr: 'دوام مرن - لينك كارجو',
    description: 'Flexible arrival between 9:00-9:30 AM',
    descriptionAr: 'دوام مرن مع إمكانية الحضور بين 9:00 و 9:30 صباحاً',
    scheduleType: 'flexible',
    isActive: true,
    flexibleSchedule: {
      arrivalWindowStart: '09:00',
      arrivalWindowEnd: '09:30',
      minimumWorkHours: 8,
      coreHoursStart: '10:00',
      coreHoursEnd: '16:00',
    },
    weekendDays: [5, 6],
    workingDaysPerWeek: 5,
    maxOvertimeHoursDaily: 4,
    maxOvertimeHoursWeekly: 20,
  },
  {
    id: 'rule-airport-3shift',
    name: 'Airport 3-Shift Rotation',
    nameAr: 'نظام الورديات الثلاثة - المطار',
    description: '24/7 coverage with 3 shifts (Morning, Afternoon, Night)',
    descriptionAr: 'تغطية على مدار الساعة بنظام 3 ورديات',
    scheduleType: 'shift',
    isActive: true,
    shiftSchedule: {
      shiftTemplateId: 'template-3shift',
      allowShiftSwap: true,
      overtimeThresholdMinutes: 30,
      nightShiftAllowance: true,
    },
    weekendDays: [], // 24/7 operation
    workingDaysPerWeek: 6,
    maxOvertimeHoursDaily: 4,
    maxOvertimeHoursWeekly: 24,
  },
  {
    id: 'rule-fully-flexible',
    name: 'Fully Flexible (Monthly Hours)',
    nameAr: 'حضور مرن بالكامل (ساعات شهرية)',
    description: 'Employee can check in/out at any time. Work hours are accumulated monthly.',
    descriptionAr: 'يمكن للموظف الحضور والانصراف في أي وقت خلال اليوم ويتم احتساب ساعات العمل على مدار الشهر',
    scheduleType: 'fully-flexible',
    isActive: true,
    fullyFlexibleSchedule: {
      monthlyTargetHours: 192,
      allowAnyTime: true,
    },
    weekendDays: [5, 6],
    workingDaysPerWeek: 5,
    maxOvertimeHoursDaily: 4,
    maxOvertimeHoursWeekly: 20,
  },
];

export const sampleEmployeeAssignments: EmployeeAttendanceAssignment[] = [
  {
    id: 'assign-1',
    employeeId: 'EMP001',
    attendanceRuleId: 'rule-hq-fixed',
    locationId: 'loc-hq',
    effectiveFrom: '2024-01-01',
    isActive: true,
  },
  {
    id: 'assign-2',
    employeeId: 'EMP002',
    attendanceRuleId: 'rule-hq-flexible',
    locationId: 'loc-hq',
    effectiveFrom: '2024-01-01',
    isActive: true,
  },
  {
    id: 'assign-3',
    employeeId: 'EMP003',
    attendanceRuleId: 'rule-airport-3shift',
    locationId: 'loc-cai',
    shiftId: 'shift-morning',
    effectiveFrom: '2024-01-01',
    isActive: true,
  },
];
