
-- Step 1: Drop existing constraints
ALTER TABLE public.user_devices DROP CONSTRAINT user_devices_pkey;
ALTER TABLE public.user_devices DROP CONSTRAINT user_devices_device_id_key;

-- Step 2: Add proper PK and support multiple devices per user
ALTER TABLE public.user_devices ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE public.user_devices ADD PRIMARY KEY (id);

-- Step 3: Add unique constraint on (user_id, device_id) pair
ALTER TABLE public.user_devices ADD CONSTRAINT user_devices_user_device_unique UNIQUE (user_id, device_id);

-- Step 4: Add metadata columns for soft matching and expiry
ALTER TABLE public.user_devices ADD COLUMN browser text;
ALTER TABLE public.user_devices ADD COLUMN os text;
ALTER TABLE public.user_devices ADD COLUMN device_type text;
ALTER TABLE public.user_devices ADD COLUMN expires_at timestamptz DEFAULT (now() + interval '90 days');
ALTER TABLE public.user_devices ADD COLUMN is_active boolean DEFAULT true;
ALTER TABLE public.user_devices ADD COLUMN last_used_at timestamptz DEFAULT now();

-- Step 5: Index for fast lookups
CREATE INDEX idx_user_devices_user_active ON public.user_devices (user_id) WHERE is_active = true;
