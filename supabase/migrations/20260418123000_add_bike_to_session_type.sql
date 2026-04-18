-- Add 'bike' to session_type enum
ALTER TYPE public.session_type ADD VALUE IF NOT EXISTS 'bike';
