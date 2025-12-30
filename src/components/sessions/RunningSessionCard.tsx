import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Footprints, Activity, Clock, TrendingUp, Mountain, Route } from 'lucide-react';

interface RunningSessionCardProps {
  session: {
    id: string;
    date: string;
    distance_km: number | null;
    duration_min: number | null;
    time_min?: number | null;
    elevation_gain_m: number | null;
    rpe_1_10: number | null;
    description: string | null;
    notes?: string | null;
    isFromStrava?: boolean;
  };
  onClick?: () => void;
}

export const RunningSessionCard = ({ session, onClick }: RunningSessionCardProps) => {
  const distance = Number(session.distance_km) || 0;
  const duration = session.duration_min || session.time_min || 0;
  const elevation = Number(session.elevation_gain_m) || 0;
  
  // Calcular ritmo (min/km)
  const pace = distance > 0 && duration > 0 
    ? duration / distance 
    : 0;
  const paceMin = Math.floor(pace);
  const paceSec = Math.round((pace - paceMin) * 60);

  return (
    <Card 
      className="card-elevated cursor-pointer hover:border-cyan-500/50 transition-colors border-l-4 border-l-cyan-500"
      onClick={onClick}
    >
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base sm:text-lg font-bold whitespace-nowrap">
              {format(new Date(session.date), 'dd MMM', { locale: es })}
            </span>
            <Badge 
              variant="outline" 
              className="bg-cyan-500/10 text-cyan-600 border-cyan-500/20 gap-1 text-xs"
            >
              <Footprints className="h-3 w-3" />
              <span className="hidden sm:inline">Running</span>
            </Badge>
          </div>
          {session.isFromStrava && (
            <Badge 
              variant="outline" 
              className="bg-orange-500/10 text-orange-500 border-orange-500/30 gap-1 text-xs shrink-0"
            >
              <Activity className="h-3 w-3" />
              <span className="hidden sm:inline">Strava</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
        {/* Métricas principales */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {/* Distancia - métrica principal */}
          <div>
            <div className="text-muted-foreground text-[10px] sm:text-xs mb-0.5">
              Distancia
            </div>
            <div className="text-lg sm:text-2xl font-bold text-cyan-500">
              {distance.toFixed(1)}
              <span className="text-xs sm:text-sm font-normal ml-0.5">km</span>
            </div>
          </div>
          
          {/* Duración */}
          <div>
            <div className="text-muted-foreground text-[10px] sm:text-xs mb-0.5">
              Duración
            </div>
            <div className="text-base sm:text-lg font-semibold">
              {duration}<span className="text-xs text-muted-foreground ml-0.5">min</span>
            </div>
          </div>
          
          {/* Ritmo */}
          {pace > 0 && (
            <div>
              <div className="text-muted-foreground text-[10px] sm:text-xs mb-0.5">
                Ritmo
              </div>
              <div className="text-base sm:text-lg font-semibold">
                {paceMin}:{paceSec.toString().padStart(2, '0')}
                <span className="text-xs text-muted-foreground ml-0.5">/km</span>
              </div>
            </div>
          )}
          
          {/* Elevación */}
          {elevation > 0 && (
            <div>
              <div className="text-muted-foreground text-[10px] sm:text-xs mb-0.5">
                D+
              </div>
              <div className="text-base sm:text-lg font-semibold">
                {elevation.toFixed(0)}<span className="text-xs text-muted-foreground ml-0.5">m</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer: descripción y RPE */}
        {(session.description || session.notes || session.rpe_1_10) && (
          <div className="flex items-center justify-between pt-1 sm:pt-2 border-t border-border/50 gap-2">
            <div className="text-xs sm:text-sm text-muted-foreground truncate flex-1">
              {session.description || session.notes || '-'}
            </div>
            {session.rpe_1_10 && (
              <Badge variant={session.rpe_1_10 >= 8 ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                RPE {session.rpe_1_10}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
