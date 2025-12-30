-- Create planned_sessions table for trainer-planned sessions
CREATE TABLE public.planned_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  session_type public.session_type NOT NULL DEFAULT 'boulder',
  gym_id UUID REFERENCES public.gyms(id) ON DELETE SET NULL,
  notes TEXT,
  trainer_notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.planned_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own planned sessions"
ON public.planned_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own planned sessions"
ON public.planned_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planned sessions"
ON public.planned_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planned sessions"
ON public.planned_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_planned_sessions_updated_at
BEFORE UPDATE ON public.planned_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster date queries
CREATE INDEX idx_planned_sessions_date ON public.planned_sessions(user_id, date);