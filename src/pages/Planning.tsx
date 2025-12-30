import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Check, Trash2, Calendar as CalendarIcon, Dumbbell, Pencil, MapPin, Clock, Route, CheckCircle2, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';
import EditPlannedSessionDialog from '@/components/planning/EditPlannedSessionDialog';

type SessionType = 'boulder' | 'rope' | 'hybrid' | 'training' | 'running';

interface PlannedSession {
  id: string;
  date: string;
  session_type: SessionType;
  notes: string | null;
  trainer_notes: string | null;
  completed: boolean;
  gym_id: string | null;
  distance_km?: number | null;
  time_min?: number | null;
  gyms?: { name: string } | null;
}

const sessionTypeLabels: Record<SessionType, string> = {
  boulder: 'Boulder',
  rope: 'Vías',
  hybrid: 'Híbrido',
  training: 'Entrenamiento',
  running: 'Running / Trail',
};

const sessionTypeColors: Record<SessionType, string> = {
  boulder: 'bg-orange-500',
  rope: 'bg-blue-500',
  hybrid: 'bg-purple-500',
  training: 'bg-green-500',
  running: 'bg-amber-500',
};

export default function Planning() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<PlannedSession | null>(null);
  const [newSession, setNewSession] = useState({
    session_type: 'boulder' as SessionType,
    notes: '',
    trainer_notes: '',
    distance_km: '',
    time_min: '',
  });

  // Fetch planned sessions
  const { data: plannedSessions = [], isLoading } = useQuery({
    queryKey: ['planned-sessions', user?.id, format(month, 'yyyy-MM')],
    queryFn: async () => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      
      const { data, error } = await supabase
        .from('planned_sessions')
        .select('*, gyms(name)')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;
      return data as PlannedSession[];
    },
    enabled: !!user,
  });

  // Fetch gyms for selection
  const { data: gyms = [] } = useQuery({
    queryKey: ['gyms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gyms').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Create planned session
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user');
      
      const { error } = await supabase.from('planned_sessions').insert({
        user_id: user.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        session_type: newSession.session_type,
        notes: newSession.notes || null,
        trainer_notes: newSession.trainer_notes || null,
        distance_km: newSession.distance_km ? parseFloat(newSession.distance_km) : null,
        time_min: newSession.time_min ? parseInt(newSession.time_min) : null,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Sesión planificada añadida');
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
      setDialogOpen(false);
      setNewSession({ session_type: 'boulder', notes: '', trainer_notes: '', distance_km: '', time_min: '' });
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    },
  });

  // Toggle completed
  const toggleCompletedMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('planned_sessions')
        .update({ completed })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
    },
  });

  // Delete planned session
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('planned_sessions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Sesión eliminada');
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
    },
  });

  // Get sessions for selected date
  const selectedDateSessions = plannedSessions.filter((s) =>
    isSameDay(new Date(s.date), selectedDate)
  );

  // Get dates with sessions for calendar highlighting
  const datesWithSessions = plannedSessions.reduce((acc, session) => {
    const dateStr = session.date;
    if (!acc[dateStr]) {
      acc[dateStr] = { types: [], completed: session.completed };
    }
    acc[dateStr].types.push(session.session_type);
    return acc;
  }, {} as Record<string, { types: SessionType[]; completed: boolean }>);

  // Stats
  const completedSessions = plannedSessions.filter(s => s.completed);
  const pendingSessions = plannedSessions.filter(s => !s.completed);
  const totalPlannedKm = plannedSessions.reduce((acc, s) => acc + (Number(s.distance_km) || 0), 0);
  const completedKm = completedSessions.reduce((acc, s) => acc + (Number(s.distance_km) || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Planificación</h1>
            <p className="text-muted-foreground">Sesiones planificadas por tu entrenadora</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="card-elevated">
            <CardContent className="p-3 text-center">
              <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-green-500">{completedSessions.length}</div>
              <div className="text-xs text-muted-foreground">Completadas</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-3 text-center">
              <CircleDashed className="h-4 w-4 text-amber-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-amber-500">{pendingSessions.length}</div>
              <div className="text-xs text-muted-foreground">Pendientes</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-3 text-center">
              <Route className="h-4 w-4 text-cyan-500 mx-auto mb-1" />
              <div className="text-xl font-bold text-cyan-500">{completedKm.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">km completados</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-3 text-center">
              <MapPin className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <div className="text-xl font-bold">{totalPlannedKm.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">km planificados</div>
            </CardContent>
          </Card>
        </div>

        {/* Completed Sessions List */}
        {completedSessions.length > 0 && (
          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Sesiones completadas este mes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {completedSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('w-2 h-2 rounded-full', sessionTypeColors[session.session_type])} />
                    <div>
                      <div className="text-sm font-medium">
                        {sessionTypeLabels[session.session_type]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(session.date), "d 'de' MMMM", { locale: es })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {session.distance_km && (
                      <span className="flex items-center gap-1">
                        <Route className="h-3 w-3" />
                        {session.distance_km} km
                      </span>
                    )}
                    {session.time_min && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {session.time_min} min
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Calendar */}
        <Card className="card-elevated">
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              month={month}
              onMonthChange={setMonth}
              locale={es}
              className="pointer-events-auto w-full"
              modifiers={{
                hasSession: (date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  return !!datesWithSessions[dateStr];
                },
              }}
              modifiersStyles={{
                hasSession: {
                  fontWeight: 'bold',
                },
              }}
              components={{
                Day: ({ date, ...props }) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const sessionData = datesWithSessions[dateStr];
                  const isSelected = isSameDay(date, selectedDate);
                  
                  return (
                    <button
                      {...props}
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        'relative w-full h-10 flex flex-col items-center justify-center rounded-md transition-colors',
                        isSelected && 'bg-primary text-primary-foreground',
                        !isSelected && 'hover:bg-accent'
                      )}
                    >
                      <span>{date.getDate()}</span>
                      {sessionData && (
                        <div className="absolute bottom-1 flex gap-0.5">
                          {sessionData.types.slice(0, 3).map((type, i) => (
                            <div
                              key={i}
                              className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                sessionTypeColors[type],
                                sessionData.completed && 'opacity-50'
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Selected Date Sessions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
            </h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva sesión planificada</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Tipo de sesión</Label>
                    <Select
                      value={newSession.session_type}
                      onValueChange={(v) => setNewSession({ ...newSession, session_type: v as SessionType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(sessionTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Running specific fields */}
                  {newSession.session_type === 'running' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Distancia (km)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="10.5"
                          value={newSession.distance_km}
                          onChange={(e) => setNewSession({ ...newSession, distance_km: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tiempo (min)</Label>
                        <Input
                          type="number"
                          placeholder="60"
                          value={newSession.time_min}
                          onChange={(e) => setNewSession({ ...newSession, time_min: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Notas de la entrenadora</Label>
                    <Textarea
                      value={newSession.trainer_notes}
                      onChange={(e) => setNewSession({ ...newSession, trainer_notes: e.target.value })}
                      placeholder="Instrucciones del entrenamiento..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Mis notas</Label>
                    <Textarea
                      value={newSession.notes}
                      onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                      placeholder="Notas personales..."
                      rows={2}
                    />
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                  >
                    Añadir sesión
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {selectedDateSessions.length === 0 ? (
            <Card className="card-elevated">
              <CardContent className="p-6 text-center text-muted-foreground">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay sesiones planificadas para este día</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {selectedDateSessions.map((session) => (
                <Card 
                  key={session.id} 
                  className={cn(
                    'card-elevated transition-opacity',
                    session.completed && 'opacity-60'
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            className={cn(
                              'text-white',
                              sessionTypeColors[session.session_type]
                            )}
                          >
                            {sessionTypeLabels[session.session_type]}
                          </Badge>
                          {session.completed && (
                            <Badge variant="secondary">
                              <Check className="h-3 w-3 mr-1" />
                              Completada
                            </Badge>
                          )}
                        </div>
                        
                        {session.trainer_notes && (
                          <div className="mb-2">
                            <p className="text-xs text-muted-foreground font-medium mb-1">
                              <Dumbbell className="h-3 w-3 inline mr-1" />
                              Entrenadora:
                            </p>
                            <p className="text-sm">{session.trainer_notes}</p>
                          </div>
                        )}
                        
                        {/* Running info */}
                        {session.session_type === 'running' && (session.distance_km || session.time_min) && (
                          <div className="flex gap-3 mb-2 text-sm">
                            {session.distance_km && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {session.distance_km} km
                              </span>
                            )}
                            {session.time_min && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {session.time_min} min
                              </span>
                            )}
                          </div>
                        )}
                        
                        {session.notes && (
                          <p className="text-sm text-muted-foreground">{session.notes}</p>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setEditingSession(session)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant={session.completed ? 'secondary' : 'default'}
                          className="h-8 w-8"
                          onClick={() => toggleCompletedMutation.mutate({
                            id: session.id, 
                            completed: !session.completed 
                          })}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(session.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <EditPlannedSessionDialog
        session={editingSession}
        open={!!editingSession}
        onOpenChange={(open) => !open && setEditingSession(null)}
      />
    </AppLayout>
  );
}
