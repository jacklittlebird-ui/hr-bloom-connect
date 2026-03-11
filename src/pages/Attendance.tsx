import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckInOut } from '@/components/attendance/CheckInOut';
import { AttendanceList } from '@/components/attendance/AttendanceList';
import { LateArrivals } from '@/components/attendance/LateArrivals';
import { AttendanceReports } from '@/components/attendance/AttendanceReports';
import { ShiftManagement } from '@/components/attendance/ShiftManagement';
import { AttendanceRules } from '@/components/attendance/AttendanceRules';
import { StationCheckinSettings } from '@/components/attendance/StationCheckinSettings';
import { EmployeeAssignment } from '@/components/attendance/EmployeeAssignment';
import { useAttendanceData } from '@/contexts/AttendanceDataContext';
import { Clock, List, AlertTriangle, BarChart3, Calendar, Settings2, Users, RefreshCw, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNameAr: string;
  department: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'present' | 'absent' | 'late' | 'early-leave' | 'on-leave';
  workHours: number;
  overtime: number;
  notes?: string;
}

// Sample data
export const sampleAttendanceRecords: AttendanceRecord[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'Ahmed Mohamed',
    employeeNameAr: 'أحمد محمد',
    department: 'IT',
    date: '2024-02-15',
    checkIn: '08:55',
    checkOut: '17:05',
    status: 'present',
    workHours: 8,
    overtime: 0,
  },
  {
    id: '2',
    employeeId: 'EMP002',
    employeeName: 'Sara Ali',
    employeeNameAr: 'سارة علي',
    department: 'HR',
    date: '2024-02-15',
    checkIn: '09:25',
    checkOut: '17:00',
    status: 'late',
    workHours: 7.5,
    overtime: 0,
    notes: 'Traffic delay',
  },
  {
    id: '3',
    employeeId: 'EMP003',
    employeeName: 'Mohamed Hassan',
    employeeNameAr: 'محمد حسن',
    department: 'Finance',
    date: '2024-02-15',
    checkIn: '08:45',
    checkOut: '19:00',
    status: 'present',
    workHours: 8,
    overtime: 2,
  },
  {
    id: '4',
    employeeId: 'EMP004',
    employeeName: 'Fatima Omar',
    employeeNameAr: 'فاطمة عمر',
    department: 'Sales',
    date: '2024-02-15',
    checkIn: null,
    checkOut: null,
    status: 'on-leave',
    workHours: 0,
    overtime: 0,
    notes: 'Annual leave',
  },
  {
    id: '5',
    employeeId: 'EMP005',
    employeeName: 'Ali Mahmoud',
    employeeNameAr: 'علي محمود',
    department: 'Marketing',
    date: '2024-02-15',
    checkIn: '08:50',
    checkOut: '15:30',
    status: 'early-leave',
    workHours: 6.5,
    overtime: 0,
    notes: 'Personal emergency',
  },
  {
    id: '6',
    employeeId: 'EMP006',
    employeeName: 'Nour Ahmed',
    employeeNameAr: 'نور أحمد',
    department: 'Operations',
    date: '2024-02-15',
    checkIn: null,
    checkOut: null,
    status: 'absent',
    workHours: 0,
    overtime: 0,
  },
];

// Generate more sample data for the week
export const generateWeeklyData = (): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const employees = [
    { id: 'EMP001', name: 'Ahmed Mohamed', nameAr: 'أحمد محمد', dept: 'IT' },
    { id: 'EMP002', name: 'Sara Ali', nameAr: 'سارة علي', dept: 'HR' },
    { id: 'EMP003', name: 'Mohamed Hassan', nameAr: 'محمد حسن', dept: 'Finance' },
    { id: 'EMP004', name: 'Fatima Omar', nameAr: 'فاطمة عمر', dept: 'Sales' },
    { id: 'EMP005', name: 'Ali Mahmoud', nameAr: 'علي محمود', dept: 'Marketing' },
  ];
  
  const dates = ['2024-02-12', '2024-02-13', '2024-02-14', '2024-02-15'];
  const statuses: AttendanceRecord['status'][] = ['present', 'present', 'late', 'present', 'early-leave'];
  
  let idCounter = 1;
  dates.forEach(date => {
    employees.forEach((emp, idx) => {
      const status = statuses[idx % statuses.length];
      records.push({
        id: String(idCounter++),
        employeeId: emp.id,
        employeeName: emp.name,
        employeeNameAr: emp.nameAr,
        department: emp.dept,
        date,
        checkIn: status !== 'absent' ? (status === 'late' ? '09:20' : '08:50') : null,
        checkOut: status !== 'absent' ? (status === 'early-leave' ? '15:30' : '17:00') : null,
        status,
        workHours: status === 'present' ? 8 : status === 'late' ? 7.5 : status === 'early-leave' ? 6.5 : 0,
        overtime: Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0,
      });
    });
  });
  
  return records;
};

const Attendance = () => {
  const { t, isRTL, language } = useLanguage();
  const { refresh: refreshAttendance } = useAttendanceData();
  const [activeTab, setActiveTab] = useState('checkin');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([
    ...sampleAttendanceRecords,
    ...generateWeeklyData(),
  ]);

  const handleCheckIn = (employeeId: string, employeeName: string, employeeNameAr: string, department: string) => {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const dateString = now.toISOString().split('T')[0];
    const isLate = now.getHours() >= 9;

    const newRecord: AttendanceRecord = {
      id: String(Date.now()),
      employeeId,
      employeeName,
      employeeNameAr,
      department,
      date: dateString,
      checkIn: timeString,
      checkOut: null,
      status: isLate ? 'late' : 'present',
      workHours: 0,
      overtime: 0,
    };

    setAttendanceRecords(prev => [...prev, newRecord]);
  };

  const handleCheckOut = (recordId: string) => {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    setAttendanceRecords(prev => prev.map(record => {
      if (record.id === recordId) {
        const checkInTime = record.checkIn ? parseInt(record.checkIn.split(':')[0]) : 9;
        const checkOutTime = now.getHours();
        const workHours = Math.max(0, checkOutTime - checkInTime);
        const isEarlyLeave = now.getHours() < 17;

        return {
          ...record,
          checkOut: timeString,
          status: isEarlyLeave ? 'early-leave' : record.status,
          workHours,
          overtime: Math.max(0, workHours - 8),
        };
      }
      return record;
    }));
  };

  const todayRecords = attendanceRecords.filter(r => r.date === new Date().toISOString().split('T')[0]);
  const lateCount = todayRecords.filter(r => r.status === 'late').length;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className={cn("flex items-center justify-between mb-6", isRTL && "flex-row-reverse")}>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('attendance.title')}</h1>
            <p className="text-muted-foreground">{t('attendance.subtitle')}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => { refreshAttendance(); toast.success(language === 'ar' ? 'تم التحديث' : 'Refreshed'); }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn("grid w-full grid-cols-8 mb-6")} dir="rtl">
            <TabsTrigger value="checkin" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden lg:inline">{t('attendance.tabs.checkInOut')}</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              <span className="hidden lg:inline">{t('attendance.tabs.records')}</span>
            </TabsTrigger>
            <TabsTrigger value="late" className="flex items-center gap-2 relative">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden lg:inline">{t('attendance.tabs.lateArrivals')}</span>
              {lateCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-warning text-warning-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {lateCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden lg:inline">{t('attendance.tabs.reports')}</span>
            </TabsTrigger>
            <TabsTrigger value="shifts" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden lg:inline">{t('attendance.tabs.shifts')}</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              <span className="hidden lg:inline">{t('attendance.tabs.rules')}</span>
            </TabsTrigger>
            <TabsTrigger value="assignment" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden lg:inline">{t('attendance.tabs.assignment')}</span>
            </TabsTrigger>
            <TabsTrigger value="station-settings" className="flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              <span className="hidden lg:inline">{language === 'ar' ? 'إعدادات المحطات' : 'Station Settings'}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checkin">
            <CheckInOut 
              records={attendanceRecords} 
              onCheckIn={handleCheckIn} 
              onCheckOut={handleCheckOut} 
            />
          </TabsContent>

          <TabsContent value="list">
            <AttendanceList />
          </TabsContent>

          <TabsContent value="late">
            <LateArrivals records={attendanceRecords.filter(r => r.status === 'late')} />
          </TabsContent>

          <TabsContent value="reports">
            <AttendanceReports />
          </TabsContent>

          <TabsContent value="shifts">
            <ShiftManagement />
          </TabsContent>

          <TabsContent value="rules">
            <AttendanceRules />
          </TabsContent>


          <TabsContent value="assignment">
            <EmployeeAssignment />
          </TabsContent>

          <TabsContent value="station-settings">
            <StationCheckinSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
