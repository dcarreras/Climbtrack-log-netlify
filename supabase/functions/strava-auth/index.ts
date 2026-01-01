import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

// Define allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://radiant-malasada-d6751a.netlify.app',
];

// Add any production domains dynamically from environment
const PRODUCTION_URL = Deno.env.get('SITE_URL');
if (PRODUCTION_URL) {
  ALLOWED_ORIGINS.push(PRODUCTION_URL);
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) || 
    origin.endsWith('.supabase.co') ||
    origin.endsWith('.netlify.app')
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

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log('Strava auth action:', action);

    // Generate auth URL for OAuth redirect
    if (action === 'get-auth-url') {
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

      const redirectUri = `${SUPABASE_URL}/functions/v1/strava-auth?action=callback`;
      const scope = 'read,activity:read_all';
      const state = user.id; // Pass user ID as state for callback

      const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;

      console.log('Generated auth URL for user:', user.id);

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle OAuth callback from Strava
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state'); // This is the user_id
      const error = url.searchParams.get('error');

      // Define allowed origins for postMessage - same list as CORS
      const allowedOriginsJson = JSON.stringify([
        ...ALLOWED_ORIGINS,
      ]);

      if (error) {
        console.error('Strava auth error:', error);
        return new Response(`
          <html>
            <body>
              <script>
                const allowedOrigins = ${allowedOriginsJson};
                const isAllowedOrigin = window.opener && (
                  allowedOrigins.includes(window.opener.origin) ||
                  window.opener.origin.endsWith('.supabase.co') ||
                  window.opener.origin.endsWith('.netlify.app')
                );
                if (isAllowedOrigin) {
                  window.opener.postMessage({ type: 'strava-auth-error', error: 'Authorization denied' }, window.opener.origin);
                }
                window.close();
              </script>
              <p>Error: Authorization was denied. You can close this window.</p>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (!code || !state) {
        throw new Error('Missing code or state parameter');
      }

      console.log('Exchanging code for tokens, user:', state);

      // Exchange code for tokens
      const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        throw new Error('Failed to exchange code for tokens');
      }

      const tokenData = await tokenResponse.json();
      console.log('Token exchange successful, athlete:', tokenData.athlete?.id);

      // Store tokens in database
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      const { error: upsertError } = await supabase
        .from('strava_connections')
        .upsert({
          user_id: state,
          athlete_id: tokenData.athlete.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (upsertError) {
        console.error('Failed to store tokens:', upsertError);
        throw new Error('Failed to store Strava connection');
      }

      console.log('Strava connection stored successfully');

      // Return success page that communicates with opener using restricted origin
      return new Response(`
        <html>
          <body>
            <script>
              const allowedOrigins = ${allowedOriginsJson};
              const isAllowedOrigin = window.opener && (
                allowedOrigins.includes(window.opener.origin) ||
                window.opener.origin.endsWith('.supabase.co') ||
                window.opener.origin.endsWith('.netlify.app')
              );
              if (isAllowedOrigin) {
                window.opener.postMessage({ type: 'strava-auth-success' }, window.opener.origin);
              }
              window.close();
            </script>
            <p>Successfully connected to Strava! You can close this window.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Disconnect from Strava
    if (action === 'disconnect') {
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

      // Delete connection
      const { error: deleteError } = await supabase
        .from('strava_connections')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      // Also delete synced activities
      await supabase
        .from('strava_activities')
        .delete()
        .eq('user_id', user.id);

      console.log('Strava disconnected for user:', user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Strava auth error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
