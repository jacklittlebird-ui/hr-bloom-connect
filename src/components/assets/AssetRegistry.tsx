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
import { Plus, Search, Edit, Trash2, Eye, Monitor, Laptop, Smartphone, Printer, HardDrive, Package, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { supabase } from '@/integrations/supabase/client';

export interface Asset {
  id: string;
  assetCode: string;
  nameAr: string;
  nameEn: string;
  category: 'laptop' | 'desktop' | 'phone' | 'printer' | 'furniture' | 'vehicle' | 'other';
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  condition: 'new' | 'good' | 'fair' | 'poor';
  location: string;
  notes: string;
  assignedTo?: string; // employeeId
}

const initialAssets: Asset[] = [
  { id: '1', assetCode: 'AST-001', nameAr: 'لابتوب Dell Latitude', nameEn: 'Dell Latitude Laptop', category: 'laptop', brand: 'Dell', model: 'Latitude 5540', serialNumber: 'DL-2026-001', purchaseDate: '2025-06-15', purchasePrice: 25000, status: 'assigned', condition: 'good', location: 'القاهرة', notes: '', assignedTo: 'Emp001' },
  { id: '2', assetCode: 'AST-002', nameAr: 'شاشة Samsung', nameEn: 'Samsung Monitor', category: 'desktop', brand: 'Samsung', model: '27" 4K', serialNumber: 'SM-2025-045', purchaseDate: '2025-03-20', purchasePrice: 8000, status: 'available', condition: 'new', location: 'القاهرة', notes: '' },
  { id: '3', assetCode: 'AST-003', nameAr: 'طابعة HP LaserJet', nameEn: 'HP LaserJet Printer', category: 'printer', brand: 'HP', model: 'LaserJet Pro M404', serialNumber: 'HP-2024-112', purchaseDate: '2024-11-10', purchasePrice: 12000, status: 'maintenance', condition: 'fair', location: 'الإسكندرية', notes: 'بحاجة لصيانة' },
  { id: '4', assetCode: 'AST-004', nameAr: 'هاتف iPhone 15', nameEn: 'iPhone 15 Pro', category: 'phone', brand: 'Apple', model: 'iPhone 15 Pro', serialNumber: 'AP-2025-078', purchaseDate: '2025-09-01', purchasePrice: 45000, status: 'assigned', condition: 'new', location: 'القاهرة', notes: '', assignedTo: 'Emp001' },
  { id: '5', assetCode: 'AST-005', nameAr: 'مكتب خشبي', nameEn: 'Wooden Desk', category: 'furniture', brand: 'IKEA', model: 'MALM', serialNumber: 'IK-2024-033', purchaseDate: '2024-06-01', purchasePrice: 5000, status: 'assigned', condition: 'good', location: 'القاهرة', notes: '', assignedTo: 'Emp002' },
  { id: '6', assetCode: 'AST-006', nameAr: 'لابتوب Lenovo ThinkPad', nameEn: 'Lenovo ThinkPad', category: 'laptop', brand: 'Lenovo', model: 'ThinkPad X1 Carbon', serialNumber: 'LN-2025-022', purchaseDate: '2025-01-15', purchasePrice: 32000, status: 'available', condition: 'new', location: 'القاهرة', notes: '' },
  { id: '7', assetCode: 'AST-007', nameAr: 'سيارة تويوتا كورولا', nameEn: 'Toyota Corolla', category: 'vehicle', brand: 'Toyota', model: 'Corolla 2025', serialNumber: 'TY-2025-003', purchaseDate: '2025-04-01', purchasePrice: 450000, status: 'assigned', condition: 'new', location: 'القاهرة', notes: 'سيارة الإدارة', assignedTo: 'Emp004' },
  { id: '8', assetCode: 'AST-008', nameAr: 'جهاز كمبيوتر HP', nameEn: 'HP Desktop PC', category: 'desktop', brand: 'HP', model: 'ProDesk 400 G7', serialNumber: 'HP-2024-089', purchaseDate: '2024-08-20', purchasePrice: 15000, status: 'retired', condition: 'poor', location: 'القاهرة', notes: 'تم الاستغناء عنه' },
];

const emptyForm = { nameAr: '', nameEn: '', category: 'laptop' as Asset['category'], brand: '', model: '', serialNumber: '', purchaseDate: '', purchasePrice: 0, location: '', notes: '' };

export const AssetRegistry = () => {
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const { employees } = useEmployeeData();
  const [assets, setAssets] = useState<Asset[]>([]);
  const activeEmployees = employees.filter(e => e.status === 'active');

  const fetchAssets = useCallback(async () => {
    const { data } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
    if (data) {
      setAssets(data.map(a => ({
        id: a.id, assetCode: a.asset_code, nameAr: a.name_ar, nameEn: a.name_en,
        category: a.category as Asset['category'], brand: a.brand || '', model: a.model || '',
        serialNumber: a.serial_number || '', purchaseDate: a.purchase_date || '',
        purchasePrice: a.purchase_price ?? 0, status: a.status as Asset['status'],
        condition: (a.condition || 'good') as Asset['condition'], location: a.location || '',
        notes: a.notes || '', assignedTo: a.assigned_to || undefined,
      })));
    }
  }, []);

  useEffect(() => {
    fetchAssets();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') fetchAssets();
    });
    return () => subscription.unsubscribe();
  }, [fetchAssets]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState(emptyForm);

  const stats = [
    { label: t('assets.stats.total'), value: assets.length, icon: Package, bg: 'bg-primary/10', color: 'text-primary' },
    { label: t('assets.stats.available'), value: assets.filter(a => a.status === 'available').length, icon: Monitor, bg: 'bg-green-100', color: 'text-green-600' },
    { label: t('assets.stats.assigned'), value: assets.filter(a => a.status === 'assigned').length, icon: Laptop, bg: 'bg-blue-100', color: 'text-blue-600' },
    { label: t('assets.stats.maintenance'), value: assets.filter(a => a.status === 'maintenance').length, icon: HardDrive, bg: 'bg-amber-100', color: 'text-amber-600' },
  ];

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const empName = a.assignedTo ? (() => { const emp = employees.find(e => e.employeeId === a.assignedTo); return emp ? `${emp.nameAr} ${emp.nameEn}`.toLowerCase() : ''; })() : '';
    const matchSearch = !search || a.nameAr.includes(search) || a.nameEn.toLowerCase().includes(q) || a.assetCode.toLowerCase().includes(q) || a.serialNumber.toLowerCase().includes(q) || a.brand.toLowerCase().includes(q) || a.model.toLowerCase().includes(q) || a.location.toLowerCase().includes(q) || a.category.includes(q) || empName.includes(q);
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchCategory = categoryFilter === 'all' || a.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  const handleSave = async () => {
    if (!form.nameAr || !form.brand) {
      toast({ title: t('assets.error'), description: t('assets.fillRequired'), variant: 'destructive' });
      return;
    }
    const payload = {
      name_ar: form.nameAr, name_en: form.nameEn, category: form.category,
      brand: form.brand, model: form.model, serial_number: form.serialNumber,
      purchase_date: form.purchaseDate || null, purchase_price: form.purchasePrice,
      location: form.location, notes: form.notes,
      status: 'available',
    };
    if (editingAsset) {
      await supabase.from('assets').update(payload).eq('id', editingAsset.id);
      toast({ title: t('assets.success'), description: t('assets.assetUpdated') });
    } else {
      const assetCode = `AST-${String(assets.length + 1).padStart(3, '0')}`;
      await supabase.from('assets').insert({ ...payload, asset_code: assetCode, condition: 'new' });
      toast({ title: t('assets.success'), description: t('assets.assetCreated') });
    }
    await fetchAssets();
    setDialogOpen(false);
    setEditingAsset(null);
    setForm(emptyForm);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setForm({ nameAr: asset.nameAr, nameEn: asset.nameEn, category: asset.category, brand: asset.brand, model: asset.model, serialNumber: asset.serialNumber, purchaseDate: asset.purchaseDate, purchasePrice: asset.purchasePrice, location: asset.location, notes: asset.notes });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('assets').delete().eq('id', id);
    await fetchAssets();
    toast({ title: t('assets.success'), description: t('assets.assetDeleted') });
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      available: { className: 'bg-green-100 text-green-700 hover:bg-green-100', label: t('assets.status.available') },
      assigned: { className: 'bg-blue-100 text-blue-700 hover:bg-blue-100', label: t('assets.status.assigned') },
      maintenance: { className: 'bg-amber-100 text-amber-700 hover:bg-amber-100', label: t('assets.status.maintenance') },
      retired: { className: 'bg-red-100 text-red-700 hover:bg-red-100', label: t('assets.status.retired') },
    };
    const s = map[status];
    return s ? <Badge className={s.className}>{s.label}</Badge> : null;
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'laptop': return <Laptop className="w-4 h-4" />;
      case 'desktop': return <Monitor className="w-4 h-4" />;
      case 'phone': return <Smartphone className="w-4 h-4" />;
      case 'printer': return <Printer className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                <div className={cn("p-2.5 rounded-lg", stat.bg)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex flex-wrap gap-3 items-center justify-between", isRTL && "flex-row-reverse")}>
            <div className={cn("flex gap-3 flex-1 flex-wrap", isRTL && "flex-row-reverse")}>
              <div className="relative flex-1 max-w-sm">
                <Search className={cn("absolute top-2.5 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                <Input placeholder={t('assets.search')} value={search} onChange={e => setSearch(e.target.value)} className={cn(isRTL ? "pr-9" : "pl-9")} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('assets.filter.all')}</SelectItem>
                  <SelectItem value="available">{t('assets.status.available')}</SelectItem>
                  <SelectItem value="assigned">{t('assets.status.assigned')}</SelectItem>
                  <SelectItem value="maintenance">{t('assets.status.maintenance')}</SelectItem>
                  <SelectItem value="retired">{t('assets.status.retired')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('assets.filter.allCategories')}</SelectItem>
                  <SelectItem value="laptop">{t('assets.category.laptop')}</SelectItem>
                  <SelectItem value="desktop">{t('assets.category.desktop')}</SelectItem>
                  <SelectItem value="phone">{t('assets.category.phone')}</SelectItem>
                  <SelectItem value="printer">{t('assets.category.printer')}</SelectItem>
                  <SelectItem value="furniture">{t('assets.category.furniture')}</SelectItem>
                  <SelectItem value="vehicle">{t('assets.category.vehicle')}</SelectItem>
                  <SelectItem value="other">{t('assets.category.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingAsset(null); setForm(emptyForm); } }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4" />{t('assets.addAsset')}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editingAsset ? t('assets.editAsset') : t('assets.addAsset')}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>{t('assets.field.nameAr')}</Label><Input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t('assets.field.nameEn')}</Label><Input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>{t('assets.field.category')}</Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as Asset['category'] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="laptop">{t('assets.category.laptop')}</SelectItem>
                          <SelectItem value="desktop">{t('assets.category.desktop')}</SelectItem>
                          <SelectItem value="phone">{t('assets.category.phone')}</SelectItem>
                          <SelectItem value="printer">{t('assets.category.printer')}</SelectItem>
                          <SelectItem value="furniture">{t('assets.category.furniture')}</SelectItem>
                          <SelectItem value="vehicle">{t('assets.category.vehicle')}</SelectItem>
                          <SelectItem value="other">{t('assets.category.other')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>{t('assets.field.brand')}</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t('assets.field.model')}</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>{t('assets.field.serialNumber')}</Label><Input value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t('assets.field.location')}</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>{t('assets.field.purchaseDate')}</Label><Input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t('assets.field.purchasePrice')}</Label><Input type="number" min={0} value={form.purchasePrice} onChange={e => setForm(f => ({ ...f, purchasePrice: +e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2"><Label>{t('assets.field.notes')}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
                  <Button onClick={handleSave} className="w-full">{t('assets.save')}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('assets.field.code')}</TableHead>
                <TableHead>{t('assets.field.name')}</TableHead>
                <TableHead>{t('assets.field.category')}</TableHead>
                <TableHead>{t('assets.field.brand')}</TableHead>
                <TableHead>{isRTL ? 'معيّن لـ' : 'Assigned To'}</TableHead>
                <TableHead>{t('assets.field.purchasePrice')}</TableHead>
                <TableHead>{t('assets.field.condition')}</TableHead>
                <TableHead>{t('assets.field.status')}</TableHead>
                <TableHead>{t('assets.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(asset => (
                <TableRow key={asset.id}>
                  <TableCell className="font-mono text-sm">{asset.assetCode}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(asset.category)}
                      <span className="font-medium">{isRTL ? asset.nameAr : asset.nameEn}</span>
                    </div>
                  </TableCell>
                  <TableCell>{t(`assets.category.${asset.category}`)}</TableCell>
                  <TableCell>{asset.brand}</TableCell>
                  <TableCell>
                    {asset.assignedTo ? (() => {
                      const emp = employees.find(e => e.employeeId === asset.assignedTo);
                      return emp ? (isRTL ? emp.nameAr : emp.nameEn) : '-';
                    })() : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>{asset.purchasePrice.toLocaleString()} {t('assets.currency')}</TableCell>
                  <TableCell><Badge variant="outline">{t(`assets.condition.${asset.condition}`)}</Badge></TableCell>
                  <TableCell>{getStatusBadge(asset.status)}</TableCell>
                  <TableCell>
                    <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedAsset(asset); setViewDialogOpen(true); }}><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(asset)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(asset.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t('assets.assetDetails')}</DialogTitle></DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">{t('assets.field.code')}</p><p className="font-mono font-medium">{selectedAsset.assetCode}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('assets.field.status')}</p>{getStatusBadge(selectedAsset.status)}</div>
                <div><p className="text-sm text-muted-foreground">{t('assets.field.nameAr')}</p><p className="font-medium">{selectedAsset.nameAr}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('assets.field.nameEn')}</p><p className="font-medium">{selectedAsset.nameEn}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('assets.field.brand')}</p><p>{selectedAsset.brand}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('assets.field.model')}</p><p>{selectedAsset.model}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('assets.field.serialNumber')}</p><p className="font-mono">{selectedAsset.serialNumber}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('assets.field.location')}</p><p>{selectedAsset.location}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('assets.field.purchaseDate')}</p><p>{selectedAsset.purchaseDate}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('assets.field.purchasePrice')}</p><p>{selectedAsset.purchasePrice.toLocaleString()} {t('assets.currency')}</p></div>
                <div><p className="text-sm text-muted-foreground">{t('assets.field.condition')}</p><Badge variant="outline">{t(`assets.condition.${selectedAsset.condition}`)}</Badge></div>
                <div><p className="text-sm text-muted-foreground">{t('assets.field.category')}</p><p>{t(`assets.category.${selectedAsset.category}`)}</p></div>
              </div>
              {selectedAsset.notes && <div><p className="text-sm text-muted-foreground">{t('assets.field.notes')}</p><p>{selectedAsset.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
