import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, User, Calendar, FileText, ShieldCheck, Briefcase, PlusCircle, Clock } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { LeaveRequest, PermissionRequest, MissionRequest, OvertimeRequest } from '@/types/leaves';
import { toast } from '@/hooks/use-toast';

type UnifiedRequest = {
  id: string;
  type: 'leave' | 'permission' | 'mission' | 'overtime';
  employeeCode?: string;
  employeeName: string;
  employeeNameAr: string;
  department: string;
  reason: string;
  details: string;
  badgeLabel: string;
  badgeColor: string;
};

interface AllApprovalsProps {
  leaveRequests: LeaveRequest[];
  permissionRequests: PermissionRequest[];
  missionRequests: MissionRequest[];
  overtimeRequests: OvertimeRequest[];
  onApproveLeave: (id: string) => void;
  onRejectLeave: (id: string, reason: string) => void;
  onApprovePermission: (id: string) => void;
  onRejectPermission: (id: string, reason: string) => void;
  onApproveMission: (id: string) => void;
  onRejectMission: (id: string, reason: string) => void;
  onApproveOvertime: (id: string) => void;
  onRejectOvertime: (id: string, reason: string) => void;
}

export const LeaveApprovals = ({
  leaveRequests,
  permissionRequests,
  missionRequests,
  overtimeRequests,
  onApproveLeave,
  onRejectLeave,
  onApprovePermission,
  onRejectPermission,
  onApproveMission,
  onRejectMission,
  onApproveOvertime,
  onRejectOvertime,
}: AllApprovalsProps) => {
  const { t, isRTL, language } = useLanguage();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'leave' | 'permission' | 'mission' | 'overtime' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState<'all' | 'leave' | 'permission' | 'mission' | 'overtime'>('all');

  const unifiedRequests: UnifiedRequest[] = [
    ...leaveRequests.map((r): UnifiedRequest => ({
      id: r.id,
      type: 'leave',
      employeeCode: r.employeeCode,
      employeeName: r.employeeName,
      employeeNameAr: r.employeeNameAr,
      department: r.department,
      reason: r.reason,
      details: `${formatDate(r.startDate)} → ${formatDate(r.endDate)} (${r.days} ${t('leaves.days')})`,
      badgeLabel: t(`leaves.types.${r.leaveType}`),
      badgeColor: 'bg-blue-500',
    })),
    ...permissionRequests.map((r): UnifiedRequest => ({
      id: r.id,
      type: 'permission',
      employeeCode: r.employeeCode,
      employeeName: r.employeeName,
      employeeNameAr: r.employeeNameAr,
      department: r.department,
      reason: r.reason,
      details: `${formatDate(r.date)} | ${r.fromTime} - ${r.toTime} (${r.durationHours} ${t('leaveBalance.hours')})`,
      badgeLabel: t(`leaves.permTypes.${r.permissionType}`),
      badgeColor: 'bg-orange-500',
    })),
    ...missionRequests.map((r): UnifiedRequest => {
      const typeLabels: Record<string, { ar: string; en: string }> = {
        morning: { ar: 'مأمورية صباحية', en: 'Morning Mission' },
        evening: { ar: 'مأمورية مسائية', en: 'Evening Mission' },
        full_day: { ar: 'مأمورية يوم كامل', en: 'Full Day Mission' },
      };
      const lbl = typeLabels[r.missionType] || typeLabels.morning;
      return {
        id: r.id,
        type: 'mission',
        employeeCode: r.employeeCode,
        employeeName: r.employeeName,
        employeeNameAr: r.employeeNameAr,
        department: r.department,
        reason: r.reason,
        details: `${formatDate(r.date)}${r.destination ? ` | ${r.destination}` : ''}`,
        badgeLabel: language === 'ar' ? lbl.ar : lbl.en,
        badgeColor: 'bg-purple-500',
      };
    }),
    ...overtimeRequests.map((r): UnifiedRequest => ({
      id: r.id,
      type: 'overtime',
      employeeCode: r.employeeCode,
      employeeName: r.employeeName,
      employeeNameAr: r.employeeNameAr,
      department: r.department,
      reason: r.reason,
      details: `${formatDate(r.date)} | ${r.hours} ${t('leaveBalance.hours')}`,
      badgeLabel: t(`leaves.overtimeTypes.${r.overtimeType}`),
      badgeColor: 'bg-green-500',
    })),
  ];

  const filteredRequests = filter === 'all' ? unifiedRequests : unifiedRequests.filter(r => r.type === filter);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'leave': return <FileText className="w-4 h-4" />;
      case 'permission': return <ShieldCheck className="w-4 h-4" />;
      case 'mission': return <Briefcase className="w-4 h-4" />;
      case 'overtime': return <PlusCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { label: string; color: string }> = {
      leave: { label: t('leaves.tabs.leaves'), color: 'bg-blue-100 text-blue-700 border-blue-300' },
      permission: { label: t('leaves.tabs.permissions'), color: 'bg-orange-100 text-orange-700 border-orange-300' },
      mission: { label: t('leaves.tabs.missions'), color: 'bg-purple-100 text-purple-700 border-purple-300' },
      overtime: { label: t('leaves.tabs.overtime'), color: 'bg-green-100 text-green-700 border-green-300' },
    };
    const c = config[type] || config.leave;
    return <Badge variant="outline" className={cn("text-xs", c.color)}>{c.label}</Badge>;
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'leave': return 'border-l-blue-500';
      case 'permission': return 'border-l-orange-500';
      case 'mission': return 'border-l-purple-500';
      case 'overtime': return 'border-l-green-500';
      default: return 'border-l-primary';
    }
  };

  const handleApprove = (item: UnifiedRequest) => {
    switch (item.type) {
      case 'leave': onApproveLeave(item.id); break;
      case 'permission': onApprovePermission(item.id); break;
      case 'mission': onApproveMission(item.id); break;
      case 'overtime': onApproveOvertime(item.id); break;
    }
    toast({ title: t('leaves.approvals.approved'), description: t('leaves.approvals.approvedMessage') });
  };

  const handleRejectClick = (item: UnifiedRequest) => {
    setSelectedItem({ id: item.id, type: item.type });
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedItem && rejectionReason) {
      switch (selectedItem.type) {
        case 'leave': onRejectLeave(selectedItem.id, rejectionReason); break;
        case 'permission': onRejectPermission(selectedItem.id, rejectionReason); break;
        case 'mission': onRejectMission(selectedItem.id, rejectionReason); break;
        case 'overtime': onRejectOvertime(selectedItem.id, rejectionReason); break;
      }
      toast({ title: t('leaves.approvals.rejected'), description: t('leaves.approvals.rejectedMessage'), variant: 'destructive' });
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedItem(null);
    }
  };

  const filterButtons = [
    { key: 'all' as const, label: t('employees.filter.all'), count: unifiedRequests.length },
    { key: 'leave' as const, label: t('leaves.tabs.leaves'), count: leaveRequests.length },
    { key: 'permission' as const, label: t('leaves.tabs.permissions'), count: permissionRequests.length },
    { key: 'mission' as const, label: t('leaves.tabs.missions'), count: missionRequests.length },
    { key: 'overtime' as const, label: t('leaves.tabs.overtime'), count: overtimeRequests.length },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4", isRTL && "sm:flex-row-reverse")}>
            <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <CheckCircle className="w-5 h-5" />
              {t('leaves.approvals.title')}
              {unifiedRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unifiedRequests.length}
                </Badge>
              )}
            </CardTitle>
            <div className={cn("flex flex-wrap gap-2", isRTL && "flex-row-reverse")}>
              {filterButtons.map((btn) => (
                <Button
                  key={btn.key}
                  variant={filter === btn.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(btn.key)}
                  className="gap-1.5"
                >
                  {btn.label}
                  {btn.count > 0 && (
                    <span className={cn(
                      "text-xs rounded-full w-5 h-5 flex items-center justify-center",
                      filter === btn.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {btn.count}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('leaves.approvals.noPending')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Card key={`${request.type}-${request.id}`} className={cn("border-l-4", getBorderColor(request.type))}>
                  <CardContent className="p-4">
                    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4", isRTL && "md:flex-row-reverse")}>
                      <div className="flex-1 space-y-2">
                        <div className={cn("flex items-center gap-2 flex-wrap", isRTL && "flex-row-reverse")}>
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {language === 'ar' ? request.employeeNameAr : request.employeeName}
                          </span>
                          {request.employeeCode && (
                            <Badge variant="outline" className="text-xs font-mono">
                              {request.employeeCode}
                            </Badge>
                          )}
                          {getTypeBadge(request.type)}
                          <Badge variant="outline" className="text-xs">
                            {request.department}
                          </Badge>
                        </div>

                        <div className={cn("flex items-center gap-4 text-sm text-muted-foreground flex-wrap", isRTL && "flex-row-reverse")}>
                          <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                            {getTypeIcon(request.type)}
                            {request.details}
                          </span>
                          <Badge className={cn("text-white text-xs", request.badgeColor)}>
                            {request.badgeLabel}
                          </Badge>
                        </div>

                        <div className={cn("flex items-start gap-2 text-sm", isRTL && "flex-row-reverse")}>
                          <FileText className="w-3 h-3 mt-1 text-muted-foreground" />
                          <span>{request.reason}</span>
                        </div>
                      </div>

                      <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-success hover:bg-success/90"
                          onClick={() => handleApprove(request)}
                        >
                          <CheckCircle className={cn("w-4 h-4", isRTL ? "ml-1" : "mr-1")} />
                          {t('leaves.approvals.approve')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRejectClick(request)}
                        >
                          <XCircle className={cn("w-4 h-4", isRTL ? "ml-1" : "mr-1")} />
                          {t('leaves.approvals.reject')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('leaves.approvals.rejectTitle')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={t('leaves.approvals.rejectReasonPlaceholder')}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t('employees.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={!rejectionReason}>
              {t('leaves.approvals.confirmReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
