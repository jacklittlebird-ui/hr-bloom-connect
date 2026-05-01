-- Per-user UI/theme preferences
CREATE TABLE IF NOT EXISTS public.user_theme_preferences (
  user_id UUID NOT NULL PRIMARY KEY,
  theme TEXT,
  theme_preset TEXT,
  primary_color TEXT,
  radius TEXT,
  density TEXT,
  font TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_theme_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own theme prefs"
  ON public.user_theme_preferences
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own theme prefs"
  ON public.user_theme_preferences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own theme prefs"
  ON public.user_theme_preferences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own theme prefs"
  ON public.user_theme_preferences
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_user_theme_preferences()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS user_theme_prefs_touch ON public.user_theme_preferences;
CREATE TRIGGER user_theme_prefs_touch
BEFORE UPDATE ON public.user_theme_preferences
FOR EACH ROW EXECUTE FUNCTION public.touch_user_theme_preferences();