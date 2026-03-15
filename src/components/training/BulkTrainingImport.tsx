import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export const BulkTrainingImport = () => {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const { toast } = useToast();

  const handleImport = async () => {
    setImporting(true);
    setProgress('Fetching file...');

    try {
      // 1. Fetch and parse the xlsx file
      const response = await fetch('/data/TrainingRecordByEmployee.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Skip header row
      const dataRows = rows.slice(1).filter(r => r && r[0]);
      setProgress(`Parsed ${dataRows.length} rows. Fetching employees...`);

      // 2. Get all employees
      const empMap = new Map<string, string>();
      let from = 0;
      while (true) {
        const { data } = await supabase
          .from('employees')
          .select('id, employee_code')
          .range(from, from + 999);
        if (!data || data.length === 0) break;
        for (const e of data) {
          empMap.set(e.employee_code.toLowerCase(), e.id);
        }
        from += 1000;
        if (data.length < 1000) break;
      }
      setProgress(`Found ${empMap.size} employees. Fetching courses...`);

      // 3. Get all courses
      const courseMap = new Map<string, string>();
      const { data: courses } = await supabase
        .from('training_courses')
        .select('id, name_en');
      if (courses) {
        for (const c of courses) {
          courseMap.set(c.name_en.toLowerCase().trim(), c.id);
        }
      }
      setProgress(`Found ${courseMap.size} courses. Preparing records...`);

      // 4. Parse dates - handles M/D/YY, M/D/YYYY, or Excel serial dates
      function parseDate(val: any): string | null {
        if (!val) return null;
        if (typeof val === 'number') {
          // Excel serial date
          const date = new Date((val - 25569) * 86400000);
          if (isNaN(date.getTime())) return null;
          return date.toISOString().split('T')[0];
        }
        const s = String(val).trim();
        if (!s) return null;
        const parts = s.split('/');
        if (parts.length !== 3) return null;
        let [m, d, y] = parts.map(Number);
        if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
        if (y < 100) y = y >= 50 ? 1900 + y : 2000 + y;
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }

      function mapStatus(result: any): string {
        const r = String(result || '').toLowerCase();
        if (r.includes('passed') || r.includes('paased') || r.includes('attendance') || r.includes('good')) return 'completed';
        if (r.includes('failed')) return 'failed';
        return 'enrolled';
      }

      function parseBool(val: any): boolean {
        if (typeof val === 'boolean') return val;
        return String(val).toUpperCase() === 'TRUE';
      }

      // 5. Build insert records
      const records: any[] = [];
      let skipped = 0;
      const missingEmps = new Set<string>();

      for (const row of dataRows) {
        const empCode = String(row[0] || '').trim().toLowerCase();
        if (!empCode) continue;

        const empId = empMap.get(empCode);
        if (!empId) {
          skipped++;
          missingEmps.add(empCode);
          continue;
        }

        const courseName = String(row[1] || '').trim();
        const courseId = courseMap.get(courseName.toLowerCase()) || null;

        records.push({
          employee_id: empId,
          course_id: courseId,
          start_date: parseDate(row[4]),
          end_date: parseDate(row[5]),
          planned_date: parseDate(row[6]),
          status: mapStatus(row[7]),
          provider: row[2] ? String(row[2]).trim() : null,
          location: row[3] ? String(row[3]).trim() : null,
          has_cert: parseBool(row[8]),
          has_cr: parseBool(row[9]),
          has_ss: parseBool(row[10]),
          has_cb: parseBool(row[11]),
          cost: 0,
          total_cost: 0,
        });
      }

      setProgress(`Prepared ${records.length} records (${skipped} skipped). Inserting...`);

      // 6. Batch insert
      let inserted = 0;
      let errors = 0;
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await supabase.from('training_records').insert(batch as any);
        if (error) {
          console.error(`Batch ${i} error:`, error.message);
          errors += batch.length;
        } else {
          inserted += batch.length;
        }
        setProgress(`Inserted ${inserted}/${records.length} (${errors} errors)...`);
      }

      const missingList = [...missingEmps].slice(0, 10).join(', ');
      setProgress(`Done! Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}. Missing employees: ${missingList}`);
      toast({
        title: `Import Complete`,
        description: `Inserted ${inserted} records, ${skipped} skipped, ${errors} errors`,
      });
    } catch (err) {
      console.error('Import error:', err);
      setProgress(`Error: ${err}`);
      toast({ title: 'Import Error', description: String(err), variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
      <Button onClick={handleImport} disabled={importing}>
        {importing ? 'Importing...' : 'Import Training Records from Excel'}
      </Button>
      {progress && <p className="text-sm text-muted-foreground">{progress}</p>}
    </div>
  );
};
