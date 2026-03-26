import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAttendanceData } from '@/contexts/AttendanceDataContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaveRequestsList } from '@/components/leaves/LeaveRequestsList';
import { PermissionRequestsList } from '@/components/leaves/PermissionRequestsList';
import { MissionRequestsList } from '@/components/leaves/MissionRequestsList';
import { OvertimeRequestsList } from '@/components/leaves/OvertimeRequestsList';
import { NewRequestForm } from '@/components/leaves/NewRequestForm';
import { LeaveBalanceOverview } from '@/components/leaves/LeaveBalanceOverview';
import { LeaveCalendar } from '@/components/leaves/LeaveCalendar';
import { LeaveApprovals } from '@/components/leaves/LeaveApprovals';
import { RequestFilters } from '@/components/leaves/RequestFilters';
import { ViolationsManagement } from '@/components/leaves/ViolationsManagement';
import { EmployeeRequestsList } from '@/components/leaves/EmployeeRequestsList';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  LeaveRequest,
  PermissionRequest,
  MissionRequest,
  OvertimeRequest,
  EmployeeLeaveBalance,
  MISSION_TIME_CONFIG,
} from '@/types/leaves';
import { FileText, Plus, CheckCircle, BarChart3, Calendar, ShieldCheck, Briefcase, PlusCircle, AlertTriangle, RefreshCw, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DeptOption { id: string; name_ar: string; name_en: string; }
interface StationOption { id: string; name_ar: string; name_en: string; }

const Leaves = () => {
  const { t, isRTL, language } = useLanguage();
  const { addMissionAttendance } = useAttendanceData();
  const [activeTab, setActiveTab] = useState('leaves');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);
  const [missionRequests, setMissionRequests] = useState<MissionRequest[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<EmployeeLeaveBalance[]>([]);
  const [employeeRequests, setEmployeeRequests] = useState<any[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStation, setSelectedStation] = useState('all');

  // Employee maps for filtering
  const [empDeptMap, setEmpDeptMap] = useState<Map<string, string>>(new Map());
  const [empStationMap, setEmpStationMap] = useState<Map<string, string>>(new Map());

  const fetchData = async () => {
    const { data: employees } = await supabase.from('employees').select('id, employee_code, name_en, name_ar, department_id, station_id, annual_leave_balance, sick_leave_balance, hire_date').order('employee_code');
    const { data: deptData } = await supabase.from('departments').select('id, name_ar, name_en');
    const { data: stationData } = await supabase.from('stations').select('id, name_ar, name_en');

    setDepartments(deptData || []);
    setStations(stationData || []);

    const empMap = new Map(employees?.map(e => [e.id, e]) || []);
    const deptMap = new Map(deptData?.map(d => [d.id, d]) || []);
    const stMap = new Map(stationData?.map(s => [s.id, s]) || []);

    // Build maps for filtering
    const dMap = new Map<string, string>();
    const sMap = new Map<string, string>();
    employees?.forEach(e => {
      if (e.department_id) dMap.set(e.id, e.department_id);
      if (e.station_id) sMap.set(e.id, e.station_id);
    });
    setEmpDeptMap(dMap);
    setEmpStationMap(sMap);

    const getEmpInfo = (empId: string) => {
      const e = empMap.get(empId);
      const d = e?.department_id ? deptMap.get(e.department_id) : null;
      const s = e?.station_id ? stMap.get(e.station_id) : null;
      return {
        employeeName: e?.name_en || '',
        employeeNameAr: e?.name_ar || '',
        department: d ? (language === 'ar' ? d.name_ar : d.name_en) : '',
        station: s ? (language === 'ar' ? s.name_ar : s.name_en) : '',
      };
    };

    // Leave requests
    const { data: leaves } = await supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
    setLeaveRequests((leaves || []).map(l => {
      const info = getEmpInfo(l.employee_id);
      return {
        id: l.id, employeeId: l.employee_id,
        employeeName: info.employeeName, employeeNameAr: info.employeeNameAr,
        department: info.department, station: info.station,
        leaveType: l.leave_type as LeaveRequest['leaveType'],
        startDate: l.start_date, endDate: l.end_date, days: l.days,
        reason: l.reason || '', status: l.status as LeaveRequest['status'],
        submittedDate: l.created_at.split('T')[0],
        rejectionReason: l.rejection_reason || undefined,
      };
    }));

    // Permission requests
    const { data: perms } = await supabase.from('permission_requests').select('*').order('created_at', { ascending: false });
    setPermissionRequests((perms || []).map(p => {
      const info = getEmpInfo(p.employee_id);
      return {
        id: p.id, employeeId: p.employee_id,
        employeeName: info.employeeName, employeeNameAr: info.employeeNameAr,
        department: info.department, station: info.station,
        permissionType: p.permission_type as PermissionRequest['permissionType'],
        date: p.date, fromTime: p.start_time, toTime: p.end_time,
        durationHours: p.hours || 0, reason: p.reason || '',
        status: p.status as PermissionRequest['status'],
        submittedDate: p.created_at.split('T')[0],
      };
    }));

    // Mission requests
    const { data: missions } = await supabase.from('missions').select('*').order('created_at', { ascending: false });
    setMissionRequests((missions || []).map(m => {
      const info = getEmpInfo(m.employee_id);
      return {
        id: m.id, employeeId: m.employee_id,
        employeeName: info.employeeName, employeeNameAr: info.employeeNameAr,
        department: info.department, station: info.station,
        missionType: m.mission_type as MissionRequest['missionType'],
        date: m.date, destination: m.destination || '', reason: m.reason || '',
        status: m.status as MissionRequest['status'],
        submittedDate: m.created_at.split('T')[0],
      };
    }));

    // Overtime requests
    const { data: ot } = await supabase.from('overtime_requests').select('*').order('created_at', { ascending: false });
    setOvertimeRequests((ot || []).map(o => {
      const info = getEmpInfo(o.employee_id);
      return {
        id: o.id, employeeId: o.employee_id,
        employeeName: info.employeeName, employeeNameAr: info.employeeNameAr,
        department: info.department, station: info.station,
        date: o.date, hours: o.hours,
        overtimeType: 'regular' as OvertimeRequest['overtimeType'],
        reason: o.reason || '', status: o.status as OvertimeRequest['status'],
        submittedDate: o.created_at.split('T')[0],
      };
    }));

    // Leave balances - read from leave_balances table for current year
    const currentYear = new Date().getFullYear();
    const { data: dbBalances } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('year', currentYear);

    const balanceMap = new Map((dbBalances || []).map(b => [b.employee_id, b]));

    const balances: EmployeeLeaveBalance[] = (employees || []).map(e => {
      const d = e.department_id ? deptMap.get(e.department_id) : null;
      const s = e.station_id ? stMap.get(e.station_id) : null;
      const lb = balanceMap.get(e.id);
      const annualTotal = lb ? Number(lb.annual_total) : (e.annual_leave_balance || 21);
      const annualUsed = lb ? Number(lb.annual_used) : 0;
      const sickTotal = lb ? Number(lb.sick_total) : (e.sick_leave_balance || 5);
      const sickUsed = lb ? Number(lb.sick_used) : 0;
      const casualTotal = lb ? Number(lb.casual_total) : 7;
      const casualUsed = lb ? Number(lb.casual_used) : 0;
      const permissionsTotal = lb ? Number(lb.permissions_total) : 12;
      const permissionsUsed = lb ? Number(lb.permissions_used) : 0;
      return {
        employeeId: e.id, employeeCode: e.employee_code, employeeName: e.name_en, employeeNameAr: e.name_ar,
        department: d ? (language === 'ar' ? d.name_ar : d.name_en) : '',
        station: s ? (language === 'ar' ? s.name_ar : s.name_en) : '',
        hireDate: e.hire_date || '',
        annualTotal, annualUsed, annualRemaining: annualTotal - annualUsed,
        sickTotal, sickUsed, sickRemaining: sickTotal - sickUsed,
        casualTotal, casualUsed, casualRemaining: casualTotal - casualUsed,
        permissionsTotal, permissionsUsed, permissionsRemaining: permissionsTotal - permissionsUsed,
      };
    });
    setLeaveBalances(balances);

    // Employee requests (from portal)
    const { data: empReqs } = await supabase.from('employee_requests').select('id, employee_id, type_ar, type_en, reason, date, status').order('created_at', { ascending: false });
    setEmployeeRequests((empReqs || []).map((r: any) => {
      const info = getEmpInfo(r.employee_id);
      const e = empMap.get(r.employee_id);
      return {
        id: r.id, employeeId: r.employee_id,
        employeeName: info.employeeName, employeeNameAr: info.employeeNameAr,
        employeeCode: e?.employee_code || '',
        typeAr: r.type_ar, typeEn: r.type_en,
        reason: r.reason, date: r.date, status: r.status,
      };
    }));
  };

  useEffect(() => { fetchData(); }, [language]);

  // Generic filter function
  const filterRequests = <T extends { employeeId: string; employeeName: string; employeeNameAr: string }>(requests: T[]): T[] => {
    return requests.filter(r => {
      const matchSearch = !searchQuery ||
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employeeNameAr.includes(searchQuery);
      const matchDept = selectedDepartment === 'all' || empDeptMap.get(r.employeeId) === selectedDepartment;
      const matchStation = selectedStation === 'all' || empStationMap.get(r.employeeId) === selectedStation;
      return matchSearch && matchDept && matchStation;
    });
  };

  const filteredLeaves = useMemo(() => filterRequests(leaveRequests), [leaveRequests, searchQuery, selectedDepartment, selectedStation]);
  const filteredPermissions = useMemo(() => filterRequests(permissionRequests), [permissionRequests, searchQuery, selectedDepartment, selectedStation]);
  const filteredMissions = useMemo(() => filterRequests(missionRequests), [missionRequests, searchQuery, selectedDepartment, selectedStation]);
  const filteredOvertime = useMemo(() => filterRequests(overtimeRequests), [overtimeRequests, searchQuery, selectedDepartment, selectedStation]);
  const filteredBalances = useMemo(() => filterRequests(leaveBalances), [leaveBalances, searchQuery, selectedDepartment, selectedStation]);
  const filteredEmployeeRequests = useMemo(() => {
    return employeeRequests.filter(r => {
      const matchSearch = !searchQuery ||
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employeeNameAr.includes(searchQuery) ||
        r.employeeCode.includes(searchQuery);
      const matchDept = selectedDepartment === 'all' || empDeptMap.get(r.employeeId) === selectedDepartment;
      const matchStation = selectedStation === 'all' || empStationMap.get(r.employeeId) === selectedStation;
      return matchSearch && matchDept && matchStation;
    });
  }, [employeeRequests, searchQuery, selectedDepartment, selectedStation]);

  // Handlers
  const handleApproveLeave = async (id: string) => { await supabase.from('leave_requests').update({ status: 'approved' }).eq('id', id); fetchData(); };
  const handleRejectLeave = async (id: string, reason: string) => { await supabase.from('leave_requests').update({ status: 'rejected', rejection_reason: reason }).eq('id', id); fetchData(); };
  const handleApprovePermission = async (id: string) => { await supabase.from('permission_requests').update({ status: 'approved' }).eq('id', id); fetchData(); };
  const handleRejectPermission = async (id: string, _reason: string) => { await supabase.from('permission_requests').update({ status: 'rejected' }).eq('id', id); fetchData(); };
  const handleApproveMission = async (id: string) => {
    await supabase.from('missions').update({ status: 'approved' }).eq('id', id);
    const mission = missionRequests.find(r => r.id === id);
    if (mission) {
      const config = MISSION_TIME_CONFIG[mission.missionType];
      addMissionAttendance(mission.employeeId, mission.employeeName, mission.employeeNameAr, mission.department, mission.date, config.checkIn, config.checkOut, config.hours);
    }
    fetchData();
  };
  const handleRejectMission = async (id: string, _reason: string) => { await supabase.from('missions').update({ status: 'rejected' }).eq('id', id); fetchData(); };
  const handleApproveOvertime = async (id: string) => { await supabase.from('overtime_requests').update({ status: 'approved' }).eq('id', id); fetchData(); };
  const handleRejectOvertime = async (id: string, _reason: string) => { await supabase.from('overtime_requests').update({ status: 'rejected' }).eq('id', id); fetchData(); };

  const handleDeleteLeave = async (id: string) => { await supabase.from('leave_requests').delete().eq('id', id); fetchData(); };
  const handleDeletePermission = async (id: string) => { await supabase.from('permission_requests').delete().eq('id', id); fetchData(); };
  const handleDeleteMission = async (id: string) => { await supabase.from('missions').delete().eq('id', id); fetchData(); };
  const handleDeleteOvertime = async (id: string) => { await supabase.from('overtime_requests').delete().eq('id', id); fetchData(); };

  const handleEditLeave = async (data: { id: string; leaveType: string; startDate: string; endDate: string; days: number; status: string; reason: string }) => {
    const { error } = await supabase.from('leave_requests').update({
      leave_type: data.leaveType,
      start_date: data.startDate,
      end_date: data.endDate,
      days: data.days,
      status: data.status,
      reason: data.reason,
    }).eq('id', data.id);
    if (error) { toast.error(error.message); return; }
    toast.success(language === 'ar' ? 'تم تعديل الإجازة بنجاح' : 'Leave updated successfully');
    fetchData();
  };

  const handleEditPermission = async (data: { id: string; permissionType: string; date: string; fromTime: string; toTime: string; durationHours: number; status: string; reason: string }) => {
    const { error } = await supabase.from('permission_requests').update({
      permission_type: data.permissionType,
      date: data.date,
      start_time: data.fromTime,
      end_time: data.toTime,
      hours: data.durationHours,
      status: data.status,
      reason: data.reason,
    }).eq('id', data.id);
    if (error) { toast.error(error.message); return; }
    toast.success(language === 'ar' ? 'تم تعديل الإذن بنجاح' : 'Permission updated successfully');
    fetchData();
  };

  const resolveEmployeeUUID = async (employeeCode: string): Promise<string | null> => {
    const { data } = await supabase.from('employees').select('id').eq('employee_code', employeeCode).single();
    return data?.id || null;
  };

  const handleNewLeave = async (data: Omit<LeaveRequest, 'id' | 'status' | 'submittedDate'>) => {
    const uuid = await resolveEmployeeUUID(data.employeeId);
    if (!uuid) return;
    await supabase.from('leave_requests').insert({ employee_id: uuid, leave_type: data.leaveType, start_date: data.startDate, end_date: data.endDate, days: data.days, reason: data.reason });
    fetchData(); setActiveTab('leaves');
  };

  const handleNewPermission = async (data: Omit<PermissionRequest, 'id' | 'status' | 'submittedDate'>) => {
    const uuid = await resolveEmployeeUUID(data.employeeId);
    if (!uuid) return;
    const { error } = await supabase.from('permission_requests').insert({ employee_id: uuid, permission_type: data.permissionType, date: data.date, start_time: data.fromTime, end_time: data.toTime, hours: data.durationHours, reason: data.reason });
    if (error) {
      if (error.message?.includes('existing leave request')) {
        toast.error(isRTL ? 'لا يمكن طلب إذن في يوم به إجازة مسجلة بالفعل' : 'Cannot request permission on a day with an existing leave request');
      } else {
        toast.error(error.message);
      }
      return;
    }
    fetchData(); setActiveTab('permissions');
  };

  const handleNewMission = async (data: Omit<MissionRequest, 'id' | 'status' | 'submittedDate'>) => {
    const uuid = await resolveEmployeeUUID(data.employeeId);
    if (!uuid) return;
    await supabase.from('missions').insert({ employee_id: uuid, mission_type: data.missionType, date: data.date, destination: data.destination, reason: data.reason });
    fetchData(); setActiveTab('missions');
  };

  const handleNewOvertime = async (data: Omit<OvertimeRequest, 'id' | 'status' | 'submittedDate'>) => {
    const uuid = await resolveEmployeeUUID(data.employeeId);
    if (!uuid) return;
    await supabase.from('overtime_requests').insert({ employee_id: uuid, date: data.date, hours: data.hours, reason: data.reason });
    fetchData(); setActiveTab('overtime');
  };

  const pendingCount = leaveRequests.filter(r => r.status === 'pending').length +
    permissionRequests.filter(r => r.status === 'pending').length +
    missionRequests.filter(r => r.status === 'pending').length +
    overtimeRequests.filter(r => r.status === 'pending').length +
    employeeRequests.filter(r => r.status === 'pending').length;

  const showFilters = ['leaves', 'permissions', 'missions', 'overtime', 'approvals', 'balance', 'violations', 'emp-requests'].includes(activeTab);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className={cn("flex items-center justify-between mb-6", isRTL && "flex-row-reverse")}>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('leaves.title')}</h1>
            <p className="text-muted-foreground">{t('leaves.subtitle')}</p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn("grid w-full grid-cols-5 lg:grid-cols-10 mb-6")} dir="rtl">
            <TabsTrigger value="leaves" className="flex items-center gap-1.5"><FileText className="w-4 h-4" /><span className="hidden lg:inline">{t('leaves.tabs.leaves')}</span></TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /><span className="hidden lg:inline">{t('leaves.tabs.permissions')}</span></TabsTrigger>
            <TabsTrigger value="missions" className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /><span className="hidden lg:inline">{t('leaves.tabs.missions')}</span></TabsTrigger>
            <TabsTrigger value="overtime" className="flex items-center gap-1.5"><PlusCircle className="w-4 h-4" /><span className="hidden lg:inline">{t('leaves.tabs.overtime')}</span></TabsTrigger>
            <TabsTrigger value="violations" className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /><span className="hidden lg:inline">{language === 'ar' ? 'المخالفات' : 'Violations'}</span></TabsTrigger>
            <TabsTrigger value="emp-requests" className="flex items-center gap-1.5 relative"><ClipboardList className="w-4 h-4" /><span className="hidden lg:inline">{language === 'ar' ? 'الطلبات' : 'Requests'}</span>
              {employeeRequests.filter(r => r.status === 'pending').length > 0 && (<span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">{employeeRequests.filter(r => r.status === 'pending').length}</span>)}
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center gap-1.5"><Plus className="w-4 h-4" /><span className="hidden lg:inline">{t('leaves.tabs.newRequest')}</span></TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-1.5 relative"><CheckCircle className="w-4 h-4" /><span className="hidden lg:inline">{t('leaves.tabs.approvals')}</span>
              {pendingCount > 0 && (<span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendingCount}</span>)}
            </TabsTrigger>
            <TabsTrigger value="balance" className="flex items-center gap-1.5"><BarChart3 className="w-4 h-4" /><span className="hidden lg:inline">{t('leaves.tabs.balance')}</span></TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /><span className="hidden lg:inline">{t('leaves.tabs.calendar')}</span></TabsTrigger>
          </TabsList>

          {showFilters && (
            <RequestFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedDepartment={selectedDepartment}
              onDepartmentChange={setSelectedDepartment}
              selectedStation={selectedStation}
              onStationChange={setSelectedStation}
              departments={departments}
              stations={stations}
            />
          )}

          <TabsContent value="leaves"><LeaveRequestsList requests={filteredLeaves} onDelete={handleDeleteLeave} onEdit={handleEditLeave} /></TabsContent>
          <TabsContent value="permissions"><PermissionRequestsList requests={filteredPermissions} onDelete={handleDeletePermission} onEdit={handleEditPermission} /></TabsContent>
          <TabsContent value="missions"><MissionRequestsList requests={filteredMissions} onDelete={handleDeleteMission} /></TabsContent>
          <TabsContent value="overtime"><OvertimeRequestsList requests={filteredOvertime} onDelete={handleDeleteOvertime} /></TabsContent>
          <TabsContent value="new">
            <NewRequestForm onSubmitLeave={handleNewLeave} onSubmitPermission={handleNewPermission} onSubmitMission={handleNewMission} onSubmitOvertime={handleNewOvertime} />
          </TabsContent>
          <TabsContent value="approvals">
            <LeaveApprovals
              leaveRequests={filteredLeaves.filter(r => r.status === 'pending')}
              permissionRequests={filteredPermissions.filter(r => r.status === 'pending')}
              missionRequests={filteredMissions.filter(r => r.status === 'pending')}
              overtimeRequests={filteredOvertime.filter(r => r.status === 'pending')}
              onApproveLeave={handleApproveLeave} onRejectLeave={handleRejectLeave}
              onApprovePermission={handleApprovePermission} onRejectPermission={handleRejectPermission}
              onApproveMission={handleApproveMission} onRejectMission={handleRejectMission}
              onApproveOvertime={handleApproveOvertime} onRejectOvertime={handleRejectOvertime}
            />
          </TabsContent>
          <TabsContent value="violations">
            <ViolationsManagement searchQuery={searchQuery} selectedDepartment={selectedDepartment} selectedStation={selectedStation} />
          </TabsContent>
          <TabsContent value="balance"><LeaveBalanceOverview balances={filteredBalances} onRefresh={fetchData} /></TabsContent>
          <TabsContent value="calendar"><LeaveCalendar requests={filteredLeaves.filter(r => r.status === 'approved')} /></TabsContent>
          <TabsContent value="emp-requests"><EmployeeRequestsList requests={filteredEmployeeRequests} onRefresh={fetchData} /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Leaves;
