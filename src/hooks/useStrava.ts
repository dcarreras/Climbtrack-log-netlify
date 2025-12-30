import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface StravaConnection {
  id: string;
  user_id: string;
  athlete_id: number;
  expires_at: string;
  created_at: string;
}

export interface StravaActivity {
  id: string;
  strava_id: number;
  name: string;
  type: string;
  sport_type: string | null;
  start_date: string;
  distance_meters: number | null;
  moving_time_seconds: number | null;
  elapsed_time_seconds: number | null;
  total_elevation_gain: number | null;
  average_speed: number | null;
  max_speed: number | null;
  average_heartrate: number | null;
  max_heartrate: number | null;
  calories: number | null;
  synced_to_session_id: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ORIGIN = (() => {
  if (!SUPABASE_URL) return null;
  try {
    return new URL(SUPABASE_URL).origin;
  } catch {
    return null;
  }
})();
const FUNCTIONS_BASE_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : '';

const ALLOWED_ORIGINS = [
  window.location.origin,
  SUPABASE_ORIGIN,
].filter(Boolean) as string[];

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.supabase.co');
}

export const useStrava = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const { user } = useAuth();

  // Listen for auth popup messages with origin validation
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isAllowedOrigin(event.origin)) {
        console.warn('Rejected postMessage from untrusted origin:', event.origin);
        return;
      }

      if (event.data?.type === 'strava-auth-success') {
        queryClient.invalidateQueries({ queryKey: ['strava-connection', user?.id] });
        toast({
          title: 'Strava conectado',
          description: 'Tu cuenta de Strava ha sido vinculada correctamente.',
        });
      } else if (event.data?.type === 'strava-auth-error') {
        toast({
          title: 'Error de conexion',
          description: 'No se pudo conectar con Strava.',
          variant: 'destructive',
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [queryClient, toast, user?.id]);

  // Check if user has Strava connected
  const { data: connection, isLoading: isLoadingConnection } = useQuery({
    queryKey: ['strava-connection', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await (supabase
        .from('strava_connections' as any)
        .select('id, user_id, athlete_id, expires_at, created_at')
        .eq('user_id', user.id)
        .maybeSingle() as any);
      
      if (error) throw error;
      return data as StravaConnection | null;
    },
    enabled: !!user?.id,
  });

  // Get synced activities
  const { data: activities, isLoading: isLoadingActivities } = useQuery({
    queryKey: ['strava-activities', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase
        .from('strava_activities' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false }) as any);
      
      if (error) throw error;
      return data as StravaActivity[];
    },
    enabled: !!connection && !!user?.id,
  });

  // Connect to Strava
  const connectStrava = useCallback(async () => {
    if (!FUNCTIONS_BASE_URL) {
      toast({
        title: 'Configuracion incompleta',
        description: 'Falta definir VITE_SUPABASE_URL para conectar con Strava.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Error',
          description: 'Debes iniciar sesion para conectar Strava.',
          variant: 'destructive',
        });
        return;
      }
      
      const response = await fetch(
        `${FUNCTIONS_BASE_URL}/strava-auth?action=get-auth-url`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }

      const { authUrl } = await response.json();
      
      // Open popup for OAuth
      const popup = window.open(authUrl, 'strava-auth', 'width=600,height=700');
      if (!popup) {
        toast({
          title: 'Error',
          description: 'Por favor, permite las ventanas emergentes para conectar Strava.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error connecting Strava:', error);
      toast({
        title: 'Error',
        description: 'No se pudo iniciar la conexion con Strava.',
        variant: 'destructive',
      });
    }
  }, [toast, user?.id]);

  // Disconnect from Strava
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!FUNCTIONS_BASE_URL) {
        throw new Error('Falta VITE_SUPABASE_URL para desconectar Strava');
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${FUNCTIONS_BASE_URL}/strava-auth?action=disconnect`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strava-connection', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['strava-activities', user?.id] });
      toast({
        title: 'Strava desconectado',
        description: 'Tu cuenta de Strava ha sido desvinculada.',
      });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Error',
        description: 'No se pudo desconectar Strava.',
        variant: 'destructive',
      });
    },
  });

  // Sync activities
  const syncActivities = useCallback(async () => {
    if (!FUNCTIONS_BASE_URL) {
      toast({
        title: 'Configuracion incompleta',
        description: 'Falta definir VITE_SUPABASE_URL para sincronizar Strava.',
        variant: 'destructive',
      });
      return;
    }

    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${FUNCTIONS_BASE_URL}/strava-sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const data = await response.json();

      queryClient.invalidateQueries({ queryKey: ['strava-activities', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
      
      const sessionsMsg = data.sessionsCreated > 0 
        ? ` y se crearon ${data.sessionsCreated} sesiones de entrenamiento.`
        : '.';
      toast({
        title: 'Sincronizacion completada',
        description: `Se sincronizaron ${data.syncedCount} actividades${sessionsMsg}`,
      });
    } catch (error: any) {
      console.error('Error syncing activities:', error);
      toast({
        title: 'Error de sincronizacion',
        description: 'No se pudieron sincronizar las actividades.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, queryClient, toast, user?.id]);

  return {
    isConnected: !!connection,
    connection,
    activities: activities || [],
    isLoading: isLoadingConnection,
    isLoadingActivities,
    isSyncing,
    connectStrava,
    disconnectStrava: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    syncActivities,
  };
};
