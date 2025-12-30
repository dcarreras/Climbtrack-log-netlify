-- Add description field to sessions table
ALTER TABLE public.sessions 
ADD COLUMN description text;