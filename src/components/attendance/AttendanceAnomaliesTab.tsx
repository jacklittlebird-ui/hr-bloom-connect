import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Loader2, AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface AnomalyRow {
  id: string;
  employee_id: string;
  employee_code?: string | null;
  employee_name?: string | null;
  date: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: number | null;
  status: string | null;
  notes: string | null;
}

const HOUR_MS = 60 * 60 * 1000;

function classifyReason(r: AnomalyRow, ar: boolean): { kind: "open" | "auto" | "manual" | "review"; label: string; color: string } {
  const notes = r.notes || "";
  if (notes.includes("[AUTO_CLOSED]") || r.status === "auto-closed") {
    return { kind: "auto", label: ar ? "إغلاق تلقائي (مُكَبَّع 5 ساعات)" : "Auto-closed (capped 5h)", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
  }
  if (notes.includes("[MANUAL_CLOSED]") || r.status === "manually-closed") {
    return { kind: "manual", label: ar ? "إغلاق يدوي" : "Manually closed", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" };
  }
  if (notes.includes("[NEEDS_REVIEW]")) {
    return { kind: "review", label: ar ? "يحتاج مراجعة" : "Needs review", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" };
  }
  return { kind: "open", label: ar ? "مفتوح أكثر من 12 ساعة" : "Open > 12h", color: "bg-destructive/10 text-destructive border-destructive/30" };
}

export const AttendanceAnomaliesTab = () => {
  const { language } = useLanguage();
  const ar = language === "ar";
  const [rows, setRows] = useState<AnomalyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cutoffOpenIso = new Date(Date.now() - 12 * HOUR_MS).toISOString();
      // Two queries unioned client-side: anomalies (notes flags / statuses) + long-open
      const [flaggedRes, openRes] = await Promise.all([
        supabase
          .from("attendance_records")
          .select("id, employee_id, date, check_in, check_out, work_hours, status, notes")
          .or("status.eq.auto-closed,status.eq.manually-closed,notes.ilike.%[AUTO_CLOSED]%,notes.ilike.%[MANUAL_CLOSED]%,notes.ilike.%[NEEDS_REVIEW]%")
          .order("date", { ascending: false })
          .limit(300),
        supabase
          .from("attendance_records")
          .select("id, employee_id, date, check_in, check_out, work_hours, status, notes")
          .is("check_out", null)
          .not("check_in", "is", null)
          .lt("check_in", cutoffOpenIso)
          .order("check_in", { ascending: false })
          .limit(200),
      ]);

      const map = new Map<string, AnomalyRow>();
      for (const r of [...(flaggedRes.data ?? []), ...(openRes.data ?? [])]) {
        map.set(r.id as string, r as AnomalyRow);
      }
      const all = Array.from(map.values());

      // Hydrate employee names/codes
      const empIds = Array.from(new Set(all.map((r) => r.employee_id))).filter(Boolean);
      if (empIds.length) {
        const { data: emps } = await supabase
          .from("employees")
          .select("id, code, name_ar, name_en")
          .in("id", empIds);
        const ix = new Map((emps ?? []).map((e: any) => [e.id, e]));
        for (const r of all) {
          const e: any = ix.get(r.employee_id);
          r.employee_code = e?.code ?? null;
          r.employee_name = ar ? (e?.name_ar ?? e?.name_en ?? "") : (e?.name_en ?? e?.name_ar ?? "");
        }
      }
      setRows(all.sort((a, b) => (a.date < b.date ? 1 : -1)));
    } finally {
      setLoading(false);
    }
  }, [ar]);

  useEffect(() => { load(); }, [load]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          {ar ? "سجلات الحضور غير المنتظمة" : "Attendance Anomalies"}
          <Badge variant="secondary">{rows.length}</Badge>
        </CardTitle>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (ar ? "تحديث" : "Refresh")}
        </Button>
      </CardHeader>
      <CardContent>
        {loading && rows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin inline" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground flex items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            {ar ? "لا توجد سجلات تحتاج مراجعة" : "No anomalies"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-start p-2">{ar ? "الموظف" : "Employee"}</th>
                  <th className="text-start p-2">{ar ? "التاريخ" : "Date"}</th>
                  <th className="text-start p-2">{ar ? "الدخول" : "Check-in"}</th>
                  <th className="text-start p-2">{ar ? "الخروج" : "Check-out"}</th>
                  <th className="text-start p-2">{ar ? "ساعات" : "Hours"}</th>
                  <th className="text-start p-2">{ar ? "السبب" : "Reason"}</th>
                  <th className="text-start p-2">{ar ? "إجراء" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const cls = classifyReason(r, ar);
                  return (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 whitespace-pre-wrap break-words">
                        <div className="font-medium">{r.employee_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.employee_code}</div>
                      </td>
                      <td className="p-2">{r.date}</td>
                      <td className="p-2">{r.check_in ? format(new Date(r.check_in), "HH:mm") : "—"}</td>
                      <td className="p-2">{r.check_out ? format(new Date(r.check_out), "HH:mm") : "—"}</td>
                      <td className="p-2 font-semibold">{r.work_hours ?? 0}</td>
                      <td className="p-2">
                        <Badge variant="outline" className={cls.color}>{cls.label}</Badge>
                        {r.notes && (
                          <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words max-w-[280px]">
                            {r.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        {!r.check_out && <ManualCloseButton recordId={r.id} ar={ar} onClosed={load} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ManualCloseButton = ({ recordId, ar, onClosed }: { recordId: string; ar: boolean; onClosed: () => void }) => {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("5");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const h = Number(hours);
    if (!Number.isFinite(h) || h < 0.25 || h > 12) {
      toast({ title: ar ? "قيمة غير صحيحة" : "Invalid hours", description: ar ? "يجب أن تكون بين 0.25 و 12" : "Must be between 0.25 and 12", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manual-close-attendance", {
        body: { record_id: recordId, work_hours: h, reason },
      });
      if (error || (data as any)?.error) {
        toast({ title: ar ? "فشل الإغلاق" : "Close failed", description: (error?.message || (data as any)?.error) ?? "", variant: "destructive" });
        return;
      }
      toast({ title: ar ? "تم الإغلاق" : "Closed", description: ar ? `بـ ${h} ساعات` : `${h}h recorded` });
      setOpen(false);
      onClosed();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive" className="gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          {ar ? "إغلاق يدوي" : "Manual close"}
        </Button>
      </DialogTrigger>
      <DialogContent dir={ar ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{ar ? "إغلاق سجل حضور يدوياً" : "Manually close attendance record"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{ar ? "ساعات العمل المحتسبة (0.25 - 12)" : "Work hours to record (0.25 - 12)"}</Label>
            <Input type="number" min={0.25} max={12} step={0.25} value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div>
            <Label>{ar ? "سبب الإغلاق (اختياري)" : "Reason (optional)"}</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={ar ? "مثال: نسي الموظف تسجيل الخروج" : "e.g. employee forgot to check out"} />
          </div>
          <div className="text-xs text-muted-foreground">
            {ar
              ? "سيتم تسجيل العملية في سجل التدقيق (audit log) ولن يمكن إعادة احتساب الساعات بعد الإغلاق."
              : "This action is recorded in the audit log. Hours cannot be re-calculated after closing."}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            {ar ? "إلغاء" : "Cancel"}
          </Button>
          <Button variant="destructive" onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
            {ar ? "تأكيد الإغلاق" : "Confirm close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceAnomaliesTab;
