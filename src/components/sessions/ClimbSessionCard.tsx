import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Mountain, Cable, Layers, Clock, Target, CheckCircle2, Zap } from 'lucide-react';
import { BOULDER_TO_FRENCH_RANGE, type BoulderColor } from '@/utils/gradeUtils';

interface ClimbSessionCardProps {
  session: {
    id: string;
    date: string;
    session_type: string;
    duration_min: number | null;
    rpe_1_10: number | null;
    description: string | null;
    notes?: string | null;
    gyms?: { name: string; city?: string } | null;
    climbs?: Array<{
      id: string;
      sent: boolean;
      flash?: boolean;
      color_band?: string | null;
      grade_value?: string | null;
      discipline?: string;
    }>;
  };
  onClick?: () => void;
}

const sessionTypeConfig: Record<string, { label: string; icon: React.ReactNode; colorClass: string }> = {
  boulder: { 
    label: 'Boulder', 
    icon: <Mountain className="h-3 w-3" />,
    colorClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20 border-l-orange-500'
  },
  rope: { 
    label: 'Cuerda', 
    icon: <Cable className="h-3 w-3" />,
    colorClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20 border-l-blue-500'
  },
  hybrid: { 
    label: 'Mixto', 
    icon: <Layers className="h-3 w-3" />,
    colorClass: 'bg-purple-500/10 text-purple-600 border-purple-500/20 border-l-purple-500'
  },
  training: { 
    label: 'Entrenamiento', 
    icon: <Target className="h-3 w-3" />,
    colorClass: 'bg-green-500/10 text-green-600 border-green-500/20 border-l-green-500'
  },
};

export const ClimbSessionCard = ({ session, onClick }: ClimbSessionCardProps) => {
  const config = sessionTypeConfig[session.session_type] || sessionTypeConfig.boulder;
  const climbs = session.climbs || [];
  const climbCount = climbs.length;
  const sendCount = climbs.filter(c => c.sent).length;
  const flashCount = climbs.filter(c => c.flash).length;
  const sendRate = climbCount > 0 ? Math.round((sendCount / climbCount) * 100) : 0;
  
  // Obtener el grado máximo enviado
  const maxGrade = climbs
    .filter(c => c.sent)
    .reduce((max, c) => {
      if (c.color_band) return c.color_band;
      if (c.grade_value) return c.grade_value;
      return max;
    }, null as string | null);

  const borderColorClass = config.colorClass.split(' ').find(c => c.startsWith('border-l-')) || 'border-l-orange-500';

  return (
    <Card 
      className={`card-elevated cursor-pointer hover:border-primary/50 transition-colors border-l-4 ${borderColorClass}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex items-center justify-between flex-wrap gap-1 sm:gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base sm:text-lg font-bold whitespace-nowrap">
              {format(new Date(session.date), 'dd MMM', { locale: es })}
            </span>
            <Badge 
              variant="outline" 
              className={`${config.colorClass.replace(/border-l-\S+/, '')} gap-1 text-xs`}
            >
              {config.icon}
              <span className="hidden sm:inline">{config.label}</span>
            </Badge>
          </div>
          {session.gyms?.name && (
            <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
              {session.gyms.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
        {/* Métricas principales */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {/* Escaladas */}
          <div>
            <div className="text-muted-foreground text-[10px] sm:text-xs mb-0.5">
              Escaladas
            </div>
            <div className="text-lg sm:text-2xl font-bold">
              {climbCount}
            </div>
          </div>
          
          {/* Envíos */}
          <div>
            <div className="text-muted-foreground text-[10px] sm:text-xs mb-0.5">
              Envíos
            </div>
            <div className="text-base sm:text-lg font-semibold text-green-500">
              {sendCount}
              <span className="text-xs text-muted-foreground ml-0.5">
                ({sendRate}%)
              </span>
            </div>
          </div>
          
          {/* Duración */}
          {session.duration_min && (
            <div>
              <div className="text-muted-foreground text-[10px] sm:text-xs mb-0.5">
                Duración
              </div>
              <div className="text-base sm:text-lg font-semibold">
                {session.duration_min}<span className="text-xs text-muted-foreground ml-0.5">min</span>
              </div>
            </div>
          )}
          
          {/* RPE */}
          {session.rpe_1_10 && (
            <div>
              <div className="text-muted-foreground text-[10px] sm:text-xs mb-0.5">RPE</div>
              <Badge variant={session.rpe_1_10 >= 8 ? 'destructive' : 'secondary'} className="text-xs">
                {session.rpe_1_10}/10
              </Badge>
            </div>
          )}
        </div>

        {/* Extras: grado máximo y flashes */}
        {(maxGrade || flashCount > 0) && (
          <div className="flex items-center gap-3 flex-wrap">
            {maxGrade && (
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">Max:</span>
                <Badge variant="outline" className="font-semibold">
                  {maxGrade}
                  {session.session_type === 'boulder' && BOULDER_TO_FRENCH_RANGE[maxGrade?.toLowerCase() as BoulderColor] && (
                    <span className="text-muted-foreground ml-1">
                      ≈ {BOULDER_TO_FRENCH_RANGE[maxGrade?.toLowerCase() as BoulderColor]}
                    </span>
                  )}
                </Badge>
              </div>
            )}
            {flashCount > 0 && (
              <div className="flex items-center gap-1 text-sm text-yellow-500">
                <Zap className="h-3 w-3" />
                {flashCount} flash{flashCount > 1 ? 'es' : ''}
              </div>
            )}
          </div>
        )}

        {/* Footer: descripción */}
        {(session.description || session.notes) && (
          <div className="pt-2 border-t border-border/50">
            <div className="text-sm text-muted-foreground truncate">
              {session.description || session.notes}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
