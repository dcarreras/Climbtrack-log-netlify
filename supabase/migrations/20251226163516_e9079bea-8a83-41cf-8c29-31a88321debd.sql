-- Create enums for climbing app
CREATE TYPE public.session_type AS ENUM ('boulder', 'rope', 'hybrid', 'training');
CREATE TYPE public.discipline AS ENUM ('boulder', 'route');
CREATE TYPE public.grade_system AS ENUM ('font', 'v-grade', 'french', 'yds');
CREATE TYPE public.climb_style AS ENUM ('slab', 'vertical', 'overhang', 'roof');
CREATE TYPE public.hold_type AS ENUM ('jugs', 'crimps', 'slopers', 'pinches', 'mixed');
CREATE TYPE public.color_band AS ENUM ('white', 'blue', 'green', 'yellow', 'red', 'black', 'orange', 'purple', 'pink');
CREATE TYPE public.attachment_type AS ENUM ('photo', 'video');

-- Create profiles table for user settings
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  default_grade_system public.grade_system DEFAULT 'v-grade',
  units TEXT DEFAULT 'kg' CHECK (units IN ('kg', 'lb')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create gyms table
CREATE TABLE public.gyms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  gym_id UUID REFERENCES public.gyms(id) ON DELETE SET NULL,
  session_type public.session_type NOT NULL DEFAULT 'boulder',
  duration_min INTEGER,
  rpe_1_10 INTEGER CHECK (rpe_1_10 >= 1 AND rpe_1_10 <= 10),
  body_weight_kg DECIMAL(5,2),
  mood TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create climbs table
CREATE TABLE public.climbs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  discipline public.discipline NOT NULL DEFAULT 'boulder',
  color_band public.color_band,
  grade_system public.grade_system,
  grade_value TEXT,
  style public.climb_style,
  hold_type public.hold_type,
  attempts INTEGER NOT NULL DEFAULT 1,
  sent BOOLEAN NOT NULL DEFAULT false,
  flash BOOLEAN NOT NULL DEFAULT false,
  fall_count INTEGER,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training_blocks table
CREATE TABLE public.training_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  protocol TEXT,
  sets INTEGER,
  reps INTEGER,
  work_sec INTEGER,
  rest_sec INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attachments table
CREATE TABLE public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  climb_id UUID REFERENCES public.climbs(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  type public.attachment_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Gyms are public read, authenticated can insert
CREATE POLICY "Anyone can view gyms" ON public.gyms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create gyms" ON public.gyms FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Sessions policies (private to user)
CREATE POLICY "Users can view their own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions" ON public.sessions FOR DELETE USING (auth.uid() = user_id);

-- Climbs policies (via session ownership)
CREATE POLICY "Users can view their own climbs" ON public.climbs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = climbs.session_id AND sessions.user_id = auth.uid())
);
CREATE POLICY "Users can create climbs in their sessions" ON public.climbs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = session_id AND sessions.user_id = auth.uid())
);
CREATE POLICY "Users can update their own climbs" ON public.climbs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = climbs.session_id AND sessions.user_id = auth.uid())
);
CREATE POLICY "Users can delete their own climbs" ON public.climbs FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = climbs.session_id AND sessions.user_id = auth.uid())
);

-- Training blocks policies
CREATE POLICY "Users can view their own training blocks" ON public.training_blocks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = training_blocks.session_id AND sessions.user_id = auth.uid())
);
CREATE POLICY "Users can create training blocks in their sessions" ON public.training_blocks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = session_id AND sessions.user_id = auth.uid())
);
CREATE POLICY "Users can update their own training blocks" ON public.training_blocks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = training_blocks.session_id AND sessions.user_id = auth.uid())
);
CREATE POLICY "Users can delete their own training blocks" ON public.training_blocks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = training_blocks.session_id AND sessions.user_id = auth.uid())
);

-- Attachments policies
CREATE POLICY "Users can view their own attachments" ON public.attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own attachments" ON public.attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own attachments" ON public.attachments FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
  RETURN new;
END;
$$;

-- Create trigger for new user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_climbs_updated_at BEFORE UPDATE ON public.climbs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample gym
INSERT INTO public.gyms (name, city, country) VALUES ('Sharma Climbing', 'Barcelona', 'Spain');