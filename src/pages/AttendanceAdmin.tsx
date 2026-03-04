import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Shield, AlertTriangle, MapPin, Plus, RefreshCw, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";

const AttendanceAdmin = () => {
  const { language } = useLanguage();
  const ar = language === "ar";

  const [events, setEvents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [employeeMap, setEmployeeMap] = useState<Record<string, { name_ar: string; name_en: string; employee_code: string }>>({});
  const [loading, setLoading] = useState(true);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name_ar: "", name_en: "", station_id: "", latitude: "", longitude: "", radius_m: "150",
  });

  const fetchAll = async () => {
    setLoading(true);
    const [eventsRes, alertsRes, locationsRes, stationsRes, empMapRes, devicesRes] = await Promise.all([
      supabase.from("attendance_events").select("*, employees(name_ar, name_en, employee_code)").order("scan_time", { ascending: false }).limit(200),
      supabase.from("device_alerts").select("*").order("triggered_at", { ascending: false }).limit(100),
      supabase.from("qr_locations").select("*, stations(name_ar, name_en)"),
      supabase.from("stations").select("id, name_ar, name_en").eq("is_active", true),
      supabase.from("user_roles").select("user_id, employee_id, employees(name_ar, name_en, employee_code)").eq("role", "employee"),
      supabase.from("user_devices").select("*"),
    ]);
    if (eventsRes.data) setEvents(eventsRes.data);
    if (alertsRes.data) setAlerts(alertsRes.data);
    if (locationsRes.data) setLocations(locationsRes.data);
    if (stationsRes.data) setStations(stationsRes.data);
    if (devicesRes.data) setDevices(devicesRes.data);
    if (empMapRes.data) {
      const map: Record<string, { name_ar: string; name_en: string; employee_code: string }> = {};
      for (const r of empMapRes.data) {
        if (r.user_id && (r as any).employees) {
          map[r.user_id] = (r as any).employees;
        }
      }
      setEmployeeMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAddLocation = async () => {
    const { error } = await supabase.from("qr_locations").insert({
      name_ar: newLocation.name_ar,
      name_en: newLocation.name_en,
      station_id: newLocation.station_id || null,
      latitude: newLocation.latitude ? parseFloat(newLocation.latitude) : null,
      longitude: newLocation.longitude ? parseFloat(newLocation.longitude) : null,
      radius_m: parseInt(newLocation.radius_m) || 150,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(ar ? "تمت إضافة الموقع" : "Location added");
      setAddLocationOpen(false);
      setNewLocation({ name_ar: "", name_en: "", station_id: "", latitude: "", longitude: "", radius_m: "150" });
      fetchAll();
    }
  };

  const alertReasonLabel = (reason: string) => {
    const labels: Record<string, { ar: string; en: string; variant: "destructive" | "secondary" }> = {
      geofence_miss: { ar: "خارج النطاق", en: "Geofence Miss", variant: "destructive" },
      shared_device_detected: { ar: "جهاز مشترك", en: "Shared Device", variant: "destructive" },
      user_has_different_device: { ar: "جهاز مختلف", en: "Different Device", variant: "secondary" },
    };
    const l = labels[reason] || { ar: reason, en: reason, variant: "secondary" as const };
    return <Badge variant={l.variant}>{ar ? l.ar : l.en}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 p-4" dir={ar ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            {ar ? "إدارة حضور QR" : "QR Attendance Admin"}
          </h1>
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="h-4 w-4 me-1" />
            {ar ? "تحديث" : "Refresh"}
          </Button>
        </div>

        <Tabs defaultValue="events" dir={ar ? "rtl" : "ltr"}>
          <TabsList>
            <TabsTrigger value="events">{ar ? "السجلات" : "Events"}</TabsTrigger>
            <TabsTrigger value="alerts">
              {ar ? "التنبيهات" : "Alerts"}
              {alerts.length > 0 && (
                <Badge variant="destructive" className="ms-1 text-xs">{alerts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="locations">{ar ? "المواقع" : "Locations"}</TabsTrigger>
            <TabsTrigger value="devices">
              <Smartphone className="h-4 w-4 me-1" />
              {ar ? "الأجهزة" : "Devices"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>{ar ? "سجلات المسح" : "Scan Events"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ar ? "الموظف" : "Employee"}</TableHead>
                        <TableHead>{ar ? "النوع" : "Type"}</TableHead>
                        <TableHead>{ar ? "الوقت" : "Time"}</TableHead>
                        <TableHead>{ar ? "الجهاز" : "Device"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((ev) => (
                        <TableRow key={ev.id}>
                          <TableCell>
                            {ar
                              ? (ev.employees as any)?.name_ar || ev.user_id?.substring(0, 8)
                              : (ev.employees as any)?.name_en || ev.user_id?.substring(0, 8)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={ev.event_type === "check_in" ? "default" : "secondary"}>
                              {ev.event_type === "check_in"
                                ? ar ? "حضور" : "In"
                                : ar ? "انصراف" : "Out"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(ev.scan_time).toLocaleString(ar ? "ar-EG" : "en-US")}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {ev.device_id?.substring(0, 12)}...
                          </TableCell>
                        </TableRow>
                      ))}
                      {events.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            {ar ? "لا توجد سجلات" : "No events yet"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  {ar ? "تنبيهات الأمان" : "Security Alerts"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ar ? "الموظف" : "Employee"}</TableHead>
                        <TableHead>{ar ? "السبب" : "Reason"}</TableHead>
                        <TableHead>{ar ? "الجهاز" : "Device"}</TableHead>
                        <TableHead>{ar ? "الوقت" : "Time"}</TableHead>
                        <TableHead>{ar ? "تفاصيل" : "Details"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map((al) => {
                        const emp = employeeMap[al.user_id];
                        return (
                        <TableRow key={al.id}>
                          <TableCell>
                            <div>{ar ? emp?.name_ar : emp?.name_en || al.user_id?.substring(0, 8)}</div>
                            {emp?.employee_code && <div className="text-xs text-muted-foreground">{emp.employee_code}</div>}
                          </TableCell>
                          <TableCell>{alertReasonLabel(al.reason)}</TableCell>
                          <TableCell className="text-xs font-mono">
                            {al.device_id?.substring(0, 12)}...
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(al.triggered_at).toLocaleString(ar ? "ar-EG" : "en-US")}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {al.meta ? JSON.stringify(al.meta) : "-"}
                          </TableCell>
                        </TableRow>
                        );
                      })}
                      {alerts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            {ar ? "لا توجد تنبيهات" : "No alerts"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {ar ? "مواقع QR" : "QR Locations"}
                </CardTitle>
                <Dialog open={addLocationOpen} onOpenChange={setAddLocationOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 me-1" />
                      {ar ? "إضافة موقع" : "Add Location"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir={ar ? "rtl" : "ltr"}>
                    <DialogHeader>
                      <DialogTitle>{ar ? "إضافة موقع جديد" : "Add New Location"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>{ar ? "الاسم بالعربي" : "Name (AR)"}</Label>
                        <Input value={newLocation.name_ar} onChange={(e) => setNewLocation({ ...newLocation, name_ar: e.target.value })} />
                      </div>
                      <div>
                        <Label>{ar ? "الاسم بالإنجليزي" : "Name (EN)"}</Label>
                        <Input value={newLocation.name_en} onChange={(e) => setNewLocation({ ...newLocation, name_en: e.target.value })} />
                      </div>
                      <div>
                        <Label>{ar ? "المحطة" : "Station"}</Label>
                        <Select value={newLocation.station_id} onValueChange={(v) => setNewLocation({ ...newLocation, station_id: v })}>
                          <SelectTrigger><SelectValue placeholder={ar ? "اختر محطة" : "Select station"} /></SelectTrigger>
                          <SelectContent>
                            {stations.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{ar ? s.name_ar : s.name_en}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>{ar ? "خط العرض" : "Latitude"}</Label>
                          <Input type="number" step="any" value={newLocation.latitude} onChange={(e) => setNewLocation({ ...newLocation, latitude: e.target.value })} />
                        </div>
                        <div>
                          <Label>{ar ? "خط الطول" : "Longitude"}</Label>
                          <Input type="number" step="any" value={newLocation.longitude} onChange={(e) => setNewLocation({ ...newLocation, longitude: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <Label>{ar ? "نطاق الجيوفنس (متر)" : "Geofence Radius (m)"}</Label>
                        <Input type="number" value={newLocation.radius_m} onChange={(e) => setNewLocation({ ...newLocation, radius_m: e.target.value })} />
                      </div>
                      <Button onClick={handleAddLocation} className="w-full">
                        {ar ? "حفظ" : "Save"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ar ? "الموقع" : "Location"}</TableHead>
                      <TableHead>{ar ? "المحطة" : "Station"}</TableHead>
                      <TableHead>{ar ? "الإحداثيات" : "Coordinates"}</TableHead>
                      <TableHead>{ar ? "النطاق" : "Radius"}</TableHead>
                      <TableHead>{ar ? "الحالة" : "Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((loc) => (
                      <TableRow key={loc.id}>
                        <TableCell>{ar ? loc.name_ar : loc.name_en}</TableCell>
                        <TableCell>
                          {ar
                            ? (loc.stations as any)?.name_ar || "-"
                            : (loc.stations as any)?.name_en || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {loc.latitude && loc.longitude
                            ? `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`
                            : "-"}
                        </TableCell>
                        <TableCell>{loc.radius_m}m</TableCell>
                        <TableCell>
                          <Badge variant={loc.is_active ? "default" : "secondary"}>
                            {loc.is_active ? (ar ? "نشط" : "Active") : (ar ? "غير نشط" : "Inactive")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {locations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {ar ? "لا توجد مواقع" : "No locations configured"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  {ar ? "أجهزة الموظفين المسجلة" : "Registered Employee Devices"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ar ? "كود الموظف" : "Employee Code"}</TableHead>
                        <TableHead>{ar ? "اسم الموظف" : "Employee Name"}</TableHead>
                        <TableHead>{ar ? "معرف الجهاز" : "Device ID"}</TableHead>
                        <TableHead>{ar ? "تاريخ الربط" : "Bound At"}</TableHead>
                        <TableHead>{ar ? "إجراء" : "Action"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.map((dev) => {
                        const emp = employeeMap[dev.user_id];
                        return (
                          <TableRow key={`${dev.user_id}-${dev.device_id}`}>
                            <TableCell className="font-mono text-sm">{emp?.employee_code || "-"}</TableCell>
                            <TableCell>{ar ? emp?.name_ar : emp?.name_en || dev.user_id?.substring(0, 8)}</TableCell>
                            <TableCell className="text-xs font-mono">{dev.device_id?.substring(0, 20)}...</TableCell>
                            <TableCell className="text-sm">
                              {new Date(dev.bound_at).toLocaleString(ar ? "ar-EG" : "en-US")}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={async () => {
                                  const confirmed = window.confirm(
                                    ar
                                      ? `هل تريد مسح جهاز ${emp?.name_ar || "هذا الموظف"}؟ سيتم تسجيل الجهاز الجديد تلقائياً عند أول تسجيل دخول.`
                                      : `Clear device for ${emp?.name_en || "this employee"}? A new device will be registered on next check-in.`
                                  );
                                  if (!confirmed) return;
                                  const { error } = await supabase
                                    .from("user_devices")
                                    .delete()
                                    .eq("user_id", dev.user_id)
                                    .eq("device_id", dev.device_id);
                                  if (error) {
                                    toast.error(error.message);
                                  } else {
                                    toast.success(ar ? "تم مسح الجهاز بنجاح" : "Device cleared successfully");
                                    fetchAll();
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 me-1" />
                                {ar ? "مسح الجهاز" : "Clear Device"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {devices.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            {ar ? "لا توجد أجهزة مسجلة" : "No registered devices"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AttendanceAdmin;
