-- Add 'running' to session_type enum
ALTER TYPE session_type ADD VALUE IF NOT EXISTS 'running';

-- Add distance and time columns to planned_sessions
ALTER TABLE public.planned_sessions 
ADD COLUMN IF NOT EXISTS distance_km numeric,
ADD COLUMN IF NOT EXISTS time_min integer;

-- Add distance and time columns to sessions table too for consistency
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS distance_km numeric,
ADD COLUMN IF NOT EXISTS time_min integer;