const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_ARABIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export const normalizeLoginIdentifier = (value: string) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\u200e\u200f\u202a-\u202e\s]+/g, '')
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(EASTERN_ARABIC_DIGITS.indexOf(digit)));

  if (!normalized) return '';
  if (normalized.includes('@')) return normalized;

  return `${normalized}@linkagency.com`;
};

export const getRoleRedirectPath = (role?: string) => {
  if (role === 'employee') return '/employee-portal';
  if (role === 'station_manager' || role === 'area_manager') return '/station-manager';
  if (role === 'kiosk') return '/attendance/kiosk';
  if (role === 'training_manager') return '/training-portal';
  return '/';
};