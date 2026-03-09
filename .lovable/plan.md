

# خطة إضافة دور HR (الموارد البشرية)

## ملخص
إضافة دور جديد "hr" يمتلك نفس صلاحيات المسؤول (admin) **باستثناء** الوصول إلى أي بيانات متعلقة بالرواتب.

---

## التغييرات المطلوبة

### 1. قاعدة البيانات (Database)

**إضافة القيمة الجديدة للـ enum:**
```sql
ALTER TYPE public.app_role ADD VALUE 'hr';
```

**إضافة سياسات RLS للـ HR:**
- منح HR نفس صلاحيات admin على جميع الجداول
- **استثناء**: جدولي `salary_records` و `payroll_entries` لا يُمنح لهم أي وصول

---

### 2. الواجهة الأمامية (Frontend)

**الملفات المتأثرة:**

| الملف | التغيير |
|-------|---------|
| `src/contexts/AuthContext.tsx` | إضافة `'hr'` للـ UserRole type |
| `src/App.tsx` | إضافة `'hr'` للـ allowedRoles في المسارات المحمية (ما عدا salaries و salary-reports) |
| `src/components/layout/Sidebar.tsx` | إخفاء روابط "الرواتب" و "تقارير الرواتب" لدور hr |
| `src/pages/EmployeeDetails.tsx` | إخفاء تبويبي `salary` و `salaryRecord` لدور hr |
| `src/components/employees/EditEmployeeDialog.tsx` | إخفاء تبويب `salary` لدور hr |
| `supabase/functions/setup-user/index.ts` | إضافة `'hr'` للأدوار المسموح بها |

---

### 3. التفاصيل التقنية

**AuthContext.tsx:**
```typescript
export type UserRole = 'admin' | 'employee' | 'station_manager' | 'kiosk' | 'training_manager' | 'hr';
```

**App.tsx - المسارات:**
- جميع المسارات الإدارية تحصل على `['admin', 'hr']` 
- **باستثناء**: `/salaries` و `/salary-reports` تبقى `['admin']` فقط

**Sidebar.tsx:**
- فلترة عناصر القائمة لإخفاء salaries و salary-reports عند `user?.role === 'hr'`

**EmployeeDetails.tsx:**
- فلترة `detailTabs` لاستبعاد `salary` و `salaryRecord` عند `user?.role === 'hr'`

**EditEmployeeDialog.tsx:**
- فلترة `tabs` لاستبعاد `salary` عند `user?.role === 'hr'`

---

### 4. سياسات RLS الجديدة

للجداول التي يحتاجها HR (مثال للموظفين):
```sql
CREATE POLICY "hr_manage_employees" ON public.employees
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'hr'))
WITH CHECK (has_role(auth.uid(), 'hr'));
```

**الجداول التي سيُمنح HR وصولاً كاملاً لها:**
- employees, departments, stations, attendance_records, leave_requests, loans, advances, missions, assets, uniforms, notifications, training_*, performance_reviews, وغيرها

**الجداول المحظورة على HR:**
- `salary_records` - لا توجد سياسة للـ hr
- `payroll_entries` - لا توجد سياسة للـ hr

