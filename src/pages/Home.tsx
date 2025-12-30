import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Target, 
  Clock,
  Calendar,
  ChevronRight,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import WeeklyCalendar from '@/components/dashboard/WeeklyCalendar';
import ActivityDonutChart from '@/components/analytics/ActivityDonutChart';
import WeeklyStackedBarChart from '@/components/analytics/WeeklyStackedBarChart';
import { SessionData } from '@/utils/metricsUtils';
import { cn } from '@/lib/utils';

type TimePeriod = '7d' | '4w' | '12w';

const PERIOD_DAYS: Record<TimePeriod, number> = {
  '7d': 7,
  '4w': 28,
  '12w': 84,
};

export default function Home() {
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('4w');

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user!.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: async () => {
      const [sessionsResult, stravaResult] = await Promise.all([
        supabase
          .from('sessions')
          .select('*, gyms(name), climbs(*)')
          .eq('user_id', user!.id)
          .order('date', { ascending: false }),
        supabase
          .from('strava_activities')
          .select('synced_to_session_id')
          .eq('user_id', user!.id)
          .not('synced_to_session_id', 'is', null)
      ]);
      
      if (sessionsResult.error) throw sessionsResult.error;
      
      const stravaSessionIds = new Set(
        stravaResult.data?.map(a => a.synced_to_session_id) || []
      );
      
      return sessionsResult.data.map(session => ({
        ...session,
        isFromStrava: stravaSessionIds.has(session.id)
      })) as (SessionData & { isFromStrava: boolean; gyms?: { name: string } })[];
    },
    enabled: !!user,
  });

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Climber';
  const periodDays = PERIOD_DAYS[timePeriod];

  return (
    <AppLayout>
      <div className="space-y-5 pb-20">
        {/* Header with user info and period filter */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 md:h-12 md:w-12 ring-2 ring-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary text-base">
                {displayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-xl font-bold truncate">
                ¡Hola, {displayName}!
              </h1>
              <p className="text-xs text-muted-foreground">
                Tu resumen de entrenamiento
              </p>
            </div>
            <Link to="/sessions/new" className="hidden md:block flex-shrink-0">
              <Button size="sm" className="glow-primary">
                <Plus className="mr-1.5 h-4 w-4" />
                Nueva Sesión
              </Button>
            </Link>
          </div>
          
          {/* Period Filter + Mobile New Session */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
              {(['7d', '4w', '12w'] as TimePeriod[]).map((period) => (
                <Button
                  key={period}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'px-3 py-1 h-7 text-xs font-medium transition-all',
                    timePeriod === period 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setTimePeriod(period)}
                >
                  {period}
                </Button>
              ))}
            </div>
            
            <Link to="/sessions/new" className="md:hidden">
              <Button size="sm" className="glow-primary h-7 px-3">
                <Plus className="mr-1 h-3.5 w-3.5" />
                Nueva
              </Button>
            </Link>
          </div>
        </div>

        {/* Weekly Calendar */}
        <WeeklyCalendar sessions={sessions} />

        {/* Activity Donut Chart */}
        {!sessionsLoading && (
          <ActivityDonutChart sessions={sessions} periodDays={periodDays} />
        )}

        {/* Weekly Stacked Bar Chart */}
        {!sessionsLoading && (
          <WeeklyStackedBarChart sessions={sessions} periodDays={periodDays} />
        )}

        {/* Recent Sessions */}
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Sesiones Recientes
          </h2>
          
          {sessionsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="card-elevated animate-pulse">
                  <CardContent className="py-3">
                    <div className="h-12 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <Card className="card-elevated">
              <CardContent className="py-10 text-center">
                <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-semibold mb-1">Sin sesiones</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Empieza a trackear tu progreso hoy
                </p>
                <Button size="sm" asChild>
                  <Link to="/sessions/new">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Primera Sesión
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 5).map((session) => (
                <Link key={session.id} to={`/sessions/${session.id}`}>
                  <Card className="card-elevated hover:border-primary/30 transition-all cursor-pointer">
                    <CardContent className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg flex-shrink-0",
                          session.isFromStrava ? 'bg-orange-500/10' : 'bg-primary/10'
                        )}>
                          {session.isFromStrava ? (
                            <Activity className="h-4 w-4 text-orange-500" />
                          ) : (
                            <Calendar className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm flex items-center gap-1.5 flex-wrap">
                            {format(new Date(session.date), 'EEE d MMM', { locale: es })}
                            {session.isFromStrava && (
                              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30 text-[10px] px-1.5 py-0">
                                Strava
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                            <span className="capitalize">{session.session_type}</span>
                            {session.gyms?.name && (
                              <>
                                <span>•</span>
                                <span className="truncate">{session.gyms.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 text-xs flex-shrink-0">
                          <div className="text-center">
                            <div className="font-semibold">{session.climbs?.length || 0}</div>
                            <div className="text-muted-foreground text-[10px]">Vías</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-success">
                              {session.climbs?.filter((c: any) => c.sent).length || 0}
                            </div>
                            <div className="text-muted-foreground text-[10px]">Tops</div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
