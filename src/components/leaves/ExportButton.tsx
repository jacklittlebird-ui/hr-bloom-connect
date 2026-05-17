import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import { exportToCSV, exportToPDF, exportToXLSX, ExportColumn } from '@/lib/leavesExport';
import { toast } from 'sonner';

interface ExportButtonProps<T> {
  rows: T[];
  columns: ExportColumn<T>[];
  filenameBase: string;
  title?: string;
  disabled?: boolean;
}

export function ExportButton<T>({ rows, columns, filenameBase, title, disabled }: ExportButtonProps<T>) {
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  const ar = language === 'ar';
  const count = rows?.length || 0;

  const guard = (action: () => void | Promise<void>) => async () => {
    if (!rows || rows.length === 0) {
      toast.error(ar ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }
    try {
      await action();
      toast.success(ar ? `تم تصدير ${rows.length} سجل` : `Exported ${rows.length} record(s)`);
    } catch (e) {
      toast.error(ar ? 'فشل التصدير' : 'Export failed');
      console.error(e);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-1.5">
          <Download className="w-4 h-4" />
          <span>{ar ? `تصدير (${count})` : `Export (${count})`}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
        <DropdownMenuItem onClick={guard(() => exportToCSV(rows, columns, filenameBase))}>
          <FileText className="w-4 h-4 mr-2" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={guard(() => exportToXLSX(rows, columns, filenameBase, title || filenameBase, { title, isRTL, userName: user?.name }))}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={guard(() => exportToPDF(rows, columns, filenameBase, { title, isRTL, userName: user?.name }))}>
          <FileDown className="w-4 h-4 mr-2" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
