import { useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday, isFuture, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bike, Cable, Dumbbell, Footprints, Layers3, Mountain, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  date: string;
  session_type: string;
  gyms?: { name: string } | null;
}

interface WeeklyCalendarProps {
  sessions: Session[];
  plannedSessions?: { date: string; notes?: string }[];
}

const sessionIconMap: Record<string, typeof Mountain> = {
  boulder: Mountain,
  bike: Bike,
  hybrid: Layers3,
  rope: Cable,
  running: Footprints,
  training: Dumbbell,
};

export default function WeeklyCalendar({ sessions, plannedSessions = [] }: WeeklyCalendarProps) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const sessionsOnDay = sessions.filter(s => 
        isSameDay(parseISO(s.date), date)
      );
      
      const plannedOnDay = plannedSessions.filter(p => 
        isSameDay(parseISO(p.date), date)
      );

      return {
        date,
        dateStr,
        dayName: format(date, 'EEE', { locale: es }),
        dayNumber: format(date, 'd'),
        isToday: isToday(date),
        isFuture: isFuture(date),
        sessions: sessionsOnDay,
        planned: plannedOnDay,
        primarySession: sessionsOnDay[0] || null,
        hasSession: sessionsOnDay.length > 0,
        hasPlanned: plannedOnDay.length > 0,
      };
    });
  }, [sessions, plannedSessions, weekStart]);

  const weekStats = useMemo(() => {
    const completed = weekDays.filter(d => d.hasSession).length;
    const planned = weekDays.filter(d => d.hasPlanned && !d.hasSession).length;
    return { completed, planned, total: completed + planned };
  }, [weekDays]);

  return (
    <div className="border-y border-white/10 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
          Semana actual
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-white/42">
          <span>{weekStats.completed} completados</span>
          {weekStats.planned > 0 && <span>{weekStats.planned} pendientes</span>}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const SessionIcon = day.primarySession
            ? sessionIconMap[day.primarySession.session_type] || Mountain
            : null;

          return (
            <div
              key={day.dateStr}
              className={cn(
                'flex min-h-[110px] flex-col items-center rounded-none border border-transparent px-1 py-2 text-center transition-colors',
                day.isToday && 'border-white/20 bg-white/[0.03]',
                !day.isToday && day.hasSession && 'bg-white/[0.02]',
                !day.isToday && !day.hasSession && day.hasPlanned && 'bg-white/[0.015]',
              )}
            >
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                {day.dayName}
              </span>
              <span
                className={cn(
                  'mt-2 text-2xl font-semibold tracking-[-0.03em] text-white/86',
                  day.isToday && 'text-white',
                )}
              >
                {day.dayNumber}
              </span>

              <div className="mt-4 flex min-h-8 items-center">
                {day.hasSession && SessionIcon ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-white text-black">
                    <SessionIcon className="h-3.5 w-3.5" />
                  </div>
                ) : day.hasPlanned ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-transparent text-white/60">
                    <Target className="h-3.5 w-3.5" />
                  </div>
                ) : (
                  <div className="h-2 w-2 rounded-full bg-white/12" />
                )}
              </div>

              <div className="mt-auto pt-4">
                <div
                  className={cn(
                    'mx-auto h-[2px] w-8 bg-transparent',
                    day.isToday && 'bg-[#E23A1F]',
                    !day.isToday && day.hasSession && 'bg-white/16',
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-[10px] uppercase tracking-[0.16em] text-white/42">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white" />
          Registrado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white/20" />
          Planificado
        </span>
      </div>
    </div>
  );
}
