import mistyImg from '@/assets/welcome-bg-misty.jpg';
import forestImg from '@/assets/welcome-bg-forest.jpg';
import mountainsImg from '@/assets/welcome-bg-mountains.jpg';
import corporateImg from '@/assets/welcome-bg-corporate.jpg';
import cityscapeImg from '@/assets/welcome-bg-cityscape.jpg';
import techImg from '@/assets/welcome-bg-tech.jpg';

export type WelcomeBgId = 'misty' | 'forest' | 'mountains' | 'corporate' | 'cityscape' | 'tech';

export interface WelcomeBgOption {
  id: WelcomeBgId;
  src: string;
  label: { ar: string; en: string };
}

export const WELCOME_BG_OPTIONS: WelcomeBgOption[] = [
  { id: 'misty', src: mistyImg, label: { ar: 'تلال ضبابية', en: 'Misty Hills' } },
  { id: 'forest', src: forestImg, label: { ar: 'غابة', en: 'Forest' } },
  { id: 'mountains', src: mountainsImg, label: { ar: 'جبال', en: 'Mountains' } },
  { id: 'corporate', src: corporateImg, label: { ar: 'مكتب عصري', en: 'Modern Office' } },
  { id: 'cityscape', src: cityscapeImg, label: { ar: 'أفق المدينة', en: 'City Skyline' } },
  { id: 'tech', src: techImg, label: { ar: 'تقني رقمي', en: 'Digital Tech' } },
];

export const DEFAULT_WELCOME_BG: WelcomeBgId = 'misty';

export function getWelcomeBgSrc(id?: string | null): string {
  const found = WELCOME_BG_OPTIONS.find(o => o.id === id);
  return (found ?? WELCOME_BG_OPTIONS[0]).src;
}
