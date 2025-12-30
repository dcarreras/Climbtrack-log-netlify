import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

// Define allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
];

// Add any production domains dynamically from environment
const PRODUCTION_URL = Deno.env.get('SITE_URL');
if (PRODUCTION_URL) {
  ALLOWED_ORIGINS.push(PRODUCTION_URL);
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) || 
    origin.endsWith('.supabase.co')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed && origin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const STRAVA_CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID');
const STRAVA_CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Map Strava activity types to session types
function mapStravaTypeToSessionType(stravaType: string, sportType: string | null): string | null {
  const type = (sportType || stravaType).toLowerCase();
  
  // Running activities
  if (type.includes('run') || type.includes('trail')) {
    return 'running';
  }
  
  // Climbing activities (Strava doesn't have great climbing support but check anyway)
  if (type.includes('climb') || type.includes('boulder')) {
    return 'boulder';
  }
  
  // Training/workout activities
  if (type.includes('workout') || type.includes('weight') || type.includes('crossfit') || type.includes('hiit')) {
    return 'training';
  }
  
  // For other activities like cycling, swimming, etc. - we'll still sync them as 'training'
  // so users can see all their cross-training
  if (type.includes('ride') || type.includes('cycling') || type.includes('swim') || type.includes('yoga') || type.includes('walk') || type.includes('hike')) {
    return 'training';
  }
  
  return null; // Skip activities we don't recognize
}

async function refreshTokenIfNeeded(supabase: any, connection: any): Promise<string> {
  const expiresAt = new Date(connection.expires_at);
  const now = new Date();

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Refreshing Strava token for user:', connection.user_id);

    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Strava token');
    }

    const tokenData = await response.json();

    // Update stored tokens
    await supabase
      .from('strava_connections')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
      })
      .eq('user_id', connection.user_id);

    return tokenData.access_token;
  }

  return connection.access_token;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    console.log('Syncing Strava activities for user:', user.id);

    // Get user's Strava connection
    const { data: connection, error: connError } = await supabase
      .from('strava_connections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (connError || !connection) {
      throw new Error('Strava not connected');
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(supabase, connection);

    // Fetch activities from Strava (last 30 days by default)
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    
    const activitiesResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${thirtyDaysAgo}&per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!activitiesResponse.ok) {
      const errorText = await activitiesResponse.text();
      console.error('Failed to fetch activities:', errorText);
      throw new Error('Failed to fetch Strava activities');
    }

    const activities = await activitiesResponse.json();
    console.log(`Fetched ${activities.length} activities from Strava`);

    let syncedCount = 0;
    let sessionsCreated = 0;

    for (const activity of activities) {
      // First, upsert the Strava activity
      const stravaActivity = {
        user_id: user.id,
        strava_id: activity.id,
        name: activity.name,
        type: activity.type,
        sport_type: activity.sport_type,
        start_date: activity.start_date,
        distance_meters: activity.distance,
        moving_time_seconds: activity.moving_time,
        elapsed_time_seconds: activity.elapsed_time,
        total_elevation_gain: activity.total_elevation_gain,
        average_speed: activity.average_speed,
        max_speed: activity.max_speed,
        average_heartrate: activity.average_heartrate,
        max_heartrate: activity.max_heartrate,
        calories: activity.calories,
        raw_data: activity,
      };

      // Check if activity already exists
      const { data: existingActivity } = await supabase
        .from('strava_activities')
        .select('id, synced_to_session_id')
        .eq('strava_id', activity.id)
        .maybeSingle();

      let stravaActivityId: string;
      let alreadyHasSession = false;

      if (existingActivity) {
        // Update existing activity
        const { error } = await supabase
          .from('strava_activities')
          .update(stravaActivity)
          .eq('id', existingActivity.id);
        
        if (!error) {
          syncedCount++;
          stravaActivityId = existingActivity.id;
          alreadyHasSession = !!existingActivity.synced_to_session_id;
        } else {
          console.error('Error updating activity:', error);
          continue;
        }
      } else {
        // Insert new activity
        const { data: newActivity, error } = await supabase
          .from('strava_activities')
          .insert(stravaActivity)
          .select('id')
          .single();
        
        if (!error && newActivity) {
          syncedCount++;
          stravaActivityId = newActivity.id;
        } else {
          console.error('Error inserting activity:', error);
          continue;
        }
      }

      // Create a session for this activity if it doesn't have one yet
      if (!alreadyHasSession) {
        const sessionType = mapStravaTypeToSessionType(activity.type, activity.sport_type);
        
        if (sessionType) {
          const activityDate = new Date(activity.start_date);
          const dateStr = activityDate.toISOString().split('T')[0];
          
          // Convert distance from meters to km
          const distanceKm = activity.distance ? activity.distance / 1000 : null;
          // Convert time from seconds to minutes
          const timeMin = activity.moving_time ? Math.round(activity.moving_time / 60) : null;

          const sessionData = {
            user_id: user.id,
            date: dateStr,
            session_type: sessionType,
            description: `${activity.name} (Strava)`,
            notes: `Importado desde Strava\nTipo: ${activity.sport_type || activity.type}${activity.total_elevation_gain ? `\nDesnivel: ${activity.total_elevation_gain}m` : ''}`,
            distance_km: distanceKm,
            time_min: timeMin,
            duration_min: timeMin,
          };

          const { data: newSession, error: sessionError } = await supabase
            .from('sessions')
            .insert(sessionData)
            .select('id')
            .single();

          if (!sessionError && newSession) {
            // Link the Strava activity to the session
            await supabase
              .from('strava_activities')
              .update({ synced_to_session_id: newSession.id })
              .eq('id', stravaActivityId);
            
            sessionsCreated++;
            console.log(`Created session for activity: ${activity.name}`);
          } else {
            console.error('Error creating session:', sessionError);
          }
        }
      }
    }

    console.log(`Synced ${syncedCount} activities, created ${sessionsCreated} sessions`);

    return new Response(JSON.stringify({ 
      success: true, 
      syncedCount,
      sessionsCreated,
      totalFetched: activities.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Strava sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
