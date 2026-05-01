import mistyImg from '@/assets/welcome-bg-misty.jpg';
import forestImg from '@/assets/welcome-bg-forest.jpg';
import mountainsImg from '@/assets/welcome-bg-mountains.jpg';

export type WelcomeBgId = 'misty' | 'forest' | 'mountains';

export interface WelcomeBgOption {
  id: WelcomeBgId;
  src: string;
  label: { ar: string; en: string };
}

export const WELCOME_BG_OPTIONS: WelcomeBgOption[] = [
  { id: 'misty', src: mistyImg, label: { ar: 'تلال ضبابية', en: 'Misty Hills' } },
  { id: 'forest', src: forestImg, label: { ar: 'غابة', en: 'Forest' } },
  { id: 'mountains', src: mountainsImg, label: { ar: 'جبال', en: 'Mountains' } },
];

export const DEFAULT_WELCOME_BG: WelcomeBgId = 'misty';

export function getWelcomeBgSrc(id?: string | null): string {
  const found = WELCOME_BG_OPTIONS.find(o => o.id === id);
  return (found ?? WELCOME_BG_OPTIONS[0]).src;
}
