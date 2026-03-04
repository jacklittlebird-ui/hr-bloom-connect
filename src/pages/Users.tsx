import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ALL_MODULES, MODULE_LABELS, ModuleKey } from '@/hooks/useModulePermissions';
import {
  Plus, Search, Shield, Users as UsersIcon, UserCheck, MapPin, User,
  RefreshCw, Eye, EyeOff, Edit, Trash2, Layers, ShieldCheck, Lock, Settings2,
} from 'lucide-react';

// ========== TYPES ==========
interface SystemUser {
  user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'station_manager' | 'employee';
  station_code?: string;
  station_name?: string;
  employee_code?: string;
  created_at: string;
  permission_profile_id?: string;
  custom_modules?: string[];
}

interface PermissionProfile {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  modules: string[];
  is_system: boolean;
  created_at: string;
}

const Users = () => {
  const { language, isRTL } = useLanguage();
  const { session } = useAuth();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stations, setStations] = useState<{ id: string; code: string; name_ar: string; name_en: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; employee_code: string; name_ar: string; name_en: string }[]>([]);

  // Create user dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', role: '' as string,
    station_code: '', employee_code: '',
  });

  // Permission assignment dialog
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [permMode, setPermMode] = useState<'profile' | 'custom'>('profile');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [customModules, setCustomModules] = useState<string[]>([]);

  // Edit user dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', role: '' as string, station_code: '', employee_code: '' });
  const [saving, setSaving] = useState(false);

  // Profile management dialog
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PermissionProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    name_ar: '', name_en: '', description_ar: '', description_en: '', modules: [] as string[],
  });

  // ========== FETCH DATA ==========
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, profilesRes, stationsRes, empsRes] = await Promise.all([
        supabase.from('user_roles').select('user_id, role, station_id, employee_id'),
        supabase.from('permission_profiles' as any).select('*'),
        supabase.from('stations').select('id, code, name_ar, name_en'),
        supabase.from('employees').select('id, employee_code, name_ar, name_en'),
      ]);

      const roles = rolesRes.data || [];
      const userIds = [...new Set(roles.map(r => r.user_id))];

      const { data: profilesData } = await supabase.from('profiles').select('id, email, full_name, created_at').in('id', userIds);

      // Fetch user_module_permissions
      const { data: userPerms } = await supabase.from('user_module_permissions' as any).select('user_id, profile_id, custom_modules');

      const mapped: SystemUser[] = roles.map(r => {
        const profile = profilesData?.find(p => p.id === r.user_id);
        const station = stationsRes.data?.find(s => s.id === r.station_id);
        const emp = empsRes.data?.find(e => e.id === r.employee_id);
        const userPerm = (userPerms as any[])?.find(up => up.user_id === r.user_id);
        return {
          user_id: r.user_id,
          email: profile?.email || '',
          full_name: profile?.full_name || '',
          role: r.role as SystemUser['role'],
          station_code: station?.code,
          station_name: isAr ? station?.name_ar : station?.name_en,
          employee_code: emp?.employee_code,
          created_at: profile?.created_at || '',
          permission_profile_id: userPerm?.profile_id || undefined,
          custom_modules: userPerm?.custom_modules || undefined,
        };
      });

      setUsers(mapped);
      setProfiles((profilesRes.data as any[] || []).map((p: any) => ({
        ...p,
        modules: Array.isArray(p.modules) ? p.modules : [],
      })));
      if (stationsRes.data) setStations(stationsRes.data);
      if (empsRes.data) setEmployees(empsRes.data);
    } catch (err: any) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  }, [isAr]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ========== USER CREATION ==========
  const handleCreate = async () => {
    if (!form.full_name || !form.email || !form.password || !form.role) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (form.role === 'station_manager' && !form.station_code) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'يرجى اختيار المحطة' : 'Please select a station', variant: 'destructive' });
      return;
    }
    if (form.role === 'employee' && !form.employee_code) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'يرجى اختيار الموظف' : 'Please select an employee', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-user', {
        body: { email: form.email, password: form.password, full_name: form.full_name, role: form.role, station_code: form.station_code || undefined, employee_code: form.employee_code || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: isAr ? 'تم بنجاح' : 'Success', description: isAr ? 'تم إنشاء المستخدم بنجاح' : 'User created successfully' });
      setDialogOpen(false);
      setForm({ full_name: '', email: '', password: '', role: '', station_code: '', employee_code: '' });
      fetchAll();
    } catch (err: any) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
    }
    setCreating(false);
  };

  // ========== PERMISSION ASSIGNMENT ==========
  const openPermDialog = (user: SystemUser) => {
    setSelectedUser(user);
    if (user.custom_modules && user.custom_modules.length > 0) {
      setPermMode('custom');
      setCustomModules(user.custom_modules);
      setSelectedProfileId('');
    } else if (user.permission_profile_id) {
      setPermMode('profile');
      setSelectedProfileId(user.permission_profile_id);
      setCustomModules([]);
    } else {
      setPermMode('profile');
      setSelectedProfileId('');
      setCustomModules([]);
    }
    setPermDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    try {
      const payload: any = {
        user_id: selectedUser.user_id,
        profile_id: permMode === 'profile' && selectedProfileId ? selectedProfileId : null,
        custom_modules: permMode === 'custom' ? customModules : null,
      };

      // Upsert
      const { error } = await supabase.from('user_module_permissions' as any).upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;

      toast({ title: isAr ? 'تم حفظ الصلاحيات' : 'Permissions saved' });
      setPermDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const toggleCustomModule = (key: string) => {
    setCustomModules(prev => prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]);
  };

  // ========== PROFILE MANAGEMENT ==========
  const openAddProfile = () => {
    setEditingProfile(null);
    setProfileForm({ name_ar: '', name_en: '', description_ar: '', description_en: '', modules: [] });
    setProfileDialogOpen(true);
  };

  const openEditProfile = (profile: PermissionProfile) => {
    setEditingProfile(profile);
    setProfileForm({
      name_ar: profile.name_ar, name_en: profile.name_en,
      description_ar: profile.description_ar || '', description_en: profile.description_en || '',
      modules: [...profile.modules],
    });
    setProfileDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name_ar || !profileForm.name_en) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: isAr ? 'يرجى إدخال الاسم' : 'Enter name', variant: 'destructive' });
      return;
    }
    try {
      if (editingProfile) {
        const { error } = await supabase.from('permission_profiles' as any)
          .update({ name_ar: profileForm.name_ar, name_en: profileForm.name_en, description_ar: profileForm.description_ar, description_en: profileForm.description_en, modules: profileForm.modules })
          .eq('id', editingProfile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('permission_profiles' as any)
          .insert({ name_ar: profileForm.name_ar, name_en: profileForm.name_en, description_ar: profileForm.description_ar, description_en: profileForm.description_en, modules: profileForm.modules });
        if (error) throw error;
      }
      toast({ title: isAr ? 'تم الحفظ' : 'Saved' });
      setProfileDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      const { error } = await supabase.from('permission_profiles' as any).delete().eq('id', id);
      if (error) throw error;
      toast({ title: isAr ? 'تم الحذف' : 'Deleted' });
      fetchAll();
    } catch (err: any) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const toggleProfileModule = (key: string) => {
    setProfileForm(f => ({ ...f, modules: f.modules.includes(key) ? f.modules.filter(m => m !== key) : [...f.modules, key] }));
  };

  // ========== EDIT USER ==========
  const openEditUser = (user: SystemUser) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      station_code: user.station_code || '',
      employee_code: user.employee_code || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditUser = async () => {
    if (!editingUser || !editForm.full_name) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: editForm.full_name }).eq('id', editingUser.user_id);
      if (error) throw error;
      toast({ title: isAr ? 'تم التحديث' : 'Updated', description: isAr ? 'تم تحديث بيانات المستخدم' : 'User data updated' });
      setEditDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  // ========== DELETE USER ==========
  const handleDeleteUser = async (user: SystemUser) => {
    const confirmed = window.confirm(
      isAr
        ? `هل أنت متأكد من حذف المستخدم "${user.full_name}"؟ لا يمكن التراجع عن هذا الإجراء.`
        : `Are you sure you want to delete "${user.full_name}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: user.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: isAr ? 'تم الحذف' : 'Deleted', description: isAr ? 'تم حذف المستخدم بنجاح' : 'User deleted successfully' });
      fetchAll();
    } catch (err: any) {
      toast({ title: isAr ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // ========== HELPERS ==========
  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.includes(search.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge className="bg-primary/10 text-primary border-primary/30">{isAr ? 'مدير النظام' : 'Admin'}</Badge>;
      case 'station_manager': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">{isAr ? 'مدير محطة' : 'Station Manager'}</Badge>;
      case 'employee': return <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/30">{isAr ? 'موظف' : 'Employee'}</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4 text-primary" />;
      case 'station_manager': return <MapPin className="w-4 h-4 text-amber-600" />;
      default: return <User className="w-4 h-4 text-sky-600" />;
    }
  };

  const getProfileName = (profileId?: string) => {
    if (!profileId) return isAr ? 'بدون ملف' : 'No profile';
    const p = profiles.find(pr => pr.id === profileId);
    return p ? (isAr ? p.name_ar : p.name_en) : '-';
  };

  const adminCount = users.filter(u => u.role === 'admin').length;
  const smCount = users.filter(u => u.role === 'station_manager').length;
  const empCount = users.filter(u => u.role === 'employee').length;

  return (
    <DashboardLayout>
      <div className={cn("space-y-6", isRTL && "text-right")}>
        <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isAr ? 'إدارة المستخدمين والصلاحيات' : 'Users & Permissions'}</h1>
            <p className="text-muted-foreground">{isAr ? 'إدارة الحسابات وملفات الصلاحيات وتعيين الوصول' : 'Manage accounts, permission profiles, and access control'}</p>
          </div>
          <Button variant="outline" size="icon" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={cn("grid w-full grid-cols-2 mb-6", isRTL && "direction-rtl")}>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              <span>{isAr ? 'المستخدمين' : 'Users'}</span>
            </TabsTrigger>
            <TabsTrigger value="profiles" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>{isAr ? 'ملفات الصلاحيات' : 'Permission Profiles'}</span>
            </TabsTrigger>
          </TabsList>

          {/* ========== USERS TAB ========== */}
          <TabsContent value="users" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><UsersIcon className="w-5 h-5 text-primary" /></div>
                <div><p className="text-2xl font-bold">{users.length}</p><p className="text-xs text-muted-foreground">{isAr ? 'إجمالي المستخدمين' : 'Total Users'}</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Shield className="w-5 h-5 text-primary" /></div>
                <div><p className="text-2xl font-bold">{adminCount}</p><p className="text-xs text-muted-foreground">{isAr ? 'مديرو النظام' : 'Admins'}</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10"><MapPin className="w-5 h-5 text-amber-600" /></div>
                <div><p className="text-2xl font-bold">{smCount}</p><p className="text-xs text-muted-foreground">{isAr ? 'مديرو المحطات' : 'Station Managers'}</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-500/10"><UserCheck className="w-5 h-5 text-sky-600" /></div>
                <div><p className="text-2xl font-bold">{empCount}</p><p className="text-xs text-muted-foreground">{isAr ? 'الموظفون' : 'Employees'}</p></div>
              </CardContent></Card>
            </div>

            {/* Search + Add */}
            <div className={cn("flex gap-4 items-center", isRTL && "flex-row-reverse")}>
              <div className="relative flex-1 max-w-md">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                <Input placeholder={isAr ? 'بحث عن مستخدم...' : 'Search users...'} value={search} onChange={e => setSearch(e.target.value)} className={cn(isRTL ? "pr-10" : "pl-10")} />
              </div>
              <Button onClick={() => setDialogOpen(true)} className={cn("gap-2", isRTL && "flex-row-reverse")}>
                <Plus className="w-4 h-4" /> {isAr ? 'إضافة مستخدم' : 'Add User'}
              </Button>
            </div>

            {/* Users Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isAr ? 'المستخدم' : 'User'}</TableHead>
                      <TableHead>{isAr ? 'البريد' : 'Email'}</TableHead>
                      <TableHead>{isAr ? 'الدور' : 'Role'}</TableHead>
                      <TableHead>{isAr ? 'ملف الصلاحيات' : 'Permission Profile'}</TableHead>
                      <TableHead>{isAr ? 'التفاصيل' : 'Details'}</TableHead>
                      <TableHead>{isAr ? 'الإجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                        {isAr ? 'جاري التحميل...' : 'Loading...'}
                      </TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد نتائج' : 'No results'}</TableCell></TableRow>
                    ) : filtered.map(user => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                            {getRoleIcon(user.role)}
                            <span className="font-medium">{user.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell dir="ltr" className="text-left">{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.role === 'admin' ? (
                            <Badge variant="outline" className="gap-1"><Lock className="w-3 h-3" />{isAr ? 'وصول كامل' : 'Full Access'}</Badge>
                          ) : user.custom_modules && user.custom_modules.length > 0 ? (
                            <Badge variant="secondary" className="gap-1"><Settings2 className="w-3 h-3" />{isAr ? 'مخصص' : 'Custom'} ({user.custom_modules.length})</Badge>
                          ) : (
                            <Badge variant="outline">{getProfileName(user.permission_profile_id)}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.role === 'station_manager' && user.station_name && (
                            <Badge variant="outline" className="gap-1"><MapPin className="w-3 h-3" />{user.station_name}</Badge>
                          )}
                          {user.role === 'employee' && user.employee_code && (
                            <Badge variant="outline">{user.employee_code}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                            <Button variant="ghost" size="sm" onClick={() => openEditUser(user)} className="gap-1">
                              <Edit className="w-4 h-4" />
                              {isAr ? 'تعديل' : 'Edit'}
                            </Button>
                            {user.role !== 'admin' && (user.permission_profile_id || (user.custom_modules && user.custom_modules.length > 0)) ? (
                              <Button variant="ghost" size="sm" onClick={() => openPermDialog(user)} className="gap-1">
                                <Shield className="w-4 h-4" />
                                {isAr ? 'الصلاحيات' : 'Permissions'}
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => openPermDialog(user)} className="gap-1" disabled={user.role === 'admin'}>
                                <Shield className="w-4 h-4" />
                                {user.role === 'admin' ? (isAr ? 'وصول كامل' : 'Full Access') : (isAr ? 'صلاحيات' : 'Permissions')}
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user)} className="gap-1 text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                              {isAr ? 'حذف' : 'Delete'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== PROFILES TAB ========== */}
          <TabsContent value="profiles" className="space-y-6">
            <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
              <div>
                <h2 className="text-xl font-semibold">{isAr ? 'ملفات الصلاحيات' : 'Permission Profiles'}</h2>
                <p className="text-sm text-muted-foreground">{isAr ? 'قوالب صلاحيات جاهزة يمكن تعيينها للمستخدمين' : 'Pre-built permission templates assignable to users'}</p>
              </div>
              <Button onClick={openAddProfile} className={cn("gap-2", isRTL && "flex-row-reverse")}>
                <Plus className="w-4 h-4" /> {isAr ? 'إضافة ملف' : 'Add Profile'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map(profile => {
                const assignedCount = users.filter(u => u.permission_profile_id === profile.id).length;
                return (
                  <Card key={profile.id} className={profile.is_system ? 'border-primary/30' : ''}>
                    <CardHeader className="pb-3">
                      <div className={cn("flex items-start justify-between", isRTL && "flex-row-reverse")}>
                        <div className="space-y-1">
                          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                            <CardTitle className="text-lg">{isAr ? profile.name_ar : profile.name_en}</CardTitle>
                            {profile.is_system && <Badge variant="outline" className="text-xs">{isAr ? 'نظام' : 'System'}</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{isAr ? profile.description_ar : profile.description_en}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEditProfile(profile)}><Edit className="w-4 h-4" /></Button>
                          {!profile.is_system && (
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteProfile(profile.id)}><Trash2 className="w-4 h-4" /></Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className={cn("flex items-center gap-3 mb-3", isRTL && "flex-row-reverse")}>
                        <Badge variant="outline"><UsersIcon className="w-3 h-3 mr-1" />{assignedCount} {isAr ? 'مستخدم' : 'users'}</Badge>
                        <Badge variant="secondary">{profile.modules.length} {isAr ? 'قسم' : 'modules'}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {profile.modules.slice(0, 6).map(m => (
                          <Badge key={m} variant="outline" className="text-xs">
                            {isAr ? MODULE_LABELS[m as ModuleKey]?.ar : MODULE_LABELS[m as ModuleKey]?.en || m}
                          </Badge>
                        ))}
                        {profile.modules.length > 6 && <Badge variant="secondary" className="text-xs">+{profile.modules.length - 6}</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* ========== EDIT USER DIALOG ========== */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isAr ? 'تعديل بيانات المستخدم' : 'Edit User'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{isAr ? 'الاسم الكامل' : 'Full Name'} *</Label>
                <Input
                  value={editForm.full_name}
                  onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                  disabled={editForm.role === 'employee' && !!editForm.employee_code}
                />
              </div>
              <div>
                <Label>{isAr ? 'البريد الإلكتروني' : 'Email'}</Label>
                <Input value={editForm.email} disabled dir="ltr" className="text-left bg-muted" />
              </div>
              <div>
                <Label>{isAr ? 'الدور' : 'Role'}</Label>
                <Input
                  value={editForm.role === 'admin' ? (isAr ? 'مدير النظام' : 'Admin') : editForm.role === 'station_manager' ? (isAr ? 'مدير محطة' : 'Station Manager') : (isAr ? 'موظف' : 'Employee')}
                  disabled
                  className="bg-muted"
                />
              </div>
              {editForm.role === 'station_manager' && (
                <div>
                  <Label>{isAr ? 'المحطة' : 'Station'}</Label>
                  <Input
                    value={(() => {
                      const st = stations.find(s => s.code === editForm.station_code);
                      return st ? (isAr ? st.name_ar : st.name_en) : editForm.station_code;
                    })()}
                    disabled
                    className="bg-muted"
                  />
                </div>
              )}
              {editForm.role === 'employee' && (
                <div>
                  <Label>{isAr ? 'الموظف' : 'Employee'}</Label>
                  <Select value={editForm.employee_code} onValueChange={v => {
                    const emp = employees.find(e => e.employee_code === v);
                    setEditForm(f => ({
                      ...f,
                      employee_code: v,
                      full_name: emp ? (isAr ? emp.name_ar : emp.name_en) : f.full_name,
                    }));
                  }}>
                    <SelectTrigger><SelectValue placeholder={isAr ? 'اختر الموظف' : 'Select employee'} /></SelectTrigger>
                    <SelectContent>
                      {employees.map(e => (<SelectItem key={e.employee_code} value={e.employee_code}>{e.employee_code} — {isAr ? e.name_ar : e.name_en}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={handleEditUser} disabled={saving}>{saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isAr ? 'إنشاء مستخدم جديد' : 'Create New User'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{isAr ? 'الاسم الكامل' : 'Full Name'} *</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder={isAr ? 'مثال: أحمد محمد' : 'e.g. Ahmed Mohamed'} disabled={form.role === 'employee' && !!form.employee_code} />
              </div>
              <div>
                <Label>{isAr ? 'البريد الإلكتروني' : 'Email'} *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} dir="ltr" placeholder="user@company.com" />
              </div>
              <div>
                <Label>{isAr ? 'كلمة المرور' : 'Password'} *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    dir="ltr" placeholder={isAr ? '6 أحرف على الأقل' : 'Min 6 characters'} className="pe-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground", isRTL ? "left-3" : "right-3")}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>{isAr ? 'الدور' : 'Role'} *</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v, station_code: '', employee_code: '' }))}>
                  <SelectTrigger><SelectValue placeholder={isAr ? 'اختر الدور' : 'Select role'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin"><span className="flex items-center gap-2"><Shield className="w-4 h-4" /> {isAr ? 'مدير النظام' : 'Admin'}</span></SelectItem>
                    <SelectItem value="station_manager"><span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {isAr ? 'مدير محطة' : 'Station Manager'}</span></SelectItem>
                    <SelectItem value="employee"><span className="flex items-center gap-2"><User className="w-4 h-4" /> {isAr ? 'موظف' : 'Employee'}</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.role === 'station_manager' && (
                <div>
                  <Label>{isAr ? 'المحطة' : 'Station'} *</Label>
                  <Select value={form.station_code} onValueChange={v => setForm(f => ({ ...f, station_code: v }))}>
                    <SelectTrigger><SelectValue placeholder={isAr ? 'اختر المحطة' : 'Select station'} /></SelectTrigger>
                    <SelectContent>
                      {stations.map(s => (<SelectItem key={s.code} value={s.code}>{isAr ? s.name_ar : s.name_en}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.role === 'employee' && (
                <div>
                  <Label>{isAr ? 'اختر الموظف' : 'Select Employee'} *</Label>
                  <Select value={form.employee_code} onValueChange={v => {
                    const emp = employees.find(e => e.employee_code === v);
                    setForm(f => ({
                      ...f,
                      employee_code: v,
                      full_name: emp ? (isAr ? emp.name_ar : emp.name_en) : f.full_name,
                    }));
                  }}>
                    <SelectTrigger><SelectValue placeholder={isAr ? 'اختر الموظف' : 'Select employee'} /></SelectTrigger>
                    <SelectContent>
                      {employees.map(e => (<SelectItem key={e.employee_code} value={e.employee_code}>{e.employee_code} — {isAr ? e.name_ar : e.name_en}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (isAr ? 'جاري الإنشاء...' : 'Creating...') : (isAr ? 'إنشاء الحساب' : 'Create Account')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========== PERMISSION ASSIGNMENT DIALOG ========== */}
        <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <Shield className="w-5 h-5" />
                {isAr ? 'تعيين صلاحيات' : 'Assign Permissions'} — {selectedUser?.full_name}
              </DialogTitle>
            </DialogHeader>

            {selectedUser?.role === 'admin' ? (
              <div className="text-center py-6">
                <Lock className="w-12 h-12 mx-auto mb-3 text-primary opacity-50" />
                <p className="text-muted-foreground">{isAr ? 'مدير النظام لديه وصول كامل لجميع الأقسام' : 'Admin has full access to all modules'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mode selection */}
                <div className="space-y-2">
                  <Label>{isAr ? 'نوع الصلاحيات' : 'Permission Type'}</Label>
                  <div className={cn("flex gap-3", isRTL && "flex-row-reverse")}>
                    <Button variant={permMode === 'profile' ? 'default' : 'outline'} size="sm" onClick={() => setPermMode('profile')} className="gap-1">
                      <Layers className="w-4 h-4" /> {isAr ? 'ملف جاهز' : 'Profile'}
                    </Button>
                    <Button variant={permMode === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => setPermMode('custom')} className="gap-1">
                      <Settings2 className="w-4 h-4" /> {isAr ? 'مخصص' : 'Custom'}
                    </Button>
                  </div>
                </div>

                {permMode === 'profile' ? (
                  <div className="space-y-2">
                    <Label>{isAr ? 'اختر ملف الصلاحيات' : 'Select Permission Profile'}</Label>
                    <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                      <SelectTrigger><SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} /></SelectTrigger>
                      <SelectContent>
                        {profiles.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {isAr ? p.name_ar : p.name_en} ({p.modules.length} {isAr ? 'قسم' : 'modules'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedProfileId && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">{isAr ? 'الأقسام المتاحة:' : 'Available modules:'}</p>
                        <div className="flex flex-wrap gap-1">
                          {profiles.find(p => p.id === selectedProfileId)?.modules.map(m => (
                            <Badge key={m} variant="outline" className="text-xs">
                              {isAr ? MODULE_LABELS[m as ModuleKey]?.ar : MODULE_LABELS[m as ModuleKey]?.en || m}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                      <Label>{isAr ? 'الأقسام المتاحة' : 'Available Modules'}</Label>
                      <div className="flex gap-2">
                        <Button variant="link" size="sm" onClick={() => setCustomModules([...ALL_MODULES])}>{isAr ? 'تحديد الكل' : 'Select All'}</Button>
                        <Button variant="link" size="sm" onClick={() => setCustomModules([])}>{isAr ? 'إلغاء الكل' : 'Deselect All'}</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto border rounded-lg p-3">
                      {ALL_MODULES.map(moduleKey => (
                        <label key={moduleKey} className={cn("flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded", isRTL && "flex-row-reverse")}>
                          <Checkbox
                            checked={customModules.includes(moduleKey)}
                            onCheckedChange={() => toggleCustomModule(moduleKey)}
                          />
                          <span className="text-sm">{isAr ? MODULE_LABELS[moduleKey].ar : MODULE_LABELS[moduleKey].en}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setPermDialogOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              {selectedUser?.role !== 'admin' && (
                <Button onClick={handleSavePermissions}>{isAr ? 'حفظ الصلاحيات' : 'Save Permissions'}</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========== PROFILE MANAGEMENT DIALOG ========== */}
        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProfile ? (isAr ? 'تعديل ملف الصلاحيات' : 'Edit Permission Profile') : (isAr ? 'إضافة ملف صلاحيات' : 'Add Permission Profile')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{isAr ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label><Input value={profileForm.name_ar} onChange={e => setProfileForm(f => ({ ...f, name_ar: e.target.value }))} dir="rtl" /></div>
                <div><Label>{isAr ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label><Input value={profileForm.name_en} onChange={e => setProfileForm(f => ({ ...f, name_en: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{isAr ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label><Input value={profileForm.description_ar} onChange={e => setProfileForm(f => ({ ...f, description_ar: e.target.value }))} dir="rtl" /></div>
                <div><Label>{isAr ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label><Input value={profileForm.description_en} onChange={e => setProfileForm(f => ({ ...f, description_en: e.target.value }))} /></div>
              </div>
              <div>
                <div className={cn("flex items-center justify-between mb-2", isRTL && "flex-row-reverse")}>
                  <Label>{isAr ? 'الأقسام المتاحة' : 'Available Modules'}</Label>
                  <div className="flex gap-2">
                    <Button variant="link" size="sm" onClick={() => setProfileForm(f => ({ ...f, modules: [...ALL_MODULES] }))}>{isAr ? 'تحديد الكل' : 'Select All'}</Button>
                    <Button variant="link" size="sm" onClick={() => setProfileForm(f => ({ ...f, modules: [] }))}>{isAr ? 'إلغاء الكل' : 'Deselect All'}</Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto border rounded-lg p-3">
                  {ALL_MODULES.map(moduleKey => (
                    <label key={moduleKey} className={cn("flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded", isRTL && "flex-row-reverse")}>
                      <Checkbox
                        checked={profileForm.modules.includes(moduleKey)}
                        onCheckedChange={() => toggleProfileModule(moduleKey)}
                      />
                      <span className="text-sm">{isAr ? MODULE_LABELS[moduleKey].ar : MODULE_LABELS[moduleKey].en}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={handleSaveProfile}>{isAr ? 'حفظ' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Users;
