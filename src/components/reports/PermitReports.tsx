import { useMemo, useRef, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { Employee } from '@/types/employee';
import { StationCombobox, StationOption } from '@/components/vehicles/StationCombobox';

const formatDate = (d?: string) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${dt.getFullYear()}`;
};

export const PermitReports = () => {
  const { employees, ensureFullEmployee } = useEmployeeData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [full, setFull] = useState<Employee | undefined>(undefined);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!selectedId) { setFull(undefined); return; }
    ensureFullEmployee(selectedId).then((emp) => {
      if (!cancelled) setFull(emp);
    });
    return () => { cancelled = true; };
  }, [selectedId, ensureFullEmployee]);

  const options: StationOption[] = useMemo(() =>
    employees
      .slice()
      .sort((a, b) => (a.nameAr || '').localeCompare(b.nameAr || '', 'ar'))
      .map((e) => ({
        id: e.id,
        name_ar: `${e.nameAr} (${e.employeeId})`,
        name_en: `${e.nameEn || e.nameAr} (${e.employeeId})`,
        code: e.stationName || '',
      })),
    [employees]);

  const emp = full;

  const handlePrint = () => {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) return;
    w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>نموذج 1 تصاريح</title>
      <style>
        @page { size: A4; margin: 14mm; }
        body { font-family: 'Baloo Bhaijaan 2', 'Arial', sans-serif; color: #000; }
        .permit-form { font-size: 13px; line-height: 1.9; }
        .permit-form h1, .permit-form h2 { text-align:center; margin: 4px 0; }
        .permit-form .row { display:flex; justify-content:space-between; gap:24px; margin: 6px 0; }
        .permit-form .field { flex:1; border-bottom: 1px dotted #000; padding: 2px 4px; min-height: 24px; }
        .permit-form .label { font-weight: 700; }
        .permit-form table { width:100%; border-collapse: collapse; margin-top: 8px; }
        .permit-form th, .permit-form td { border: 1px solid #000; padding: 6px 8px; text-align: right; }
        .permit-form .photo { width: 120px; height: 150px; border: 1px solid #000; object-fit: cover; }
        .permit-form .photo-box { width: 120px; height: 150px; border: 1px solid #000; display:flex; align-items:center; justify-content:center; font-size: 11px; color:#666; text-align:center; }
        .permit-form .header { display:flex; justify-content:space-between; align-items:flex-start; }
        .permit-form ul { padding-right: 18px; }
      </style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium">اختر الموظف:</span>
            <StationCombobox
              stations={options}
              value={selectedId}
              onChange={setSelectedId}
              isAr={true}
              placeholder="ابحث عن الموظف..."
              className="min-w-[320px]"
            />
          </div>
          <Button onClick={handlePrint} disabled={!emp} size="sm">
            <Printer className="w-4 h-4 ml-2" />
            طباعة النموذج
          </Button>
        </CardContent>
      </Card>

      {!emp && (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          اختر موظفاً لعرض نموذج "1" تصاريح مطار القاهرة الجوي
        </CardContent></Card>
      )}

      {emp && (
        <Card>
          <CardContent className="p-6">
            <div ref={printRef} dir="rtl">
              <div className="permit-form" style={{ fontFamily: "'Baloo Bhaijaan 2', Arial, sans-serif", color: '#000', fontSize: 13, lineHeight: 1.9 }}>
                <div className="header">
                  <div style={{ fontWeight: 700 }}>
                    نموذج رقم "1" تصاريح<br />
                    الرقم المسلسل بالكشف ( )
                  </div>
                  <div style={{ textAlign: 'center', fontWeight: 700 }}>
                    وزارة الداخلية<br />
                    الإدارة العامة لشرطة ميناء القاهرة الجوي
                  </div>
                  {emp.avatar ? (
                    <img className="photo" src={emp.avatar} alt={emp.nameAr} />
                  ) : (
                    <div className="photo-box">صورة 4×6</div>
                  )}
                </div>

                <ul style={{ marginTop: 8 }}>
                  <li>تحرر الإستمارة من أصل وصورتين.</li>
                  <li>ترفق بالإستمارة عدد 1 صورة فوتوغرافية 4×6.</li>
                  <li>صورة البطاقة (الشخصية/العائلية) أو جواز السفر.</li>
                  <li>صورة عقد العمل والتأمينات الإجتماعية بالنسبة للقطاع الخاص.</li>
                </ul>

                <h2 style={{ marginTop: 14 }}>طلب استخراج/تجديد تصريح جمركي مستديم/مؤقت</h2>
                <h2>لدخول الدائرة الجمركية بميناء القاهرة الجوي</h2>

                <div className="row" style={{ marginTop: 10 }}>
                  <div><span className="label">اسم الجهة الطالبة: </span>لينك أيرو تريدنج أجنسي</div>
                </div>

                <div style={{ fontWeight: 700, marginTop: 6 }}>السيد اللواء / مدير الإدارة العامة لشرطة ميناء القاهرة الجوي</div>
                <div style={{ textAlign: 'center', fontWeight: 700 }}>تحية طيبة وبعد،،،</div>
                <p>
                  برجاء التكرم بالموافقة على استخراج تصريح جمركي (مستديم/مؤقت) لدخول الدائرة الجمركية بميناء القاهرة الجوي
                  حيث أن طبيعة عمله تقتضي تواجده بالدائرة الجمركية بصفة مستمرة ومنتظمة طبقًا للبيانات الآتية:
                </p>

                <div className="row"><div className="field"><span className="label">الإسم رباعي: </span>{emp.nameAr}</div></div>
                <div className="row">
                  <div className="field"><span className="label">الجنسية: </span>{emp.nationality || ''}</div>
                  <div className="field"><span className="label">الديانة: </span>{emp.religion || ''}</div>
                </div>
                <div className="row"><div className="field"><span className="label">الوظيفة: </span>{emp.jobTitleAr || emp.jobTitle || ''}</div></div>
                <div className="row">
                  <div className="field"><span className="label">المؤهل الدراسي: </span>{emp.educationAr || ''}</div>
                  <div className="field"><span className="label">تاريخ وجهة الحصول عليه: </span>{emp.graduationYear || ''}</div>
                </div>
                <div className="row"><div className="field"><span className="label">رقم البطاقة الشخصية/العائلية أو جواز السفر: </span>{emp.nationalId || ''}</div></div>
                <div className="row">
                  <div className="field"><span className="label">تاريخ الإصدار: </span>{formatDate(emp.idIssueDate)}</div>
                  <div className="field"><span className="label">جهة الإصدار: </span>{emp.issuingAuthority || emp.issuingGovernorate || ''}</div>
                </div>
                <div className="row">
                  <div className="field"><span className="label">تاريخ الميلاد: </span>{formatDate(emp.birthDate)}</div>
                  <div className="field"><span className="label">محل الميلاد: </span>{emp.birthPlace || emp.birthGovernorate || ''}</div>
                </div>
                <div className="row">
                  <div className="field"><span className="label">رقم التليفون - مكتب: </span>27352025</div>
                  <div className="field"><span className="label">محمول: </span>{emp.mobile || emp.phone || ''}</div>
                </div>
                <div className="row"><div className="field"><span className="label">عنوان السكن: </span>{[emp.address, emp.city, emp.governorate].filter(Boolean).join(' - ')}</div></div>
                <div className="row"><div className="field"><span className="label">منطقة الإرتياد المطلوبة: </span>{emp.stationName || ''}</div></div>

                <table>
                  <thead>
                    <tr><th colSpan={2}>طبيعة المهمة التي تقتضي دخول منطقة الإرتياد المطلوبة على وجه الدقة</th></tr>
                  </thead>
                  <tbody>
                    <tr><td style={{ width: 100, fontWeight: 700 }}>صالة</td><td>إنهاء إجراءات خدمات الركاب</td></tr>
                    <tr><td style={{ fontWeight: 700 }}>مهبط</td><td>إنهاء إجراءات خدمات الطائرات</td></tr>
                    <tr><td style={{ fontWeight: 700 }}>ترانزيت</td><td>إنهاء إجراءات خدمات الركاب</td></tr>
                  </tbody>
                </table>

                <p style={{ marginTop: 10 }}>
                  البيانات الموضحة عاليه صحيحة ومطابقة للواقع، وسوف نخطر بأي تغيرات تطرأ على هذه البيانات فور حدوث التغيير وفي مدة أقصاها أسبوع.
                </p>
                <div style={{ textAlign: 'center', fontWeight: 700 }}>وتفضلوا بقبول فائق الإحترام،،،</div>

                <div style={{ marginTop: 24 }}>
                  <div>(المدير المسؤول)</div>
                  <div style={{ marginTop: 6 }}><span className="label">الإسم: </span>چاك اسحق عبدالمسيح مسيح</div>
                  <div style={{ marginTop: 6 }}><span className="label">التوقيع:</span></div>
                  <div style={{ marginTop: 24 }}>(ختم جهة العمل)</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
