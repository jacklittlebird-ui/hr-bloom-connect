INSERT INTO stations (code, name_ar, name_en) VALUES
  ('igs', 'الخدمات الأرضية الدولية', 'International Ground Services'),
  ('link_group', 'لينك جروب', 'Link Group'),
  ('jordan', 'الأردن', 'Jordan')
ON CONFLICT DO NOTHING;