INSERT INTO public.profiles (id, email, full_name) VALUES
  ('b45871a2-cfcb-463f-b86e-60f2c1125ce3', 'locations@linkagency.com', 'Kiosk Locations'),
  ('af816f23-da41-4c4b-b878-694fd5c44566', 'training@linkagency.com', 'مدير التدريب'),
  ('ac1da929-092e-4ff3-8d8d-b1361476b1b8', 'emp0002@linkagency.com', 'عماد حسن احمد')
ON CONFLICT (id) DO NOTHING;