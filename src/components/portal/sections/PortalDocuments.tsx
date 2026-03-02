import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortalData } from '@/contexts/PortalDataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FileText, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';

export const PortalDocuments = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { getDocuments, addDocument } = usePortalData();
  const documents = useMemo(() => getDocuments(PORTAL_EMPLOYEE_ID), [getDocuments]);
  const [showDialog, setShowDialog] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('');

  const docTypes = [
    { value: 'contract', ar: 'عقد', en: 'Contract' },
    { value: 'certificate', ar: 'شهادة', en: 'Certificate' },
    { value: 'financial', ar: 'مالي', en: 'Financial' },
    { value: 'identity', ar: 'هوية', en: 'Identity' },
    { value: 'other', ar: 'أخرى', en: 'Other' },
  ];

  const handleSubmit = () => {
    if (!docName || !docType) { toast.error(ar ? 'يرجى ملء جميع الحقول' : 'Please fill all fields'); return; }
    const t = docTypes.find(d => d.value === docType);
    addDocument({
      employeeId: PORTAL_EMPLOYEE_ID,
      nameAr: docName, nameEn: docName,
      date: new Date().toISOString().split('T')[0],
      typeAr: t?.ar || '', typeEn: t?.en || '',
    });
    toast.success(ar ? 'تم رفع المستند بنجاح' : 'Document uploaded');
    setShowDialog(false); setDocName(''); setDocType('');
  };

  return (
    <div className="space-y-6">
      <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3", isRTL && "sm:flex-row-reverse")}>
        <h1 className="text-xl md:text-2xl font-bold">{ar ? 'المستندات' : 'Documents'}</h1>
        <Button onClick={() => setShowDialog(true)} size="sm"><Upload className="w-4 h-4 me-1" />{ar ? 'رفع مستند' : 'Upload'}</Button>
      </div>

      <div className="grid gap-3">
        {documents.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4">
              <div className={cn("flex justify-between items-center", isRTL && "flex-row-reverse")}>
                <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                  <FileText className="w-8 h-8 text-primary" />
                  <div className={cn(isRTL && "text-right")}>
                    <p className="font-medium">{ar ? d.nameAr : d.nameEn}</p>
                    <p className="text-xs text-muted-foreground">{d.date}</p>
                  </div>
                </div>
                <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Badge variant="secondary">{ar ? d.typeAr : d.typeEn}</Badge>
                  <Button variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {documents.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">{ar ? 'لا توجد مستندات' : 'No documents'}</CardContent></Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent><DialogHeader><DialogTitle>{ar ? 'رفع مستند جديد' : 'Upload Document'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{ar ? 'اسم المستند' : 'Document Name'}</Label><Input value={docName} onChange={e => setDocName(e.target.value)} /></div>
            <div><Label>{ar ? 'نوع المستند' : 'Document Type'}</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue placeholder={ar ? 'اختر' : 'Select'} /></SelectTrigger>
                <SelectContent>{docTypes.map(t => <SelectItem key={t.value} value={t.value}>{ar ? t.ar : t.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSubmit}>{ar ? 'رفع' : 'Upload'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
