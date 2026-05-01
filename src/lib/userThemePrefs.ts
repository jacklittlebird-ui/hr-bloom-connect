import { supabase } from '@/integrations/supabase/client';
import { applyThemeSettings } from '@/lib/themeUtils';

export interface UserThemePrefs {
  theme?: string | null;
  themePreset?: string | null;
  primaryColor?: string | null;
  radius?: string | null;
  density?: string | null;
  font?: string | null;
  headerStyle?: 'smooth' | 'sharp' | null;
  welcomeBg?: string | null;
}

const LS_KEY = 'hr_site_config';

function mergeIntoLocalConfig(prefs: UserThemePrefs) {
  try {
    const cur = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    const next = {
      ...cur,
      ...(prefs.theme !== undefined && prefs.theme !== null ? { theme: prefs.theme } : {}),
      ...(prefs.themePreset !== undefined && prefs.themePreset !== null ? { themePreset: prefs.themePreset } : {}),
      ...(prefs.primaryColor !== undefined && prefs.primaryColor !== null ? { primaryColor: prefs.primaryColor } : {}),
      ...(prefs.radius !== undefined && prefs.radius !== null ? { radius: prefs.radius } : {}),
      ...(prefs.density !== undefined && prefs.density !== null ? { density: prefs.density } : {}),
      ...(prefs.font !== undefined && prefs.font !== null ? { font: prefs.font } : {}),
      ...(prefs.headerStyle !== undefined && prefs.headerStyle !== null ? { headerStyle: prefs.headerStyle } : {}),
      ...(prefs.welcomeBg !== undefined && prefs.welcomeBg !== null ? { welcomeBg: prefs.welcomeBg } : {}),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

/** Load saved prefs for the current user, apply them and merge into localStorage. */
export async function loadAndApplyUserThemePrefs(): Promise<UserThemePrefs | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_theme_preferences')
      .select('theme, theme_preset, primary_color, radius, density, font, header_style, welcome_bg')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error || !data) return null;
    const prefs: UserThemePrefs = {
      theme: data.theme,
      themePreset: data.theme_preset,
      primaryColor: data.primary_color,
      radius: data.radius,
      density: data.density,
      font: data.font,
      headerStyle: (data as any).header_style ?? null,
      welcomeBg: (data as any).welcome_bg ?? null,
    };
    const merged = mergeIntoLocalConfig(prefs);
    if (merged) applyThemeSettings(merged);
    try { window.dispatchEvent(new Event('hr-header-style-changed')); } catch {}
    try { window.dispatchEvent(new Event('hr-welcome-bg-changed')); } catch {}
    return prefs;
  } catch {
    return null;
  }
}

/** Persist user's theme prefs (upsert) for the current authenticated user. */
export async function saveUserThemePrefs(prefs: UserThemePrefs): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from('user_theme_preferences')
      .upsert({
        user_id: user.id,
        theme: prefs.theme ?? null,
        theme_preset: prefs.themePreset ?? null,
        primary_color: prefs.primaryColor ?? null,
        radius: prefs.radius ?? null,
        density: prefs.density ?? null,
        font: prefs.font ?? null,
        header_style: prefs.headerStyle ?? null,
        welcome_bg: prefs.welcomeBg ?? null,
      } as any, { onConflict: 'user_id' });
    return !error;
  } catch {
    return false;
  }
}
