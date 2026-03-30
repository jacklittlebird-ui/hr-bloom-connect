import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, Plane, MapPin, Plus, Edit2, Trash2, 
  Globe, Users, Clock, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Location, LocationType, sampleLocations } from '@/types/attendance';
import { supabase } from '@/integrations/supabase/client';

export const LocationManagement = () => {
  const { t, isRTL, language } = useLanguage();
  const [locations, setLocations] = useState<Location[]>(sampleLocations);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [dbStations, setDbStations] = useState<{ id: string; name_ar: string; name_en: string }[]>([]);
  const [newLocation, setNewLocation] = useState<Partial<Location>>({
    name: '',
    nameAr: '',
    code: '',
    type: 'headquarters',
    timezone: 'Africa/Cairo',
    isActive: true,
    stationIds: [],
  });

  useEffect(() => {
    const fetchStations = async () => {
      const { data } = await supabase.from('stations').select('id, name_ar, name_en').eq('is_active', true).order('name_ar');
      if (data) setDbStations(data);
    };
    fetchStations();
  }, []);

  const getLocationIcon = (type: LocationType) => {
    return type === 'airport' ? <Plane className="w-5 h-5" /> : <Building2 className="w-5 h-5" />;
  };

  const handleAddLocation = () => {
    if (!newLocation.name || !newLocation.code) return;
    
    const location: Location = {
      id: `loc-${Date.now()}`,
      name: newLocation.name,
      nameAr: newLocation.nameAr || newLocation.name,
      code: newLocation.code.toUpperCase(),
      type: newLocation.type || 'headquarters',
      timezone: newLocation.timezone || 'Africa/Cairo',
      isActive: true,
      address: newLocation.address,
      stationIds: newLocation.stationIds || [],
    };
    
    setLocations(prev => [...prev, location]);
    setNewLocation({
      name: '',
      nameAr: '',
      code: '',
      type: 'headquarters',
      timezone: 'Africa/Cairo',
      isActive: true,
      stationIds: [],
    });
    setIsAddDialogOpen(false);
  };

  const handleDeleteLocation = (locationId: string) => {
    setLocations(locations.filter(l => l.id !== locationId));
  };

  const handleToggleActive = (locationId: string) => {
    setLocations(locations.map(l => 
      l.id === locationId ? { ...l, isActive: !l.isActive } : l
    ));
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingLocation) return;
    setLocations(locations.map(l => 
      l.id === editingLocation.id ? editingLocation : l
    ));
    setIsEditDialogOpen(false);
    setEditingLocation(null);
  };

  const toggleStationId = (stationId: string, target: 'new' | 'edit') => {
    if (target === 'new') {
      const current = newLocation.stationIds || [];
      const updated = current.includes(stationId) ? current.filter(id => id !== stationId) : [...current, stationId];
      setNewLocation({ ...newLocation, stationIds: updated });
    } else if (editingLocation) {
      const current = editingLocation.stationIds || [];
      const updated = current.includes(stationId) ? current.filter(id => id !== stationId) : [...current, stationId];
      setEditingLocation({ ...editingLocation, stationIds: updated });
    }
  };

  const getStationNames = (ids?: string[]) => {
    if (!ids?.length) return [];
    return ids.map(id => dbStations.find(s => s.id === id)).filter(Boolean) as typeof dbStations;
  };

  const hqLocations = locations.filter(l => l.type === 'headquarters');
  const airportLocations = locations.filter(l => l.type === 'airport');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn("flex justify-between items-center", isRTL && "flex-row-reverse")}>
        <div>
          <h2 className="text-xl font-semibold">{t('attendance.locations.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('attendance.locations.subtitle')}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className={cn("gap-2", isRTL && "flex-row-reverse")}>
              <Plus className="w-4 h-4" />
              {t('attendance.locations.addLocation')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('attendance.locations.addLocation')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('attendance.locations.nameEn')}</Label>
                  <Input 
                    value={newLocation.name}
                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                    placeholder="Location Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('attendance.locations.nameAr')}</Label>
                  <Input 
                    value={newLocation.nameAr}
                    onChange={(e) => setNewLocation({ ...newLocation, nameAr: e.target.value })}
                    placeholder="اسم الموقع"
                    dir="rtl"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('attendance.locations.code')}</Label>
                  <Input 
                    value={newLocation.code}
                    onChange={(e) => setNewLocation({ ...newLocation, code: e.target.value.toUpperCase() })}
                    placeholder="CAI"
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('attendance.locations.type')}</Label>
                  <Select 
                    value={newLocation.type}
                    onValueChange={(v) => setNewLocation({ ...newLocation, type: v as LocationType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="headquarters">{t('attendance.locations.headquarters')}</SelectItem>
                      <SelectItem value="airport">{t('attendance.locations.airport')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>{t('attendance.locations.address')}</Label>
                <Input 
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                  placeholder="Full address"
                />
              </div>

              {/* Station Multi-Select */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'المحطات المرتبطة' : 'Linked Stations'}</Label>
                <ScrollArea className="h-[140px] border rounded-md p-2">
                  <div className="space-y-1">
                    {dbStations.map(s => (
                      <label key={s.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={(newLocation.stationIds || []).includes(s.id)}
                          onCheckedChange={() => toggleStationId(s.id, 'new')}
                        />
                        <span className="text-sm">{language === 'ar' ? s.name_ar : s.name_en}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                {(newLocation.stationIds?.length || 0) > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {getStationNames(newLocation.stationIds).map(s => (
                      <Badge key={s.id} variant="secondary" className="text-xs">{language === 'ar' ? s.name_ar : s.name_en}</Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t('attendance.locations.timezone')}</Label>
                <Select 
                  value={newLocation.timezone}
                  onValueChange={(v) => setNewLocation({ ...newLocation, timezone: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Cairo">Africa/Cairo (EET)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={handleAddLocation} className="w-full">
                {t('attendance.locations.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{hqLocations.length}</p>
                <p className="text-sm text-muted-foreground">{t('attendance.locations.headquarters')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Plane className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{airportLocations.length}</p>
                <p className="text-sm text-muted-foreground">{t('attendance.locations.airports')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{locations.filter(l => l.isActive).length}</p>
                <p className="text-sm text-muted-foreground">{t('attendance.locations.activeLocations')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Headquarters Section */}
      <div className="space-y-4">
        <h3 className={cn("text-lg font-semibold flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <Building2 className="w-5 h-5" />
          {t('attendance.locations.headquarters')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hqLocations.map((location) => (
            <Card key={location.id} className={cn(!location.isActive && "opacity-60")}>
              <CardHeader className="pb-2">
                <div className={cn("flex justify-between items-start", isRTL && "flex-row-reverse")}>
                  <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {language === 'ar' ? location.nameAr : location.name}
                      </CardTitle>
                      <Badge variant="outline" className="mt-1">{location.code}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleEditLocation(location)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Switch 
                      checked={location.isActive}
                      onCheckedChange={() => handleToggleActive(location.id)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {location.address && (
                  <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", isRTL && "flex-row-reverse")}>
                    <MapPin className="w-4 h-4" />
                    <span>{location.address}</span>
                  </div>
                )}
                <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", isRTL && "flex-row-reverse")}>
                  <Globe className="w-4 h-4" />
                  <span>{location.timezone}</span>
                </div>
                <div className={cn("flex items-center gap-2 text-sm", isRTL && "flex-row-reverse")}>
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{Math.floor(Math.random() * 50) + 20} {t('attendance.locations.employees')}</span>
                </div>
                {location.stationIds && location.stationIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                    {getStationNames(location.stationIds).map(s => (
                      <Badge key={s.id} variant="outline" className="text-[10px] px-1.5 py-0">{language === 'ar' ? s.name_ar : s.name_en}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Airports Section */}
      <div className="space-y-4">
        <h3 className={cn("text-lg font-semibold flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <Plane className="w-5 h-5" />
          {t('attendance.locations.airports')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {airportLocations.map((location) => (
            <Card key={location.id} className={cn(!location.isActive && "opacity-60")}>
              <CardHeader className="pb-2">
                <div className={cn("flex justify-between items-start", isRTL && "flex-row-reverse")}>
                  <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Plane className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {language === 'ar' ? location.nameAr : location.name}
                      </CardTitle>
                      <Badge variant="outline" className="mt-1">{location.code}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleEditLocation(location)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Switch 
                      checked={location.isActive}
                      onCheckedChange={() => handleToggleActive(location.id)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", isRTL && "flex-row-reverse")}>
                  <Globe className="w-4 h-4" />
                  <span>{location.timezone}</span>
                </div>
                <div className={cn("flex items-center gap-2 text-sm", isRTL && "flex-row-reverse")}>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="secondary">{t('attendance.locations.24hours')}</Badge>
                </div>
                <div className={cn("flex items-center gap-2 text-sm", isRTL && "flex-row-reverse")}>
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{Math.floor(Math.random() * 100) + 50} {t('attendance.locations.employees')}</span>
                </div>
                {location.coordinates && (
                  <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", isRTL && "flex-row-reverse")}>
                    <MapPin className="w-3 h-3" />
                    <span>
                      {t('attendance.locations.geofence')}: {location.coordinates.radius}m
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Edit Location Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Edit2 className="w-5 h-5" />
              {t('attendance.locations.editLocation')}
            </DialogTitle>
          </DialogHeader>
          {editingLocation && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('attendance.locations.nameEn')}</Label>
                  <Input 
                    value={editingLocation.name}
                    onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                    placeholder="Location Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('attendance.locations.nameAr')}</Label>
                  <Input 
                    value={editingLocation.nameAr}
                    onChange={(e) => setEditingLocation({ ...editingLocation, nameAr: e.target.value })}
                    placeholder="اسم الموقع"
                    dir="rtl"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('attendance.locations.code')}</Label>
                  <Input 
                    value={editingLocation.code}
                    onChange={(e) => setEditingLocation({ ...editingLocation, code: e.target.value.toUpperCase() })}
                    placeholder="CAI"
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('attendance.locations.type')}</Label>
                  <Select 
                    value={editingLocation.type}
                    onValueChange={(v) => setEditingLocation({ ...editingLocation, type: v as LocationType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="headquarters">{t('attendance.locations.headquarters')}</SelectItem>
                      <SelectItem value="airport">{t('attendance.locations.airport')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>{t('attendance.locations.address')}</Label>
                <Input 
                  value={editingLocation.address || ''}
                  onChange={(e) => setEditingLocation({ ...editingLocation, address: e.target.value })}
                  placeholder="Full address"
                />
              </div>

              {/* Station Multi-Select */}
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'المحطات المرتبطة' : 'Linked Stations'}</Label>
                <ScrollArea className="h-[140px] border rounded-md p-2">
                  <div className="space-y-1">
                    {dbStations.map(s => (
                      <label key={s.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={(editingLocation?.stationIds || []).includes(s.id)}
                          onCheckedChange={() => toggleStationId(s.id, 'edit')}
                        />
                        <span className="text-sm">{language === 'ar' ? s.name_ar : s.name_en}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                {(editingLocation?.stationIds?.length || 0) > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {getStationNames(editingLocation?.stationIds).map(s => (
                      <Badge key={s.id} variant="secondary" className="text-xs">{language === 'ar' ? s.name_ar : s.name_en}</Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t('attendance.locations.timezone')}</Label>
                <Select 
                  value={editingLocation.timezone}
                  onValueChange={(v) => setEditingLocation({ ...editingLocation, timezone: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Cairo">Africa/Cairo (EET)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSaveEdit} className="flex-1">
                  {t('attendance.locations.save')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
