import { useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday, isFuture, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, CheckCircle2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  date: string;
  session_type: string;
  gyms?: { name: string } | null;
  climbs?: any[];
}

interface WeeklyCalendarProps {
  sessions: Session[];
  plannedSessions?: { date: string; notes?: string }[];
}

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
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <span className="text-base">Esta semana</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-normal">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-success" />
              {weekStats.completed}
            </span>
            {weekStats.planned > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Target className="h-4 w-4" />
                {weekStats.planned}
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className={cn(
                "flex flex-col items-center p-2 md:p-3 rounded-lg transition-all",
                day.isToday && "bg-primary/20 ring-1 ring-primary",
                !day.isToday && day.hasSession && "bg-success/10",
                !day.isToday && day.hasPlanned && !day.hasSession && "bg-secondary",
                !day.isToday && !day.hasSession && !day.hasPlanned && "bg-muted/30"
              )}
            >
              <span className="text-[10px] md:text-xs text-muted-foreground uppercase">
                {day.dayName}
              </span>
              <span className={cn(
                "text-lg md:text-xl font-bold mt-1",
                day.isToday && "text-primary",
                day.hasSession && !day.isToday && "text-success"
              )}>
                {day.dayNumber}
              </span>
              
              {/* Indicators */}
              <div className="flex gap-1 mt-1.5">
                {day.hasSession && (
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                )}
                {day.hasPlanned && !day.hasSession && (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                )}
              </div>
              
              {/* Session info on larger screens */}
              {day.sessions.length > 0 && (
                <div className="hidden md:block mt-2 text-center">
                  <span className="text-[10px] text-success capitalize truncate block">
                    {day.sessions[0].session_type}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-success" />
            Completado
          </span>
          <span className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary/60" />
            Planificado
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
