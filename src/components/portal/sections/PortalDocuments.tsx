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
import { FileText, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';

export const PortalDocuments = () => {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">{ar ? 'المستندات' : 'Documents'}</h1>
      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">{ar ? 'قريباً' : 'Coming Soon'}</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            {ar ? 'هذا القسم قيد التطوير وسيكون متاحاً قريباً' : 'This section is under development and will be available soon'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};