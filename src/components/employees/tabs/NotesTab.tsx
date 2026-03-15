import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Plus, StickyNote, Trash2 } from 'lucide-react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { toast } from '@/hooks/use-toast';

interface Note {
  id: string;
  employeeId: string;
  date: string;
  title: string;
  content: string;
}

interface NotesTabProps {
  employee: Employee;
  onUpdate?: (updates: Partial<Employee>) => void;
  readOnly?: boolean;
}

export const NotesTab = ({ employee, onUpdate, readOnly }: NotesTabProps) => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [notes, setNotes] = usePersistedState<Note[]>('hr_employee_notes', []);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const empNotes = notes.filter(n => n.employeeId === employee.employeeId).sort((a, b) => b.date.localeCompare(a.date));

  const handleAdd = () => {
    if (!newContent.trim()) {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'أدخل محتوى الملاحظة' : 'Enter note content', variant: 'destructive' });
      return;
    }
    const newNote: Note = {
      id: `note_${Date.now()}`,
      employeeId: employee.employeeId,
      date: new Date().toISOString().split('T')[0],
      title: newTitle || (ar ? 'ملاحظة' : 'Note'),
      content: newContent,
    };
    setNotes(prev => [...prev, newNote]);
    toast({ title: ar ? 'تمت الإضافة' : 'Added' });
    setNewTitle('');
    setNewContent('');
  };

  const handleDelete = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    toast({ title: ar ? 'تم الحذف' : 'Deleted' });
  };

  return (
    <div className="p-6 space-y-6">
      <h3 className={cn("text-lg font-semibold flex items-center gap-2", isRTL && "flex-row-reverse")}>
        <StickyNote className="w-5 h-5 text-primary" />
        {ar ? 'الملاحظات' : 'Notes'}
      </h3>

      {/* Add Note Form */}
      <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
        <div className="space-y-2">
          <Label>{ar ? 'العنوان' : 'Title'}</Label>
          <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={ar ? 'عنوان الملاحظة (اختياري)' : 'Note title (optional)'} className={cn(isRTL && "text-right")} />
        </div>
        <div className="space-y-2">
          <Label>{ar ? 'المحتوى' : 'Content'}</Label>
          <Textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder={ar ? 'أدخل الملاحظة...' : 'Enter note...'} className={cn("min-h-[100px]", isRTL && "text-right")} />
        </div>
        <Button size="sm" className="gap-2" onClick={handleAdd}>
          <Plus className="w-4 h-4" />
          {ar ? 'إضافة ملاحظة' : 'Add Note'}
        </Button>
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {empNotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {ar ? 'لا توجد ملاحظات' : 'No notes'}
          </div>
        ) : (
          empNotes.map(note => (
            <div key={note.id} className="border rounded-xl p-4 bg-card">
              <div className={cn("flex items-start justify-between", isRTL && "flex-row-reverse")}>
                <div className={cn("flex-1", isRTL && "text-right")}>
                  <h4 className="font-semibold text-foreground">{note.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(note.date)}</p>
                  <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{note.content}</p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={() => handleDelete(note.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
