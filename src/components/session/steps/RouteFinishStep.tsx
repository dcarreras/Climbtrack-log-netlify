import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, MessageSquareQuote, Save } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { clearActiveRouteStorage } from '@/lib/routeSessionStorage';
import { flushRoutePhotoQueue } from '@/lib/routePhotoQueue';
import { getElapsedSessionMinutes } from '@/lib/sessionLifecycle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';

type FinishSessionRow = Pick<
  Tables<'sessions'>,
  | 'body_weight_kg'
  | 'id'
  | 'mood'
  | 'notes'
  | 'paused_at'
  | 'paused_ms'
  | 'planned_session_id'
  | 'rpe_1_10'
  | 'started_at'
>;

type FinishClimbRow = Pick<Tables<'climbs'>, 'grade_value' | 'id' | 'sent'>;

interface RouteFinishStepProps {
  onBack: () => void;
  onCompleted: (sessionId: string) => void;
  sessionId: string;
}

const PIE_COLORS = [
  'hsl(15 85% 55%)',
  'hsl(32 90% 52%)',
  'hsl(48 88% 48%)',
  'hsl(142 60% 42%)',
  'hsl(198 88% 46%)',
  'hsl(258 72% 58%)',
  'hsl(318 72% 56%)',
  'hsl(0 0% 55%)',
];

export default function RouteFinishStep({
  onBack,
  onCompleted,
  sessionId,
}: RouteFinishStepProps) {
  const queryClient = useQueryClient();

  const finishQuery = useQuery({
    queryKey: ['route-finish-session', sessionId],
    queryFn: async () => {
      const [sessionResult, climbsResult] = await Promise.all([
        supabase
          .from('sessions')
          .select('id, planned_session_id, started_at, paused_at, paused_ms, rpe_1_10, notes, body_weight_kg, mood')
          .eq('id', sessionId)
          .maybeSingle(),
        supabase
          .from('climbs')
          .select('id, sent, grade_value')
          .eq('session_id', sessionId),
      ]);

      if (sessionResult.error) throw sessionResult.error;
      if (climbsResult.error) throw climbsResult.error;
      if (!sessionResult.data) return null;

      return {
        climbs: climbsResult.data as FinishClimbRow[],
        session: sessionResult.data as FinishSessionRow,
      };
    },
    enabled: !!sessionId,
  });

  const session = finishQuery.data?.session || null;
  const completedRoutes = finishQuery.data?.climbs.filter((climb) => climb.sent).length || 0;
  const removedRoutes = finishQuery.data?.climbs.filter((climb) => !climb.sent).length || 0;
  const estimatedDuration = useMemo(() => {
    if (!session) return 0;
    return getElapsedSessionMinutes(session);
  }, [session]);
  const completedGradeDistribution = useMemo(() => {
    const completedClimbs = finishQuery.data?.climbs.filter((climb) => climb.sent) || [];
    const distribution = completedClimbs.reduce(
      (accumulator, climb) => {
        const grade = climb.grade_value?.trim() || 'Sin grado';
        accumulator[grade] = (accumulator[grade] || 0) + 1;
        return accumulator;
      },
      {} as Record<string, number>,
    );

    return Object.entries(distribution)
      .sort(([leftGrade, leftCount], [rightGrade, rightCount]) => {
        if (rightCount !== leftCount) return rightCount - leftCount;
        return leftGrade.localeCompare(rightGrade, 'es', { numeric: true });
      })
      .map(([grade, value], index) => ({
        color: PIE_COLORS[index % PIE_COLORS.length],
        grade,
        percentage: completedRoutes > 0 ? Math.round((value / completedRoutes) * 100) : 0,
        value,
      }));
  }, [completedRoutes, finishQuery.data?.climbs]);
  const averageMinutesPerRoute =
    completedRoutes > 0 ? Math.max(1, Math.round(estimatedDuration / completedRoutes)) : 0;

  const [rpe, setRpe] = useState(session?.rpe_1_10 || 6);
  const [notes, setNotes] = useState(session?.notes || '');
  const [bodyWeight, setBodyWeight] = useState(session?.body_weight_kg?.toString() || '');
  const [mood, setMood] = useState(session?.mood || '');

  useEffect(() => {
    if (!session) return;
    setRpe(session.rpe_1_10 || 6);
    setNotes(session.notes || '');
    setBodyWeight(session.body_weight_kg?.toString() || '');
    setMood(session.mood || '');
  }, [session]);

  const finalizeSession = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('No hay sesión activa para finalizar');

      await flushRoutePhotoQueue(sessionId);

      const { error: deleteError } = await supabase
        .from('climbs')
        .delete()
        .eq('session_id', sessionId)
        .eq('sent', false);

      if (deleteError) throw deleteError;

      const completedAt = new Date().toISOString();
      const durationMin = getElapsedSessionMinutes(session);

      const { error: sessionError } = await supabase
        .from('sessions')
        .update({
          body_weight_kg: bodyWeight ? Number.parseFloat(bodyWeight) : null,
          completed_at: completedAt,
          duration_min: durationMin,
          mood: mood.trim() || null,
          notes: notes.trim() || null,
          paused_at: null,
          rpe_1_10: rpe,
          status: 'completed',
        })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      if (session.planned_session_id) {
        const { error: plannedError } = await supabase
          .from('planned_sessions')
          .update({
            completed: true,
            completed_session_id: sessionId,
          })
          .eq('id', session.planned_session_id);

        if (plannedError) throw plannedError;
      }
    },
    onSuccess: () => {
      clearActiveRouteStorage();
      queryClient.invalidateQueries({ queryKey: ['active-route-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['route-finish-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['planned-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['planned-sessions-pending'] });
      toast.success('Sesión guardada');
      onCompleted(sessionId);
    },
    onError: (error) => {
      toast.error('No se pudo finalizar la sesión: ' + error.message);
    },
  });

  if (finishQuery.isLoading) {
    return (
      <Card className="card-elevated">
        <CardContent className="py-10 text-center text-muted-foreground">
          Cargando cierre de sesión...
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="card-elevated">
        <CardContent className="py-10 text-center text-muted-foreground">
          No se encontró la sesión activa.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al tracking
      </Button>

      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold">Resumen y feedback</h2>
        <p className="text-muted-foreground mt-2">
          Revisa cómo quedó la sesión, deja tu feedback y guarda el entrenamiento final.
        </p>
      </div>

      <Card className="card-elevated border-primary/25">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Resumen final
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Duración</p>
              <p className="mt-1 text-xl font-semibold">{estimatedDuration} min</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Vías guardadas</p>
              <p className="mt-1 text-xl font-semibold">{completedRoutes}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Min/vía</p>
              <p className="mt-1 text-xl font-semibold">
                {completedRoutes > 0 ? `${averageMinutesPerRoute} min` : '-'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border p-4">
              <div className="mb-3">
                <p className="text-sm font-medium">Distribución de vías completadas</p>
                <p className="text-xs text-muted-foreground">
                  Reparto por grado de las vías que realmente cerraste en la sesión.
                </p>
              </div>

              {completedGradeDistribution.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
                  <div className="mx-auto h-56 w-full max-w-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={completedGradeDistribution}
                          dataKey="value"
                          nameKey="grade"
                          cx="50%"
                          cy="50%"
                          innerRadius="58%"
                          outerRadius="86%"
                          paddingAngle={2}
                          stroke="none"
                        >
                          {completedGradeDistribution.map((entry) => (
                            <Cell key={entry.grade} fill={entry.color} />
                          ))}
                        </Pie>
                        <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle">
                          <tspan className="fill-foreground text-2xl font-semibold">
                            {estimatedDuration}
                          </tspan>
                          <tspan x="50%" dy="18" className="fill-muted-foreground text-xs">
                            min totales
                          </tspan>
                          <tspan x="50%" dy="18" className="fill-muted-foreground text-xs">
                            {completedRoutes} vías
                          </tspan>
                        </text>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2">
                    {completedGradeDistribution.map((entry) => (
                      <div
                        key={entry.grade}
                        className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="font-medium">{entry.grade}</span>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-semibold">{entry.value} vías</div>
                          <div className="text-muted-foreground">{entry.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  Todavía no hay vías completadas para mostrar en el gráfico.
                </div>
              )}
            </div>

            <div className="rounded-xl border p-4">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquareQuote className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Feedback de la sesión</p>
                  <p className="text-xs text-muted-foreground">
                    Añade cómo te sentiste y el esfuerzo que percibiste hoy.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>RPE percibido: {rpe}/10</Label>
                  <Slider
                    value={[rpe]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={([value]) => setRpe(value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    1 = muy fácil, 10 = máximo esfuerzo.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mood">Sensación general</Label>
                  <Input
                    id="mood"
                    placeholder="Ej. fluido, pesado, explosivo, sin energía..."
                    value={mood}
                    onChange={(event) => setMood(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Feedback de la sesión</Label>
                  <Textarea
                    id="notes"
                    placeholder="Qué salió bien, qué grado costó más, si el volumen fue adecuado y qué ajustarías para la próxima."
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bodyWeight">Peso corporal (kg)</Label>
                  <Input
                    id="bodyWeight"
                    type="number"
                    step="0.1"
                    placeholder="Opcional"
                    value={bodyWeight}
                    onChange={(event) => setBodyWeight(event.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {removedRoutes > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-muted-foreground">
              Se limpiarán {removedRoutes} vía(s) pendientes que no marcaste como completadas.
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        className="w-full glow-primary"
        size="lg"
        onClick={() => finalizeSession.mutate()}
        disabled={finalizeSession.isPending}
      >
        <Save className="mr-2 h-4 w-4" />
        {finalizeSession.isPending ? 'Guardando sesión...' : 'Guardar sesión final'}
      </Button>
    </div>
  );
}
