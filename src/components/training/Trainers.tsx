import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Save, X, Edit2, ChevronLeft, ChevronRight, Search, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Trainer {
  id: string;
  provider: string;
  name: string;
  jobTitle: string;
  email: string;
  mobNumber: string;
  siteAddress: string;
  status: 'active' | 'inactive';
  
}

export const Trainers = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const ar = language === 'ar';
  
  const [trainers, setTrainers] = useState<Trainer[]>([
    { id: '1', provider: 'Aeroflot', name: 'Moatasem Mahmoud', jobTitle: 'Director Operations & Training', email: 'mmahmoud@linkagency.com', mobNumber: '100029075', siteAddress: '', status: 'active' },
    { id: '2', provider: 'Link Aero Trading Agency', name: 'Mohamed Mossad', jobTitle: 'Duty Station Manager', email: 'mmossad@linkagency.com', mobNumber: '01001669860', siteAddress: '', status: 'active' },
    { id: '3', provider: 'Iberworld Airlines', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '4', provider: 'Italian Embassy', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '5', provider: 'British Embassy', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '6', provider: 'Austrian Airlines', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '7', provider: 'Lufthansa', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '8', provider: 'Finnair', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '9', provider: 'AVIT', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '10', provider: 'E.A.S', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '11', provider: 'City Bird', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '12', provider: 'Air2000', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '13', provider: 'Singapore Airlines', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '14', provider: 'Aero Services', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '15', provider: 'Mavicon', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '16', provider: 'TAS', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '17', provider: 'Ogden Aviation', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '18', provider: 'Saudia Arabia Airlines', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '19', provider: 'Nile Valley Aviation', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '20', provider: 'Egyptian Ministry of Interior', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '21', provider: 'Austrian Embassy', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '22', provider: 'Lotus Air', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '23', provider: 'Egypt Air Training Center', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '24', provider: 'Gulf Air', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '25', provider: 'Swiss International Airlines', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '26', provider: 'American University', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '27', provider: 'Condor', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '28', provider: 'Egyptian Civil Aviation "ECAA"', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '29', provider: 'American Transair', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '30', provider: 'U.S.A Embassy', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '31', provider: 'Swissport', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '32', provider: 'Lauda Air', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '33', provider: 'NACTO Misr Flying Institute', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '34', provider: 'ATC & Academic Studies Institute', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '35', provider: 'Austrian Ministry of Interior', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '36', provider: 'UK & Canadian Embassies', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '37', provider: 'Luxor Air', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '38', provider: 'Civil Defense Authority', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '39', provider: 'Flash Airlines', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '40', provider: 'Canadian Embassy', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '41', provider: 'IATA', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '42', provider: 'Gulf Airlines', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '43', provider: 'Cairo Airport Authority', name: 'Ahmed Helmy', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '44', provider: 'Transaero Airline Company', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '45', provider: 'Delta Airlines', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '46', provider: 'Emirates', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '47', provider: 'Royal Jordanian Airlines', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '48', provider: 'Hapagfly', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '49', provider: 'AMIDEAST', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '50', provider: 'EMAAS', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '51', provider: 'NCATO', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '52', provider: 'Eurofly', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '53', provider: 'Thomas Cook Airlines', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '54', provider: 'KUWAIT AIRWAYS', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '55', provider: 'OMAN AIR', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '56', provider: 'Top Aviation', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '57', provider: 'Tui Airlines Belgium', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '58', provider: 'French Embassy', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '59', provider: 'Link Aero Trading Agency', name: 'Akram Berzi', jobTitle: 'Station Manager', email: 'aberzi@linkagency.com', mobNumber: '01005106652', siteAddress: '', status: 'active' },
    { id: '60', provider: 'Czech Airlines', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '61', provider: 'Human Capital & Change Solutions', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '62', provider: 'Jazeera Airway', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '63', provider: 'Transavia', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '64', provider: 'Jetair Fly', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '65', provider: 'International Center for Etudes', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '66', provider: 'American Chamber of Commerce in Egypt', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '67', provider: 'Qatar Airways', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '68', provider: 'Microsoft', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '69', provider: 'German Embassy', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '70', provider: 'Link Aero Trading Agency', name: 'Amr Badawy', jobTitle: 'Shift Leader', email: '', mobNumber: '01006000619', siteAddress: '', status: 'active' },
    { id: '71', provider: 'Khatawat Foundation for Human Development', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '72', provider: 'Link Aero Trading Agency', name: 'Diaa Raheel', jobTitle: 'Shift Leader Passenger Handling', email: '', mobNumber: '01099928030', siteAddress: '', status: 'active' },
    { id: '73', provider: 'German Egyptian Training CO', name: 'Michael Wurche', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '74', provider: 'Link Aero Trading Agency', name: 'Michael Wurche', jobTitle: 'Director Germany & Head of Quality Control', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '75', provider: 'KLM Security Services', name: 'R.H. Augustin', jobTitle: 'Security Director & Deputy Vice-President', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '76', provider: 'Horus Training Center', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '77', provider: 'Central Aviation Security Office ECAA', name: 'Mahmoud Aly', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '78', provider: 'Al mentor', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' },
    { id: '79', provider: 'Link Aero Trading Agency', name: 'Hossam Hagag', jobTitle: 'Training manager', email: 'hhagag@linkagency.com', mobNumber: '01006058343', siteAddress: '', status: 'active' },
    { id: '80', provider: 'Emirates group Aviation', name: 'Moustafa Metwally', jobTitle: 'Training & Operation Senior Supervisor', email: 'MMETWALLY@LINKAGENCY.COM', mobNumber: '01010363777', siteAddress: '', status: 'active' },
  ]);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState<Partial<Trainer>>({
    id: '', provider: '', name: '',
    jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active',
  });
  const [searchName, setSearchName] = useState('');
  const [searchProvider, setSearchProvider] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return trainers.filter(t => {
      const n = searchName.toLowerCase();
      const p = searchProvider.toLowerCase();
      return (!n || t.name.toLowerCase().includes(n) || t.jobTitle.toLowerCase().includes(n))
        && (!p || t.provider.toLowerCase().includes(p));
    });
  }, [trainers, searchName, searchProvider]);

  const handleNewTrainer = () => {

    setIsAddMode(true); setSelectedTrainer(null);
    setFormData({ id: String(trainers.length + 1), provider: '', name: '', jobTitle: '', email: '', mobNumber: '', siteAddress: '', status: 'active' });
  };

  const handleEditTrainer = (trainer: Trainer) => {
    setSelectedTrainer(trainer); setFormData(trainer); setIsAddMode(false);
    setCurrentIndex(trainers.findIndex(t => t.id === trainer.id));
  };

  const handleSave = () => {
    if (!formData.name || !formData.provider) {
      toast({ title: t('common.error'), description: t('training.fillRequired'), variant: 'destructive' }); return;
    }
    if (isAddMode) {
      setTrainers([...trainers, formData as Trainer]);
      toast({ title: t('common.success'), description: t('training.trainerAdded') });
    } else {
      setTrainers(trainers.map(tr => tr.id === formData.id ? formData as Trainer : tr));
      toast({ title: t('common.success'), description: t('training.trainerUpdated') });
    }
    setSelectedTrainer(null); setIsAddMode(false);
  };

  const handleSaveAndNew = () => { handleSave(); handleNewTrainer(); };

  const handleDelete = () => {
    if (formData.id) {
      setTrainers(trainers.filter(tr => tr.id !== formData.id));
      setSelectedTrainer(null); setIsAddMode(false);
      toast({ title: t('common.success'), description: t('training.trainerDeleted') });
    }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? Math.max(0, currentIndex - 1) : Math.min(trainers.length - 1, currentIndex + 1);
    setCurrentIndex(newIndex); setFormData(trainers[newIndex]); setSelectedTrainer(trainers[newIndex]);
  };

  const showForm = isAddMode || selectedTrainer;

  return (
    <div dir="rtl" className="space-y-6">
      {!showForm ? (
        <>
           <div className="flex justify-between items-center">
             <h2 className="text-xl font-semibold">{t('training.trainers.list')}</h2>
             <div className="flex gap-2">
               <Button variant={showFilters ? 'default' : 'outline'} onClick={() => setShowFilters(!showFilters)}>
                 <Search className="h-4 w-4 mr-2" />{ar ? 'بحث' : 'Search'} {(searchName || searchProvider) && `(${filtered.length})`}
               </Button>
               <Button onClick={handleNewTrainer}><Plus className="h-4 w-4 mr-2" />{t('training.trainers.add')}</Button>
             </div>
           </div>
           {showFilters && (
             <Card><CardContent className="p-4">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                 <div>
                   <Label>{ar ? 'الاسم / المسمى الوظيفي' : 'Name / Job Title'}</Label>
                   <Input placeholder={ar ? 'بحث...' : 'Search...'} value={searchName} onChange={e => setSearchName(e.target.value)} />
                 </div>
                 <div>
                   <Label>{ar ? 'الجهة' : 'Provider'}</Label>
                   <Input placeholder={ar ? 'بحث...' : 'Search...'} value={searchProvider} onChange={e => setSearchProvider(e.target.value)} />
                 </div>
                 {(searchName || searchProvider) && (
                   <Button variant="ghost" size="sm" onClick={() => { setSearchName(''); setSearchProvider(''); }}>
                     <XCircle className="h-4 w-4 mr-1" />{ar ? 'مسح الفلاتر' : 'Clear'}
                   </Button>
                 )}
               </div>
             </CardContent></Card>
           )}
           <Card><CardContent className="p-0">
             <Table>
               <TableHeader><TableRow>
                 <TableHead>{t('training.trainers.provider')}</TableHead>
                 <TableHead>{t('training.trainers.name')}</TableHead>
                 <TableHead>{t('training.trainers.jobTitle')}</TableHead>
                 <TableHead>{t('training.trainers.email')}</TableHead>
                 <TableHead>{t('training.trainers.mobNumber')}</TableHead>
                 <TableHead>{t('training.trainers.status')}</TableHead>
                 <TableHead>{t('common.actions')}</TableHead>
               </TableRow></TableHeader>
               <TableBody>
                 {filtered.length === 0 ? (
                   <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{ar ? 'لا توجد نتائج' : 'No results'}</TableCell></TableRow>
                 ) : filtered.map(trainer => (
                   <TableRow key={trainer.id}>
                     <TableCell>{trainer.provider}</TableCell>
                     <TableCell className="font-medium">{trainer.name || '-'}</TableCell>
                     <TableCell>{trainer.jobTitle || '-'}</TableCell>
                     <TableCell>{trainer.email || '-'}</TableCell>
                     <TableCell>{trainer.mobNumber || '-'}</TableCell>
                     <TableCell><Badge variant={trainer.status === 'active' ? 'default' : 'secondary'}>{trainer.status === 'active' ? t('training.status.onJob') : t('training.status.inactive')}</Badge></TableCell>
                     <TableCell><Button variant="ghost" size="icon" onClick={() => handleEditTrainer(trainer)}><Edit2 className="h-4 w-4" /></Button></TableCell>
                   </TableRow>
                ))}</TableBody>
            </Table>
          </CardContent></Card>
        </>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{isAddMode ? t('training.trainers.addNew') : t('training.trainers.edit')}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setSelectedTrainer(null); setIsAddMode(false); }}><X className="h-4 w-4" /></Button>
              {!isAddMode && (<>
                <Button variant="ghost" size="icon" onClick={() => handleNavigate('prev')} disabled={currentIndex === 0}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleNavigate('next')} disabled={currentIndex === trainers.length - 1}><ChevronRight className="h-4 w-4" /></Button>
              </>)}
            </div>
          </CardHeader>
           <CardContent className="space-y-6">
             <div className="grid grid-cols-3 gap-4">
                 <div><Label>{t('training.trainers.provider')}</Label><Input value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} /></div>
                 <div className="col-span-2"><Label>{ar ? 'الاسم' : 'Name'}</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                 <div className="col-span-2"><Label>{t('training.trainers.jobTitle')}</Label><Input value={formData.jobTitle} onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })} /></div>
                 <div><Label>{t('training.trainers.email')}</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                 <div><Label>{t('training.trainers.mobNumber')}</Label><Input value={formData.mobNumber} onChange={(e) => setFormData({ ...formData, mobNumber: e.target.value })} /></div>
             </div>
            <div className="flex justify-center gap-4 pt-4 border-t">
              {!isAddMode && (<Button variant="destructive" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />{t('training.trainers.deleteRecord')}</Button>)}
              <Button variant="outline" onClick={handleSaveAndNew}><Save className="h-4 w-4 mr-2" />{t('training.trainers.saveAndNew')}</Button>
              <Button variant="outline" onClick={() => { setSelectedTrainer(null); setIsAddMode(false); }}><X className="h-4 w-4 mr-2" />{t('training.trainers.discard')}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
