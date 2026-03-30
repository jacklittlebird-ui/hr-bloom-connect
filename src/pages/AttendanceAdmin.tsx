import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle, MapPin, Plus, RefreshCw, Smartphone, Trash2, Edit2, Search } from "lucide-react";
import { toast } from "sonner";

const AttendanceAdmin = () => {
  const { language } = useLanguage();
  const ar = language === "ar";

  const [events, setEvents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [locationStationsMap, setLocationStationsMap] = useState<Record<string, string[]>>({});
  const [devices, setDevices] = useState<any[]>([]);
  const [employeeMap, setEmployeeMap] = useState<Record<string, { name_ar: string; name_en: string; employee_code: string }>>({});
  const [loading, setLoading] = useState(true);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [editLocationOpen, setEditLocationOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [newLocation, setNewLocation] = useState({
    name_ar: "", name_en: "", station_ids: [] as string[], latitude: "", longitude: "", radius_m: "150",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [alertsPage, setAlertsPage] = useState(0);
  const [eventsPage, setEventsPage] = useState(0);
  const [devicesPage, setDevicesPage] = useState(0);
  const stationLabelMap = useMemo(
    () => new Map(stations.map((station) => [station.id, ar ? station.name_ar : station.name_en])),
    [stations, ar],
  );

  const getLocationStationIds = (locationId: string, fallbackStationId?: string | null) => {
    const mappedStationIds = locationStationsMap[locationId] ?? [];
    if (mappedStationIds.length > 0) return mappedStationIds;
    return fallbackStationId ? [fallbackStationId] : [];
  };

  const toggleStationId = (selectedIds: string[], stationId: string) =>
    selectedIds.includes(stationId)
      ? selectedIds.filter((id) => id !== stationId)
      : [...selectedIds, stationId];

  const ALERTS_PER_PAGE = 20;
  const fetchAll = async () => {
    setLoading(true);
    const [eventsRes, alertsRes, locationsRes, locationStationsRes, stationsRes, empMapRes, devicesRes] = await Promise.all([
      supabase.from("attendance_events").select("*, employees(name_ar, name_en, employee_code)").order("scan_time", { ascending: false }).limit(200),
      supabase.from("device_alerts").select("*").gte("triggered_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order("triggered_at", { ascending: false }),
      supabase.from("qr_locations").select("*"),
      supabase.from("qr_location_stations").select("location_id, station_id"),
      supabase.from("stations").select("id, name_ar, name_en").eq("is_active", true),
      supabase.from("user_roles").select("user_id, employee_id, employees(name_ar, name_en, employee_code)").eq("role", "employee"),
      supabase.from("user_devices").select("*"),
    ]);
    if (eventsRes.data) setEvents(eventsRes.data);
    if (alertsRes.data) setAlerts(alertsRes.data);
    if (locationsRes.data) setLocations(locationsRes.data);
    if (locationStationsRes.data) {
      const mappedStations = locationStationsRes.data.reduce<Record<string, string[]>>((acc, row) => {
        if (!acc[row.location_id]) acc[row.location_id] = [];
        acc[row.location_id].push(row.station_id);
        return acc;
      }, {});
      setLocationStationsMap(mappedStations);
    } else {
      setLocationStationsMap({});
    }
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
    const selectedStationIds = newLocation.station_ids;
    const { data: createdLocation, error } = await supabase.from("qr_locations").insert({
      name_ar: newLocation.name_ar,
      name_en: newLocation.name_en,
      station_id: selectedStationIds[0] || null,
      latitude: newLocation.latitude ? parseFloat(newLocation.latitude) : null,
      longitude: newLocation.longitude ? parseFloat(newLocation.longitude) : null,
      radius_m: parseInt(newLocation.radius_m) || 150,
    }).select("id").single();
    if (error) {
      toast.error(error.message);
      return;
    }

    if (createdLocation && selectedStationIds.length > 0) {
      const { error: stationLinksError } = await supabase.from("qr_location_stations").insert(
        selectedStationIds.map((stationId) => ({
          location_id: createdLocation.id,
          station_id: stationId,
        })),
      );

      if (stationLinksError) {
        await supabase.from("qr_locations").delete().eq("id", createdLocation.id);
        toast.error(stationLinksError.message);
        return;
      }
    }

    toast.success(ar ? "تمت إضافة الموقع" : "Location added");
    setAddLocationOpen(false);
    setNewLocation({ name_ar: "", name_en: "", station_ids: [], latitude: "", longitude: "", radius_m: "150" });
    fetchAll();
  };

  const renderStationSelector = (selectedStationIds: string[], onToggle: (stationId: string) => void) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{ar ? "المحطات" : "Stations"}</Label>
        <span className="text-xs text-muted-foreground">
          {selectedStationIds.length
            ? ar ? `${selectedStationIds.length} محطة محددة` : `${selectedStationIds.length} selected`
            : ar ? "بدون تحديد" : "No selection"}
        </span>
      </div>
      <ScrollArea className="h-44 rounded-md border">
        <div className="space-y-1 p-3">
          {stations.map((station) => {
            const checked = selectedStationIds.includes(station.id);

            return (
              <label
                key={station.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
              >
                <Checkbox checked={checked} onCheckedChange={() => onToggle(station.id)} />
                <span className="text-sm">{ar ? station.name_ar : station.name_en}</span>
              </label>
            );
          })}

          {stations.length === 0 && (
            <p className="px-2 py-4 text-sm text-muted-foreground">
              {ar ? "لا توجد محطات متاحة" : "No stations available"}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const openEditLocation = (loc: any) => {
    setEditingLocation({
      id: loc.id,
      name_ar: loc.name_ar,
      name_en: loc.name_en,
      station_ids: getLocationStationIds(loc.id, loc.station_id),
      latitude: loc.latitude?.toString() || "",
      longitude: loc.longitude?.toString() || "",
      radius_m: loc.radius_m?.toString() || "150",
      is_active: loc.is_active,
    });
    setEditLocationOpen(true);
  };

  const handleEditLocation = async () => {
    if (!editingLocation) return;

    const selectedStationIds = editingLocation.station_ids ?? [];
    const { error: locationError } = await supabase.from("qr_locations").update({
      name_ar: editingLocation.name_ar,
      name_en: editingLocation.name_en,
      station_id: selectedStationIds[0] || null,
      latitude: editingLocation.latitude ? parseFloat(editingLocation.latitude) : null,
      longitude: editingLocation.longitude ? parseFloat(editingLocation.longitude) : null,
      radius_m: parseInt(editingLocation.radius_m) || 150,
      is_active: editingLocation.is_active,
    }).eq("id", editingLocation.id);

    if (locationError) {
      toast.error(locationError.message);
      return;
    }

    const { error: deleteLinksError } = await supabase.from("qr_location_stations").delete().eq("location_id", editingLocation.id);

    if (deleteLinksError) {
      toast.error(deleteLinksError.message);
      return;
    }

    if (selectedStationIds.length > 0) {
      const { error: insertLinksError } = await supabase.from("qr_location_stations").insert(
        selectedStationIds.map((stationId: string) => ({
          location_id: editingLocation.id,
          station_id: stationId,
        })),
      );

      if (insertLinksError) {
        toast.error(insertLinksError.message);
        return;
      }
    }

    toast.success(ar ? "تم تعديل الموقع" : "Location updated");
    setEditLocationOpen(false);
    setEditingLocation(null);
    fetchAll();
  };

  const handleDeleteLocation = async (loc: any) => {
    if (!window.confirm(ar ? `حذف الموقع "${loc.name_ar}"؟` : `Delete location "${loc.name_en}"?`)) return;

    // Clear foreign key references in attendance_events first
    const { error: clearEventsError } = await supabase
      .from("attendance_events")
      .update({ location_id: null })
      .eq("location_id", loc.id);

    if (clearEventsError) {
      toast.error(clearEventsError.message);
      return;
    }

    const { error: deleteLinksError } = await supabase.from("qr_location_stations").delete().eq("location_id", loc.id);

    if (deleteLinksError) {
      toast.error(deleteLinksError.message);
      return;
    }

    const { error: deleteLocationError } = await supabase.from("qr_locations").delete().eq("id", loc.id);

    if (deleteLocationError) {
      toast.error(deleteLocationError.message);
    } else {
      toast.success(ar ? "تم حذف الموقع" : "Location deleted");
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

        <Tabs defaultValue="events" dir={ar ? "rtl" : "ltr"} onValueChange={() => { setSearchQuery(""); setAlertsPage(0); setEventsPage(0); setDevicesPage(0); }}>
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

          {/* Search Bar */}
          <div className="relative mt-3 mb-2">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={ar ? "بحث بالاسم أو الكود أو الجهاز..." : "Search by name, code, or device..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9"
            />
          </div>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>{ar ? "سجلات المسح" : "Scan Events"}</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const locationNameMap = new Map(locations.map((loc: any) => [loc.id, ar ? loc.name_ar : loc.name_en]));
                  const filteredEvents = events.filter((ev) => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    const emp = (ev.employees as any);
                    const locName = locationNameMap.get(ev.location_id) || "";
                    return (
                      emp?.name_ar?.toLowerCase().includes(q) ||
                      emp?.name_en?.toLowerCase().includes(q) ||
                      emp?.employee_code?.toLowerCase().includes(q) ||
                      ev.device_id?.toLowerCase().includes(q) ||
                      locName.toLowerCase().includes(q)
                    );
                  });
                  // Sort by location name then by scan_time desc
                  const sortedEvents = [...filteredEvents].sort((a, b) => {
                    const locA = locationNameMap.get(a.location_id) || "zzz";
                    const locB = locationNameMap.get(b.location_id) || "zzz";
                    if (locA !== locB) return locA.localeCompare(locB, ar ? "ar" : "en");
                    return new Date(b.scan_time).getTime() - new Date(a.scan_time).getTime();
                  });
                  const totalPages = Math.ceil(sortedEvents.length / ALERTS_PER_PAGE);
                  const paged = sortedEvents.slice(eventsPage * ALERTS_PER_PAGE, (eventsPage + 1) * ALERTS_PER_PAGE);

                  return (
                    <>
                      <div className="overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{ar ? "الموظف" : "Employee"}</TableHead>
                              <TableHead>{ar ? "الموقع" : "Location"}</TableHead>
                              <TableHead>{ar ? "النوع" : "Type"}</TableHead>
                              <TableHead>{ar ? "الوقت" : "Time"}</TableHead>
                              <TableHead>{ar ? "الجهاز" : "Device"}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paged.map((ev) => (
                              <TableRow key={ev.id}>
                                <TableCell>
                                  {ar
                                    ? (ev.employees as any)?.name_ar || ev.user_id?.substring(0, 8)
                                    : (ev.employees as any)?.name_en || ev.user_id?.substring(0, 8)}
                                </TableCell>
                                <TableCell>
                                  {ev.location_id ? (
                                    <Badge variant="outline" className="gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {locationNameMap.get(ev.location_id) || "-"}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
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
                            {filteredEvents.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                  {ar ? "لا توجد سجلات" : "No events yet"}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-3 border-t">
                          <span className="text-sm text-muted-foreground">
                            {ar
                              ? `عرض ${eventsPage * ALERTS_PER_PAGE + 1}–${Math.min((eventsPage + 1) * ALERTS_PER_PAGE, filteredEvents.length)} من ${filteredEvents.length}`
                              : `Showing ${eventsPage * ALERTS_PER_PAGE + 1}–${Math.min((eventsPage + 1) * ALERTS_PER_PAGE, filteredEvents.length)} of ${filteredEvents.length}`}
                          </span>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={eventsPage === 0} onClick={() => setEventsPage((p) => p - 1)}>
                              {ar ? "السابق" : "Previous"}
                            </Button>
                            <Button variant="outline" size="sm" disabled={eventsPage >= totalPages - 1} onClick={() => setEventsPage((p) => p + 1)}>
                              {ar ? "التالي" : "Next"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
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
                {(() => {
                  const filteredAlerts = alerts.filter((al) => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    const emp = employeeMap[al.user_id];
                    return (
                      emp?.name_ar?.toLowerCase().includes(q) ||
                      emp?.name_en?.toLowerCase().includes(q) ||
                      emp?.employee_code?.toLowerCase().includes(q) ||
                      al.device_id?.toLowerCase().includes(q) ||
                      al.reason?.toLowerCase().includes(q)
                    );
                  });
                  const totalPages = Math.ceil(filteredAlerts.length / ALERTS_PER_PAGE);
                  const paged = filteredAlerts.slice(alertsPage * ALERTS_PER_PAGE, (alertsPage + 1) * ALERTS_PER_PAGE);

                  return (
                    <>
                      <div className="space-y-3">
                        {paged.map((al) => {
                          const emp = employeeMap[al.user_id];
                          return (
                            <div key={al.id} className="border rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-semibold truncate">{ar ? emp?.name_ar : emp?.name_en || al.user_id?.substring(0, 8)}</p>
                                  {emp?.employee_code && <p className="text-xs text-muted-foreground">{emp.employee_code}</p>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {alertReasonLabel(al.reason)}
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={async () => {
                                      const confirmed = window.confirm(
                                        ar
                                          ? `هل تريد مسح جهاز ${emp?.name_ar || "هذا الموظف"}؟`
                                          : `Clear device for ${emp?.name_en || "this user"}?`
                                      );
                                      if (!confirmed) return;
                                      const { error } = await supabase
                                        .from("user_devices")
                                        .delete()
                                        .eq("user_id", al.user_id)
                                        .eq("device_id", al.device_id);
                                      if (error) {
                                        toast.error(error.message);
                                      } else {
                                        toast.success(ar ? "تم مسح الجهاز بنجاح" : "Device cleared successfully");
                                        fetchAll();
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 me-1" />
                                    {ar ? "مسح" : "Clear"}
                                  </Button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="font-mono">{ar ? "الجهاز:" : "Device:"} {al.device_id?.substring(0, 12)}...</span>
                                <span>{new Date(al.triggered_at).toLocaleString(ar ? "ar-EG" : "en-US")}</span>
                              </div>
                              {al.meta && (
                                <p className="text-xs text-muted-foreground break-all">{JSON.stringify(al.meta)}</p>
                              )}
                            </div>
                          );
                        })}
                        {filteredAlerts.length === 0 && (
                          <p className="text-center text-muted-foreground py-8">
                            {ar ? "لا توجد تنبيهات" : "No alerts"}
                          </p>
                        )}
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-3 border-t">
                          <span className="text-sm text-muted-foreground">
                            {ar
                              ? `عرض ${alertsPage * ALERTS_PER_PAGE + 1}–${Math.min((alertsPage + 1) * ALERTS_PER_PAGE, filteredAlerts.length)} من ${filteredAlerts.length}`
                              : `Showing ${alertsPage * ALERTS_PER_PAGE + 1}–${Math.min((alertsPage + 1) * ALERTS_PER_PAGE, filteredAlerts.length)} of ${filteredAlerts.length}`}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={alertsPage === 0}
                              onClick={() => setAlertsPage((p) => p - 1)}
                            >
                              {ar ? "السابق" : "Previous"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={alertsPage >= totalPages - 1}
                              onClick={() => setAlertsPage((p) => p + 1)}
                            >
                              {ar ? "التالي" : "Next"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
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
                      {renderStationSelector(newLocation.station_ids, (stationId) =>
                        setNewLocation((current) => ({
                          ...current,
                          station_ids: toggleStationId(current.station_ids, stationId),
                        }))
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>{ar ? "خط العرض (Latitude)" : "Latitude"}</Label>
                          <Input type="number" step="any" placeholder={ar ? "مثال: 27.1788" : "e.g. 27.1788"} value={newLocation.latitude} onChange={(e) => setNewLocation({ ...newLocation, latitude: e.target.value })} />
                          <p className="text-xs text-muted-foreground mt-1">{ar ? "N - الإحداثي الشمالي" : "N coordinate"}</p>
                        </div>
                        <div>
                          <Label>{ar ? "خط الطول (Longitude)" : "Longitude"}</Label>
                          <Input type="number" step="any" placeholder={ar ? "مثال: 33.8069" : "e.g. 33.8069"} value={newLocation.longitude} onChange={(e) => setNewLocation({ ...newLocation, longitude: e.target.value })} />
                          <p className="text-xs text-muted-foreground mt-1">{ar ? "E - الإحداثي الشرقي" : "E coordinate"}</p>
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
                      <TableHead>{ar ? "إجراءات" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.filter((loc) => {
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        const stationNames = getLocationStationIds(loc.id, loc.station_id)
                          .map((stationId) => stationLabelMap.get(stationId)?.toLowerCase())
                          .filter(Boolean);

                        return (
                          loc.name_ar?.toLowerCase().includes(q) ||
                          loc.name_en?.toLowerCase().includes(q) ||
                          stationNames.some((stationName) => stationName?.includes(q))
                        );
                      }).sort((a, b) => {
                        const stationA = getLocationStationIds(a.id, a.station_id).map(id => stationLabelMap.get(id) || "").join(", ");
                        const stationB = getLocationStationIds(b.id, b.station_id).map(id => stationLabelMap.get(id) || "").join(", ");
                        return stationA.localeCompare(stationB, ar ? "ar" : "en");
                      }).map((loc) => (
                      <TableRow key={loc.id}>
                        <TableCell>{ar ? loc.name_ar : loc.name_en}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {getLocationStationIds(loc.id, loc.station_id).length > 0 ? (
                              getLocationStationIds(loc.id, loc.station_id).map((stationId) => (
                                <Badge key={stationId} variant="secondary" className="gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {stationLabelMap.get(stationId) || (ar ? "محطة غير معروفة" : "Unknown station")}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
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
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditLocation(loc)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteLocation(loc)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {locations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {ar ? "لا توجد مواقع" : "No locations configured"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Edit Location Dialog */}
            <Dialog open={editLocationOpen} onOpenChange={setEditLocationOpen}>
              <DialogContent dir={ar ? "rtl" : "ltr"}>
                <DialogHeader>
                  <DialogTitle>{ar ? "تعديل الموقع" : "Edit Location"}</DialogTitle>
                </DialogHeader>
                {editingLocation && (
                  <div className="space-y-3">
                    <div>
                      <Label>{ar ? "الاسم بالعربي" : "Name (AR)"}</Label>
                      <Input value={editingLocation.name_ar} onChange={(e) => setEditingLocation({ ...editingLocation, name_ar: e.target.value })} />
                    </div>
                    <div>
                      <Label>{ar ? "الاسم بالإنجليزي" : "Name (EN)"}</Label>
                      <Input value={editingLocation.name_en} onChange={(e) => setEditingLocation({ ...editingLocation, name_en: e.target.value })} />
                    </div>
                    {renderStationSelector(editingLocation.station_ids ?? [], (stationId) =>
                      setEditingLocation((current: any) => ({
                        ...current,
                        station_ids: toggleStationId(current.station_ids ?? [], stationId),
                      }))
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>{ar ? "خط العرض (Latitude)" : "Latitude"}</Label>
                        <Input type="number" step="any" placeholder={ar ? "مثال: 27.1788" : "e.g. 27.1788"} value={editingLocation.latitude} onChange={(e) => setEditingLocation({ ...editingLocation, latitude: e.target.value })} />
                        <p className="text-xs text-muted-foreground mt-1">{ar ? "N - الإحداثي الشمالي" : "N coordinate"}</p>
                      </div>
                      <div>
                        <Label>{ar ? "خط الطول (Longitude)" : "Longitude"}</Label>
                        <Input type="number" step="any" placeholder={ar ? "مثال: 33.8069" : "e.g. 33.8069"} value={editingLocation.longitude} onChange={(e) => setEditingLocation({ ...editingLocation, longitude: e.target.value })} />
                        <p className="text-xs text-muted-foreground mt-1">{ar ? "E - الإحداثي الشرقي" : "E coordinate"}</p>
                      </div>
                    </div>
                    <div>
                      <Label>{ar ? "نطاق الجيوفنس (متر)" : "Geofence Radius (m)"}</Label>
                      <Input type="number" value={editingLocation.radius_m} onChange={(e) => setEditingLocation({ ...editingLocation, radius_m: e.target.value })} />
                    </div>
                    <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                      <Checkbox
                        checked={editingLocation.is_active}
                        onCheckedChange={(checked) => setEditingLocation({ ...editingLocation, is_active: checked === true })}
                      />
                      <span className="text-sm font-medium">{ar ? "نشط" : "Active"}</span>
                    </label>
                    <Button onClick={handleEditLocation} className="w-full">
                      {ar ? "حفظ التعديلات" : "Save Changes"}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
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
                {(() => {
                  const filteredDevices = devices.filter((dev) => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    const emp = employeeMap[dev.user_id];
                    return (
                      emp?.name_ar?.toLowerCase().includes(q) ||
                      emp?.name_en?.toLowerCase().includes(q) ||
                      emp?.employee_code?.toLowerCase().includes(q) ||
                      dev.device_id?.toLowerCase().includes(q)
                    );
                  });
                  const totalPages = Math.ceil(filteredDevices.length / ALERTS_PER_PAGE);
                  const paged = filteredDevices.slice(devicesPage * ALERTS_PER_PAGE, (devicesPage + 1) * ALERTS_PER_PAGE);

                  return (
                    <>
                      <div className="space-y-3">
                        {paged.map((dev) => {
                          const emp = employeeMap[dev.user_id];
                          return (
                            <div key={`${dev.user_id}-${dev.device_id}`} className="border rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                  <p className="font-semibold truncate">{ar ? emp?.name_ar : emp?.name_en || dev.user_id?.substring(0, 8)}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{emp?.employee_code || "-"}</p>
                                </div>
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
                                  {ar ? "مسح" : "Clear"}
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="font-mono">{ar ? "الجهاز:" : "Device:"} {dev.device_id?.substring(0, 16)}...</span>
                                <span>{ar ? "الربط:" : "Bound:"} {new Date(dev.bound_at).toLocaleDateString(ar ? "ar-EG" : "en-US")}</span>
                              </div>
                            </div>
                          );
                        })}
                        {filteredDevices.length === 0 && (
                          <p className="text-center text-muted-foreground py-8">
                            {ar ? "لا توجد أجهزة مسجلة" : "No registered devices"}
                          </p>
                        )}
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-3 border-t">
                          <span className="text-sm text-muted-foreground">
                            {ar
                              ? `عرض ${devicesPage * ALERTS_PER_PAGE + 1}–${Math.min((devicesPage + 1) * ALERTS_PER_PAGE, filteredDevices.length)} من ${filteredDevices.length}`
                              : `Showing ${devicesPage * ALERTS_PER_PAGE + 1}–${Math.min((devicesPage + 1) * ALERTS_PER_PAGE, filteredDevices.length)} of ${filteredDevices.length}`}
                          </span>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={devicesPage === 0} onClick={() => setDevicesPage((p) => p - 1)}>
                              {ar ? "السابق" : "Previous"}
                            </Button>
                            <Button variant="outline" size="sm" disabled={devicesPage >= totalPages - 1} onClick={() => setDevicesPage((p) => p + 1)}>
                              {ar ? "التالي" : "Next"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AttendanceAdmin;
