-- Create table for Strava tokens and activities
CREATE TABLE public.strava_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  athlete_id BIGINT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own Strava connection"
ON public.strava_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Strava connection"
ON public.strava_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Strava connection"
ON public.strava_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Strava connection"
ON public.strava_connections FOR DELETE
USING (auth.uid() = user_id);

-- Create table for synced Strava activities
CREATE TABLE public.strava_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  strava_id BIGINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  sport_type TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  distance_meters NUMERIC,
  moving_time_seconds INTEGER,
  elapsed_time_seconds INTEGER,
  total_elevation_gain NUMERIC,
  average_speed NUMERIC,
  max_speed NUMERIC,
  average_heartrate NUMERIC,
  max_heartrate NUMERIC,
  calories INTEGER,
  synced_to_session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.strava_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own Strava activities"
ON public.strava_activities FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Strava activities"
ON public.strava_activities FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Strava activities"
ON public.strava_activities FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Strava activities"
ON public.strava_activities FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_strava_connections_updated_at
BEFORE UPDATE ON public.strava_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_strava_activities_updated_at
BEFORE UPDATE ON public.strava_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();