-- Add weekly running km goal to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS weekly_running_km_goal numeric DEFAULT 20;

-- Add elevation_gain_m to sessions for running
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS elevation_gain_m numeric;