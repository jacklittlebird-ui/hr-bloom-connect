/**
 * Centralized attendance classification + hour computation.
 *
 * Rules (kept consistent across portal, admin, station-manager and reports):
 *  - Auto-closed days (status='auto-closed' or notes ~ AUTO_CLOSED) count as
 *    a PRESENT day and their work hours are included in totals
 *    (auto-checkout edge function writes work_hours=5, work_minutes=300).
 *  - Mission attendance records (status='mission') count as a PRESENT day
 *    and their work hours are included in totals.
 *  - When check_in exists but check_out is missing OR the computed delta is 0,
 *    fall back to work_minutes, then work_hours from the DB.
 *  - Official holidays / approved leaves are NOT counted as absences when
 *    computing the attendance rate.
 */

export interface RawAttendanceRow {
  id?: string;
  date?: string;
  check_in?: string | null;
  check_out?: string | null;
  status?: string | null;
  work_hours?: number | string | null;
  work_minutes?: number | null;
  is_late?: boolean | null;
  notes?: string | null;
}

export type AttendanceClass =
  | 'present'
  | 'late'
  | 'auto-closed'
  | 'mission'
  | 'on-leave'
  | 'absent'
  | 'official-holiday'
  | 'weekend'
  | 'early-leave';

export type HoursSource = 'timestamps' | 'work_minutes' | 'work_hours' | 'none';

export interface ClassifiedAttendance {
  status: AttendanceClass;
  isPresentDay: boolean;
  isAutoClosed: boolean;
  isMission: boolean;
  totalMinutes: number;
  hoursSource: HoursSource;
  reasonAr: string;
  reasonEn: string;
}

const AUTO_CLOSED_RE = /AUTO[_-]?CLOSED/i;

export const isAutoClosedRow = (r: RawAttendanceRow): boolean => {
  const status = String(r.status || '').toLowerCase().replace(/_/g, '-');
  return status === 'auto-closed' || (!!r.notes && AUTO_CLOSED_RE.test(r.notes));
};

export const computeWorkMinutes = (
  r: RawAttendanceRow,
): { minutes: number; source: HoursSource } => {
  if (r.check_in && r.check_out) {
    const diff = (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 60000;
    if (diff > 0) return { minutes: Math.round(diff), source: 'timestamps' };
  }
  if (r.work_minutes != null && Number(r.work_minutes) > 0) {
    return { minutes: Math.round(Number(r.work_minutes)), source: 'work_minutes' };
  }
  if (r.work_hours != null && Number(r.work_hours) > 0) {
    return { minutes: Math.round(Number(r.work_hours) * 60), source: 'work_hours' };
  }
  return { minutes: 0, source: 'none' };
};

export const classifyAttendance = (
  r: RawAttendanceRow,
  opts: { isOfficialHoliday?: boolean; isOnLeave?: boolean } = {},
): ClassifiedAttendance => {
  const rawStatus = String(r.status || '').toLowerCase().replace(/_/g, '-');
  const autoClosed = isAutoClosedRow(r);
  const isMission = rawStatus === 'mission';
  const { minutes, source } = computeWorkMinutes(r);

  let status: AttendanceClass;
  if (opts.isOfficialHoliday) status = 'official-holiday';
  else if (opts.isOnLeave) status = 'on-leave';
  else if (autoClosed) status = 'auto-closed';
  else if (isMission) status = 'mission';
  else if (r.is_late) status = 'late';
  else if (rawStatus === 'absent') status = 'absent';
  else if (rawStatus === 'early-leave') status = 'early-leave';
  else if (r.check_in) status = 'present';
  else status = (rawStatus as AttendanceClass) || 'absent';

  const isPresentDay =
    status === 'present' ||
    status === 'late' ||
    status === 'auto-closed' ||
    status === 'mission' ||
    status === 'early-leave';

  let reasonAr = '';
  let reasonEn = '';
  switch (status) {
    case 'official-holiday':
      reasonAr = 'إجازة رسمية — لا تُحسب ضمن أيام العمل.';
      reasonEn = 'Official holiday — excluded from working days.';
      break;
    case 'on-leave':
      reasonAr = 'إجازة معتمدة — تُحسب كيوم مُغطّى وليست غياباً.';
      reasonEn = 'Approved leave — counted as covered, not absence.';
      break;
    case 'auto-closed':
      reasonAr = 'تم الإغلاق التلقائي بعد عدم تسجيل الانصراف؛ يُحتسب اليوم حضوراً وساعات العمل المسجّلة في النظام مُضافة للإجمالي.';
      reasonEn = 'Auto-closed after no checkout; counted as Present and the recorded work hours are included.';
      break;
    case 'mission':
      reasonAr = 'مأمورية معتمدة — تُحتسب حضوراً وتُضاف ساعاتها للإجمالي.';
      reasonEn = 'Approved mission — counted as Present and hours included.';
      break;
    case 'late':
      reasonAr = 'حضور مع تأخير عن وقت بداية الدوام.';
      reasonEn = 'Present but checked-in late.';
      break;
    case 'early-leave':
      reasonAr = 'انصراف مبكر — يُحتسب حضوراً.';
      reasonEn = 'Early leave — counted as Present.';
      break;
    case 'present':
      reasonAr = 'حضور وانصراف موثّق.';
      reasonEn = 'Standard present day.';
      break;
    case 'absent':
      reasonAr = 'غياب — لا يوجد تسجيل حضور ولا إجازة معتمدة.';
      reasonEn = 'Absent — no check-in and no approved leave/holiday.';
      break;
    default:
      reasonAr = 'حالة افتراضية.';
      reasonEn = 'Default state.';
  }

  if (isPresentDay) {
    const srcLabelAr =
      source === 'timestamps' ? 'حُسبت من فرق وقت الحضور والانصراف.'
      : source === 'work_minutes' ? 'حُسبت من حقل work_minutes في قاعدة البيانات.'
      : source === 'work_hours' ? 'حُسبت من حقل work_hours في قاعدة البيانات.'
      : 'لا توجد ساعات مسجلة.';
    const srcLabelEn =
      source === 'timestamps' ? 'Computed from check-in/out timestamps.'
      : source === 'work_minutes' ? 'Read from DB work_minutes.'
      : source === 'work_hours' ? 'Read from DB work_hours.'
      : 'No recorded hours.';
    reasonAr += ` ${srcLabelAr}`;
    reasonEn += ` ${srcLabelEn}`;
  }

  return {
    status,
    isPresentDay,
    isAutoClosed: autoClosed,
    isMission,
    totalMinutes: minutes,
    hoursSource: source,
    reasonAr,
    reasonEn,
  };
};

export const formatHM = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
