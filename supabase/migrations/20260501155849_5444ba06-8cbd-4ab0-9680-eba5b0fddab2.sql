-- Improve vehicles.station_id integrity & performance
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_station_id_fkey;

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_station_id_fkey
  FOREIGN KEY (station_id) REFERENCES public.stations(id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_station_id ON public.vehicles(station_id);