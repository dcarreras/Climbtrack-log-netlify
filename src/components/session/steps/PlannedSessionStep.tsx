import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Check, Dumbbell, Mountain, ArrowRight, Plus, Footprints } from 'lucide-react';
import { cn } from '@/lib/utils';
import PlannedSessionSummaryCard from '../PlannedSessionSummaryCard';
import type { Database } from '@/integrations/supabase/types';

type PlannedSession = Database['public']['Tables']['planned_sessions']['Row'];

interface PlannedSessionStepProps {
  value: string | null;
  onChange: (value: string | null, sessionType?: string) => void;
  onNext: () => void;
}

const sessionTypeIcons: Record<string, React.ReactNode> = {
  boulder: <Mountain className="h-5 w-5" />,
  rope: <Mountain className="h-5 w-5" />,
  hybrid: <Mountain className="h-5 w-5" />,
  training: <Dumbbell className="h-5 w-5" />,
  running: <Footprints className="h-5 w-5" />,
};

const sessionTypeLabels: Record<string, string> = {
  boulder: 'Boulder',
  rope: 'Cuerda',
  hybrid: 'Híbrida',
  training: 'Entrenamiento',
  running: 'Running',
};

export default function PlannedSessionStep({ value, onChange, onNext }: PlannedSessionStepProps) {
  const { user } = useAuth();
  const [showSummary, setShowSummary] = useState(false);

  const { data: plannedSessions = [], isLoading } = useQuery({
    queryKey: ['planned-sessions-pending', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planned_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('completed', false)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as PlannedSession[];
    },
    enabled: !!user,
  });

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoy';
    if (isPast(date)) return format(date, "d MMM", { locale: es });
    return format(date, "d MMM", { locale: es });
  };

  const getDateClass = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'text-primary font-semibold';
    if (isPast(date)) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const selectedSession = plannedSessions.find(s => s.id === value);

  const handleContinue = () => {
    if (value && !showSummary) {
      setShowSummary(true);
    } else {
      onNext();
    }
  };

  const handleSelectSession = (sessionId: string | null, sessionType?: string) => {
    onChange(sessionId, sessionType);
    setShowSummary(false);
  };

  // Show summary card when a planned session is selected and Continue was pressed
  if (showSummary && selectedSession) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Preparando sesión</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {sessionTypeLabels[selectedSession.session_type]} - {getDateLabel(selectedSession.date)}
          </p>
        </div>

        <PlannedSessionSummaryCard
          session={{
            id: selectedSession.id,
            session_type: selectedSession.session_type,
            trainer_notes: selectedSession.trainer_notes,
            notes: selectedSession.notes,
            distance_km: selectedSession.distance_km,
            time_min: selectedSession.time_min,
          }}
          onStart={onNext}
        />

        <Button 
          variant="ghost" 
          onClick={() => setShowSummary(false)} 
          className="w-full"
        >
          ← Volver a selección
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Nueva Sesión</h2>
        <p className="text-muted-foreground mt-1">
          ¿Quieres registrar una sesión planificada?
        </p>
      </div>

      <div className="space-y-3">
        {/* Option: New session without plan */}
        <Card
          className={cn(
            "p-4 cursor-pointer transition-all border-2",
            value === null
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          )}
          onClick={() => handleSelectSession(null)}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center",
              value === null ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <Plus className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Sesión libre</h3>
              <p className="text-sm text-muted-foreground">
                Registrar una sesión sin vincular a planificación
              </p>
            </div>
            {value === null && <Check className="h-5 w-5 text-primary" />}
          </div>
        </Card>

        {/* Planned sessions */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando sesiones planificadas...
          </div>
        ) : plannedSessions.length > 0 ? (
          <>
            <div className="pt-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Sesiones planificadas
              </p>
            </div>
            {plannedSessions.map((session) => (
              <Card
                key={session.id}
                className={cn(
                  "p-4 cursor-pointer transition-all border-2",
                  value === session.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => handleSelectSession(session.id, session.session_type)}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center shrink-0",
                    value === session.id ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {sessionTypeIcons[session.session_type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">
                        {sessionTypeLabels[session.session_type]}
                      </h3>
                      <span className={cn("text-sm", getDateClass(session.date))}>
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {getDateLabel(session.date)}
                      </span>
                    </div>
                    {session.trainer_notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {session.trainer_notes}
                      </p>
                    )}
                    {session.notes && !session.trainer_notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {session.notes}
                      </p>
                    )}
                  </div>
                  {value === session.id && <Check className="h-5 w-5 text-primary shrink-0" />}
                </div>
              </Card>
            ))}
          </>
        ) : (
          <p className="text-sm text-center text-muted-foreground py-4">
            No tienes sesiones planificadas pendientes
          </p>
        )}
      </div>

      <Button onClick={handleContinue} className="w-full" size="lg">
        Continuar
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
