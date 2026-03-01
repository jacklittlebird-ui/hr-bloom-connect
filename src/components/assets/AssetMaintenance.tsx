import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Plus, Search, Wrench, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DbAsset {
  id: string;
  asset_code: string;
  name_ar: string;
  name_en: string;
  status: string;
}

interface MaintenanceRecord {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  type: 'preventive' | 'corrective' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  reportedDate: string;
  completedDate?: string;
  assignedTo: string;
  cost: number;
  description: string;
  resolution?: string;
}

export const AssetMaintenance = () => {
  const { t, isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const { toast } = useToast();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [allAssets, setAllAssets] = useState<DbAsset[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    assetId: '', type: 'corrective' as MaintenanceRecord['type'],
    priority: 'medium' as MaintenanceRecord['priority'], assignedTo: '', cost: 0, description: '',
  });

  const fetchAssets = useCallback(async () => {
    const { data } = await supabase.from('assets').select('id, asset_code, name_ar, name_en, status').order('asset_code');
    if (data) setAllAssets(data);
  }, []);

  const fetchMaintenance = useCallback(async () => {
    // Assets currently in maintenance
    const { data } = await supabase.from('assets').select('*').eq('status', 'maintenance');
    if (data) {
      setRecords(data.map(a => ({
        id: a.id,
        assetId: a.id,
        assetCode: a.asset_code,
        assetName: ar ? a.name_ar : a.name_en,
        type: 'corrective',
        priority: 'medium',
        status: 'in-progress' as MaintenanceRecord['status'],
        reportedDate: a.created_at?.split('T')[0] || '',
        assignedTo: a.notes || '',
        cost: 0,
        description: a.notes || '',
      })));
    }
  }, [ar]);

  useEffect(() => { fetchAssets(); fetchMaintenance(); }, [fetchAssets, fetchMaintenance]);

  // Available assets for maintenance (not retired)
  const availableForMaintenance = allAssets.filter(a => a.status !== 'retired' && a.status !== 'maintenance');

  const stats = [
    { label: t('assets.maintenance.pending'), value: records.filter(r => r.status === 'pending').length, icon: Clock, bg: 'bg-amber-100', color: 'text-amber-600' },
    { label: t('assets.maintenance.inProgress'), value: records.filter(r => r.status === 'in-progress').length, icon: Wrench, bg: 'bg-blue-100', color: 'text-blue-600' },
    { label: t('assets.maintenance.completedStat'), value: records.filter(r => r.status === 'completed').length, icon: CheckCircle, bg: 'bg-green-100', color: 'text-green-600' },
    { label: t('assets.maintenance.totalCost'), value: `${records.reduce((s, r) => s + r.cost, 0).toLocaleString()} ${t('assets.currency')}`, icon: AlertTriangle, bg: 'bg-red-100', color: 'text-red-600' },
  ];

  const filtered = records.filter(r => {
    const matchSearch = r.assetName.includes(search) || r.assetCode.includes(search) || r.assignedTo.includes(search);
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAdd = async () => {
    if (!form.assetId || !form.description) {
      toast({ title: t('assets.error'), description: t('assets.fillRequired'), variant: 'destructive' });
      return;
    }

    const asset = allAssets.find(a => a.id === form.assetId);
    if (!asset) return;

    // Update asset status to 'maintenance' in DB
    const { error } = await supabase.from('assets').update({
      status: 'maintenance',
      notes: `[${form.type}] ${form.description} | ${ar ? 'المسؤول:' : 'Assigned:'} ${form.assignedTo}`,
    }).eq('id', form.assetId);

    if (error) {
      toast({ title: t('assets.error'), description: error.message, variant: 'destructive' });
      return;
    }

    const newRecord: MaintenanceRecord = {
      id: form.assetId,
      assetId: form.assetId,
      assetCode: asset.asset_code,
      assetName: ar ? asset.name_ar : asset.name_en,
      type: form.type,
      priority: form.priority,
      status: 'in-progress',
      reportedDate: new Date().toISOString().split('T')[0],
      assignedTo: form.assignedTo,
      cost: form.cost,
      description: form.description,
    };
    setRecords(prev => [newRecord, ...prev]);
    toast({ title: t('assets.success'), description: t('assets.maintenance.created') });
    setDialogOpen(false);
    setForm({ assetId: '', type: 'corrective', priority: 'medium', assignedTo: '', cost: 0, description: '' });
    fetchAssets();
  };

  const handleStatusChange = async (id: string, status: MaintenanceRecord['status']) => {
    if (status === 'completed' || status === 'cancelled') {
      // Find the original asset status - restore to 'available' (or 'assigned' if it was assigned)
      await supabase.from('assets').update({ status: 'available', notes: '' }).eq('id', id);
    }
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status, ...(status === 'completed' ? { completedDate: new Date().toISOString().split('T')[0] } : {}) } : r));
    if (status === 'completed' || status === 'cancelled') {
      setRecords(prev => prev.filter(r => r.id !== id));
    }
    toast({ title: t('assets.success'), description: t('assets.maintenance.statusUpdated') });
    fetchAssets();
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      pending: { className: 'bg-amber-100 text-amber-700 hover:bg-amber-100', label: t('assets.maintenance.statusPending') },
      'in-progress': { className: 'bg-blue-100 text-blue-700 hover:bg-blue-100', label: t('assets.maintenance.statusInProgress') },
      completed: { className: 'bg-green-100 text-green-700 hover:bg-green-100', label: t('assets.maintenance.statusCompleted') },
      cancelled: { className: 'bg-red-100 text-red-700 hover:bg-red-100', label: t('assets.maintenance.statusCancelled') },
    };
    const s = map[status];
    return s ? <Badge className={s.className}>{s.label}</Badge> : null;
  };

  const getPriorityBadge = (priority: string) => {
    const map: Record<string, { className: string; label: string }> = {
      low: { className: 'bg-green-100 text-green-700 hover:bg-green-100', label: t('assets.maintenance.priorityLow') },
      medium: { className: 'bg-amber-100 text-amber-700 hover:bg-amber-100', label: t('assets.maintenance.priorityMedium') },
      high: { className: 'bg-orange-100 text-orange-700 hover:bg-orange-100', label: t('assets.maintenance.priorityHigh') },
      critical: { className: 'bg-red-100 text-red-700 hover:bg-red-100', label: t('assets.maintenance.priorityCritical') },
    };
    const s = map[priority];
    return s ? <Badge className={s.className}>{s.label}</Badge> : null;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                <div className={cn("p-2.5 rounded-lg", stat.bg)}><stat.icon className={cn("w-5 h-5", stat.color)} /></div>
                <div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="text-2xl font-bold">{stat.value}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className={cn("flex flex-wrap gap-3 items-center justify-between", isRTL && "flex-row-reverse")}>
            <div className={cn("flex gap-3 flex-1", isRTL && "flex-row-reverse")}>
              <div className="relative flex-1 max-w-sm">
                <Search className={cn("absolute top-2.5 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                <Input placeholder={t('assets.maintenance.search')} value={search} onChange={e => setSearch(e.target.value)} className={cn(isRTL ? "pr-9" : "pl-9")} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('assets.filter.all')}</SelectItem>
                  <SelectItem value="pending">{t('assets.maintenance.statusPending')}</SelectItem>
                  <SelectItem value="in-progress">{t('assets.maintenance.statusInProgress')}</SelectItem>
                  <SelectItem value="completed">{t('assets.maintenance.statusCompleted')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4" />{t('assets.maintenance.addRequest')}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{t('assets.maintenance.addRequest')}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  {/* Asset Selection from Registry */}
                  <div className="space-y-2">
                    <Label>{ar ? 'اختر الأصل' : 'Select Asset'}</Label>
                    <Select value={form.assetId} onValueChange={v => setForm(f => ({ ...f, assetId: v }))}>
                      <SelectTrigger><SelectValue placeholder={ar ? 'اختر أصل من السجل...' : 'Choose asset from registry...'} /></SelectTrigger>
                      <SelectContent>
                        {availableForMaintenance.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.asset_code} - {ar ? a.name_ar : a.name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>{t('assets.maintenance.type')}</Label>
                      <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as MaintenanceRecord['type'] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="preventive">{t('assets.maintenance.typePreventive')}</SelectItem>
                          <SelectItem value="corrective">{t('assets.maintenance.typeCorrective')}</SelectItem>
                          <SelectItem value="emergency">{t('assets.maintenance.typeEmergency')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>{t('assets.maintenance.priority')}</Label>
                      <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as MaintenanceRecord['priority'] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">{t('assets.maintenance.priorityLow')}</SelectItem>
                          <SelectItem value="medium">{t('assets.maintenance.priorityMedium')}</SelectItem>
                          <SelectItem value="high">{t('assets.maintenance.priorityHigh')}</SelectItem>
                          <SelectItem value="critical">{t('assets.maintenance.priorityCritical')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>{t('assets.maintenance.cost')}</Label><Input type="number" min={0} value={form.cost} onChange={e => setForm(f => ({ ...f, cost: +e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2"><Label>{t('assets.maintenance.assignedTo')}</Label><Input value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>{t('assets.maintenance.description')}</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
                  <Button onClick={handleAdd} className="w-full">{t('assets.save')}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {ar ? 'لا توجد طلبات صيانة حالياً' : 'No maintenance requests currently'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('assets.field.code')}</TableHead>
                  <TableHead>{t('assets.field.name')}</TableHead>
                  <TableHead>{t('assets.maintenance.type')}</TableHead>
                  <TableHead>{t('assets.maintenance.priority')}</TableHead>
                  <TableHead>{t('assets.maintenance.reportedDate')}</TableHead>
                  <TableHead>{t('assets.maintenance.assignedTo')}</TableHead>
                  <TableHead>{t('assets.maintenance.cost')}</TableHead>
                  <TableHead>{t('assets.field.status')}</TableHead>
                  <TableHead>{t('assets.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(record => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-sm">{record.assetCode}</TableCell>
                    <TableCell className="font-medium">{record.assetName}</TableCell>
                    <TableCell><Badge variant="outline">{t(`assets.maintenance.type${record.type.charAt(0).toUpperCase() + record.type.slice(1)}`)}</Badge></TableCell>
                    <TableCell>{getPriorityBadge(record.priority)}</TableCell>
                    <TableCell>{record.reportedDate}</TableCell>
                    <TableCell>{record.assignedTo}</TableCell>
                    <TableCell>{record.cost.toLocaleString()} {t('assets.currency')}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>
                      {record.status !== 'completed' && record.status !== 'cancelled' && (
                        <Select value={record.status} onValueChange={v => handleStatusChange(record.id, v as MaintenanceRecord['status'])}>
                          <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in-progress">{t('assets.maintenance.statusInProgress')}</SelectItem>
                            <SelectItem value="completed">{t('assets.maintenance.statusCompleted')}</SelectItem>
                            <SelectItem value="cancelled">{t('assets.maintenance.statusCancelled')}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
