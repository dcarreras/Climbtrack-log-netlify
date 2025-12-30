-- Custom hangboard protocols table
CREATE TABLE public.hangboard_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  hang_time INTEGER NOT NULL DEFAULT 7,
  rest_time INTEGER NOT NULL DEFAULT 3,
  sets INTEGER NOT NULL DEFAULT 6,
  rest_between_sets INTEGER NOT NULL DEFAULT 180,
  grip_type TEXT NOT NULL DEFAULT 'Half Crimp',
  reps_per_set INTEGER NOT NULL DEFAULT 6,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Training sessions log (hangboard and strength)
CREATE TABLE public.training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('hangboard', 'strength', 'density')),
  protocol_name TEXT NOT NULL,
  grip_type TEXT,
  hang_time INTEGER,
  rest_time INTEGER,
  sets_completed INTEGER NOT NULL DEFAULT 0,
  total_sets INTEGER NOT NULL DEFAULT 0,
  added_weight_kg NUMERIC,
  duration_seconds INTEGER,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hangboard_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for hangboard_protocols
CREATE POLICY "Users can view their own protocols" 
ON public.hangboard_protocols 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own protocols" 
ON public.hangboard_protocols 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own protocols" 
ON public.hangboard_protocols 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own protocols" 
ON public.hangboard_protocols 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for training_sessions
CREATE POLICY "Users can view their own training sessions" 
ON public.training_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own training sessions" 
ON public.training_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training sessions" 
ON public.training_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_hangboard_protocols_updated_at
BEFORE UPDATE ON public.hangboard_protocols
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();