// Theme presets, accent palette, radius, density and font controls
// All colors stored as HEX, converted to HSL CSS variables at runtime.

export interface ThemePreset {
  id: string;
  name: { ar: string; en: string };
  description?: { ar: string; en: string };
  mode: 'light' | 'dark';
  primary: string;
  background: string;
  foreground: string;
  card: string;
  muted: string;
  border: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarAccent: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'corporate-blue',
    name: { ar: 'الأزرق المؤسسي', en: 'Corporate Blue' },
    description: { ar: 'الافتراضي - أزرق نابض على خلفية فاتحة', en: 'Default vibrant blue on light' },
    mode: 'light',
    primary: '#2563eb',
    background: '#f5f7fa',
    foreground: '#0f172a',
    card: '#ffffff',
    muted: '#eef1f6',
    border: '#dde3ec',
    sidebarBackground: '#1a2236',
    sidebarForeground: '#a6b0c2',
    sidebarAccent: '#252e47',
  },
  {
    id: 'midnight',
    name: { ar: 'منتصف الليل', en: 'Midnight' },
    description: { ar: 'داكن أنيق بلون كحلي', en: 'Elegant dark navy' },
    mode: 'dark',
    primary: '#3b82f6',
    background: '#0b1220',
    foreground: '#e6ebf5',
    card: '#111a2e',
    muted: '#172238',
    border: '#1f2b46',
    sidebarBackground: '#070d1a',
    sidebarForeground: '#8a96ae',
    sidebarAccent: '#0f1a30',
  },
  {
    id: 'emerald',
    name: { ar: 'الزمرد', en: 'Emerald' },
    description: { ar: 'أخضر طبيعي وهادئ', en: 'Calm natural green' },
    mode: 'light',
    primary: '#059669',
    background: '#f4faf7',
    foreground: '#0b2a20',
    card: '#ffffff',
    muted: '#e6f3ed',
    border: '#cfe6dc',
    sidebarBackground: '#0e2a22',
    sidebarForeground: '#a3c1b6',
    sidebarAccent: '#173d33',
  },
  {
    id: 'crimson',
    name: { ar: 'القرمزي', en: 'Crimson' },
    description: { ar: 'أحمر جريء وعصري', en: 'Bold modern red' },
    mode: 'light',
    primary: '#dc2626',
    background: '#fbf6f6',
    foreground: '#1a0d0d',
    card: '#ffffff',
    muted: '#f3e6e6',
    border: '#e4cccc',
    sidebarBackground: '#1f1212',
    sidebarForeground: '#c1a3a3',
    sidebarAccent: '#2d1818',
  },
  {
    id: 'royal-purple',
    name: { ar: 'البنفسجي الملكي', en: 'Royal Purple' },
    description: { ar: 'بنفسجي فاخر وعصري', en: 'Luxurious modern purple' },
    mode: 'light',
    primary: '#7c3aed',
    background: '#f8f7fc',
    foreground: '#1a1233',
    card: '#ffffff',
    muted: '#ece8f7',
    border: '#d8d0eb',
    sidebarBackground: '#1c1530',
    sidebarForeground: '#aaa3c2',
    sidebarAccent: '#2a2147',
  },
  {
    id: 'amber-sun',
    name: { ar: 'شمس الكهرمان', en: 'Amber Sun' },
    description: { ar: 'دافئ ومشرق', en: 'Warm and bright' },
    mode: 'light',
    primary: '#d97706',
    background: '#fdf9f3',
    foreground: '#2a1a05',
    card: '#ffffff',
    muted: '#f7eedc',
    border: '#ead9b8',
    sidebarBackground: '#241906',
    sidebarForeground: '#bda993',
    sidebarAccent: '#33240b',
  },
  {
    id: 'slate-mono',
    name: { ar: 'الرمادي الأحادي', en: 'Slate Mono' },
    description: { ar: 'تصميم بسيط وعصري', en: 'Minimal modern monochrome' },
    mode: 'light',
    primary: '#0f172a',
    background: '#fafafa',
    foreground: '#0a0a0a',
    card: '#ffffff',
    muted: '#f1f1f1',
    border: '#e4e4e4',
    sidebarBackground: '#0a0a0a',
    sidebarForeground: '#a1a1a1',
    sidebarAccent: '#1c1c1c',
  },
  {
    id: 'ocean',
    name: { ar: 'المحيط', en: 'Ocean' },
    description: { ar: 'تركواز هادئ', en: 'Soothing teal' },
    mode: 'light',
    primary: '#0891b2',
    background: '#f3fafc',
    foreground: '#062a33',
    card: '#ffffff',
    muted: '#dff2f7',
    border: '#bfe2eb',
    sidebarBackground: '#0a2530',
    sidebarForeground: '#9bb8c2',
    sidebarAccent: '#103745',
  },
  {
    id: 'rose-quartz',
    name: { ar: 'كوارتز وردي', en: 'Rose Quartz' },
    description: { ar: 'وردي ناعم ودافئ', en: 'Soft warm pink' },
    mode: 'light',
    primary: '#e11d48',
    background: '#fdf6f8',
    foreground: '#2a0a18',
    card: '#ffffff',
    muted: '#f5e1e8',
    border: '#ecccd8',
    sidebarBackground: '#2a0e1a',
    sidebarForeground: '#bda3ac',
    sidebarAccent: '#3a1626',
  },
  {
    id: 'cyber-neon',
    name: { ar: 'النيون السايبيري', en: 'Cyber Neon' },
    description: { ar: 'داكن مع لمسات نيون', en: 'Dark with neon accents' },
    mode: 'dark',
    primary: '#22d3ee',
    background: '#06070d',
    foreground: '#e4f1f7',
    card: '#0d1018',
    muted: '#141823',
    border: '#1c2030',
    sidebarBackground: '#03040a',
    sidebarForeground: '#7d96a8',
    sidebarAccent: '#0d1320',
  },
];

export const ACCENT_PALETTE: { hex: string; name: string }[] = [
  { hex: '#2563eb', name: 'Blue' },
  { hex: '#3b82f6', name: 'Sky' },
  { hex: '#0891b2', name: 'Cyan' },
  { hex: '#059669', name: 'Emerald' },
  { hex: '#16a34a', name: 'Green' },
  { hex: '#65a30d', name: 'Lime' },
  { hex: '#d97706', name: 'Amber' },
  { hex: '#ea580c', name: 'Orange' },
  { hex: '#dc2626', name: 'Red' },
  { hex: '#e11d48', name: 'Rose' },
  { hex: '#db2777', name: 'Pink' },
  { hex: '#7c3aed', name: 'Violet' },
  { hex: '#9333ea', name: 'Purple' },
  { hex: '#4f46e5', name: 'Indigo' },
  { hex: '#0f172a', name: 'Slate' },
  { hex: '#1f2937', name: 'Graphite' },
];

export const FONT_OPTIONS = [
  { id: 'baloo', label: { ar: 'بالو بهيجان (افتراضي)', en: 'Baloo Bhaijaan (Default)' }, family: "'Baloo Bhaijaan 2', sans-serif" },
  { id: 'cairo', label: { ar: 'القاهرة', en: 'Cairo' }, family: "'Cairo', sans-serif" },
  { id: 'tajawal', label: { ar: 'تجوال', en: 'Tajawal' }, family: "'Tajawal', sans-serif" },
  { id: 'rubik', label: { ar: 'روبيك', en: 'Rubik' }, family: "'Rubik', sans-serif" },
  { id: 'system', label: { ar: 'نظام التشغيل', en: 'System UI' }, family: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
];

const RADIUS_MAP: Record<string, string> = {
  none: '0rem',
  sm: '0.375rem',
  md: '0.625rem',
  lg: '0.875rem',
  xl: '1.25rem',
};

const DENSITY_MAP: Record<string, string> = {
  compact: '0.875',
  comfortable: '1',
  spacious: '1.0625',
};

interface ApplyConfig {
  theme?: string;
  primaryColor?: string;
  preset?: string;
  radius?: string;
  density?: string;
  font?: string;
  sidebarStyle?: 'auto' | 'dark' | 'light' | 'glass';
  headerStyle?: 'smooth' | 'sharp';
}

// HEX -> "H S% L%" string for CSS HSL variables
function hexToHSL(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

function applyPreset(root: HTMLElement, preset: ThemePreset) {
  if (preset.mode === 'dark') root.classList.add('dark'); else root.classList.remove('dark');

  const setVar = (name: string, hex: string) => root.style.setProperty(name, hexToHSL(hex));
  setVar('--background', preset.background);
  setVar('--foreground', preset.foreground);
  setVar('--card', preset.card);
  setVar('--card-foreground', preset.foreground);
  setVar('--popover', preset.card);
  setVar('--popover-foreground', preset.foreground);
  setVar('--muted', preset.muted);
  setVar('--secondary', preset.muted);
  setVar('--secondary-foreground', preset.foreground);
  setVar('--border', preset.border);
  setVar('--input', preset.border);
  setVar('--sidebar-background', preset.sidebarBackground);
  setVar('--sidebar-foreground', preset.sidebarForeground);
  setVar('--sidebar-accent', preset.sidebarAccent);
  setVar('--sidebar-border', preset.sidebarAccent);
}

export function applyThemeSettings(config?: ApplyConfig) {
  if (!config) {
    try {
      const stored = localStorage.getItem('hr_site_config');
      if (stored) config = JSON.parse(stored);
    } catch { return; }
  }
  if (!config) return;
  const root = document.documentElement;

  // 1) Preset (if provided & valid) overrides plain theme
  if (config.preset) {
    const preset = THEME_PRESETS.find(p => p.id === config.preset);
    if (preset) applyPreset(root, preset);
  } else if (config.theme === 'dark') {
    root.classList.add('dark');
  } else if (config.theme === 'light') {
    root.classList.remove('dark');
  } else if (config.theme === 'system') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
    else root.classList.remove('dark');
  }

  // 2) Primary accent color
  if (config.primaryColor && config.primaryColor.startsWith('#')) {
    const hsl = hexToHSL(config.primaryColor);
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--ring', hsl);
    const fg = isLightColor(config.primaryColor) ? '222 47% 11%' : '0 0% 100%';
    root.style.setProperty('--primary-foreground', fg);
    root.style.setProperty('--sidebar-primary', hsl);
    root.style.setProperty('--sidebar-primary-foreground', fg);
  }

  // 3) Border radius
  if (config.radius && RADIUS_MAP[config.radius]) {
    root.style.setProperty('--radius', RADIUS_MAP[config.radius]);
  }

  // 4) Density (controls base font-size scaling)
  if (config.density && DENSITY_MAP[config.density]) {
    root.style.setProperty('font-size', `${parseFloat(DENSITY_MAP[config.density]) * 16}px`);
  }

  // 5) Font family
  if (config.font) {
    const f = FONT_OPTIONS.find(o => o.id === config.font);
    if (f) {
      root.style.setProperty('--font-sans', f.family);
      root.style.setProperty('--font-arabic', f.family);
      document.body.style.fontFamily = f.family;
    }
  }

  // 6) Header style (smooth gradient vs sharp split)
  if (config.headerStyle === 'smooth' || config.headerStyle === 'sharp') {
    root.dataset.headerStyle = config.headerStyle;
  }
}
