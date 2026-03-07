import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Send } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { LeaveRequest } from '@/types/leaves';
import { toast } from '@/hooks/use-toast';

interface LeaveRequestFormProps {
  onSubmit: (request: Omit<LeaveRequest, 'id' | 'status' | 'submittedDate'>) => void;
}

export const LeaveRequestForm = ({ onSubmit }: LeaveRequestFormProps) => {
  const { t, isRTL } = useLanguage();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [leaveType, setLeaveType] = useState<string>('');
  const [reason, setReason] = useState('');

  const calculateDays = () => {
    if (startDate && endDate) {
      return differenceInDays(endDate, startDate) + 1;
    }
    return 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate || !leaveType || !reason) {
      toast({
        title: t('leaves.form.error'),
        description: t('leaves.form.fillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    onSubmit({
      employeeId: 'EMP001',
      employeeName: 'Current User',
      employeeNameAr: 'المستخدم الحالي',
      department: 'IT',
      station: '',
      leaveType: leaveType as LeaveRequest['leaveType'],
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      days: calculateDays(),
      reason,
    });

    toast({
      title: t('leaves.form.success'),
      description: t('leaves.form.requestSubmitted'),
    });

    // Reset form
    setStartDate(undefined);
    setEndDate(undefined);
    setLeaveType('');
    setReason('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          {t('leaves.form.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Leave Type */}
            <div className="space-y-2">
              <Label>{t('leaves.form.leaveType')}</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger>
                  <SelectValue placeholder={t('leaves.form.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">{t('leaves.types.annual')}</SelectItem>
                  <SelectItem value="sick">{t('leaves.types.sick')}</SelectItem>
                  <SelectItem value="casual">{t('leaves.types.casual')}</SelectItem>
                  <SelectItem value="unpaid">{t('leaves.types.unpaid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Days Count */}
            <div className="space-y-2">
              <Label>{t('leaves.form.totalDays')}</Label>
              <Input 
                value={calculateDays()} 
                readOnly 
                className="bg-muted"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>{t('leaves.form.startDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : t('leaves.form.pickDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>{t('leaves.form.endDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : t('leaves.form.pickDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>{t('leaves.form.reason')}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('leaves.form.reasonPlaceholder')}
              rows={4}
            />
          </div>

          {/* Submit Button */}
          <div className={cn("flex", isRTL ? "justify-start" : "justify-end")}>
            <Button type="submit" className="min-w-[200px]">
              <Send className={cn("w-4 h-4", isRTL ? "ml-2" : "mr-2")} />
              {t('leaves.form.submit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
