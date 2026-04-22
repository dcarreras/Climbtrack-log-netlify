import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { getAllowedOrigins, getCorsHeaders } from "../_shared/cors.ts";

const STRAVA_CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID');
const STRAVA_CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface StravaConnectionRow {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

async function linkMatchingPlannedSession(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sessionId: string,
  sessionType: string,
  dateStr: string,
): Promise<string | null> {
  const { data: plannedSession, error: plannedError } = await supabase
    .from('planned_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('date', dateStr)
    .eq('session_type', sessionType)
    .eq('completed', false)
    .order('created_at', { ascending: true })
    .maybeSingle();

  if (plannedError) {
    console.error('Error finding matching planned session:', plannedError);
    return null;
  }

  if (!plannedSession) return null;

  const { error: sessionLinkError } = await supabase
    .from('sessions')
    .update({ planned_session_id: plannedSession.id })
    .eq('id', sessionId);

  if (sessionLinkError) {
    console.error('Error linking session to planned session:', sessionLinkError);
    return null;
  }

  const { error: plannedUpdateError } = await supabase
    .from('planned_sessions')
    .update({
      completed: true,
      completed_session_id: sessionId,
    })
    .eq('id', plannedSession.id);

  if (plannedUpdateError) {
    console.error('Error marking planned session as completed:', plannedUpdateError);
    return null;
  }

  return plannedSession.id;
}

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

  // Cycling activities
  if (type.includes('ride') || type.includes('cycling') || type.includes('virtualride') || type.includes('ebikeride')) {
    return 'bike';
  }
  
  // For other activities like swimming, yoga or hiking, we'll still sync them as training
  if (type.includes('swim') || type.includes('yoga') || type.includes('walk') || type.includes('hike')) {
    return 'training';
  }
  
  return null; // Skip activities we don't recognize
}

async function refreshTokenIfNeeded(
  supabase: ReturnType<typeof createClient>,
  connection: StravaConnectionRow,
): Promise<string> {
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
  const allowedOrigins = getAllowedOrigins();
  const corsHeaders = getCorsHeaders(origin, allowedOrigins);

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
      const sessionType = mapStravaTypeToSessionType(activity.type, activity.sport_type);
      const activityDate = new Date(activity.start_date);
      const dateStr = activityDate.toISOString().split('T')[0];

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

          if (existingActivity.synced_to_session_id && sessionType) {
            await linkMatchingPlannedSession(
              supabase,
              user.id,
              existingActivity.synced_to_session_id,
              sessionType,
              dateStr,
            );
          }
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
        if (sessionType) {
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
            elevation_gain_m: activity.total_elevation_gain || null,
            time_min: timeMin,
            duration_min: timeMin,
            status: 'completed',
            completed_at: activity.start_date,
            started_at: activity.start_date,
            paused_ms: 0,
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

            await linkMatchingPlannedSession(
              supabase,
              user.id,
              newSession.id,
              sessionType,
              dateStr,
            );
            
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
  } catch (error: unknown) {
    console.error('Strava sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown Strava sync error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
