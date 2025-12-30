import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, CartesianGrid, Legend, AreaChart, Area, ComposedChart
} from 'recharts';
import { Footprints, Clock, Mountain, TrendingUp, AlertTriangle, Target, Flame } from 'lucide-react';
import { calculateRunningMetrics, getCurrentWeekRunningMetrics, SessionData } from '@/utils/metricsUtils';

interface RunningDashboardProps {
  sessions: SessionData[];
  weeklyKmGoal: number;
}

export default function RunningDashboard({ sessions, weeklyKmGoal }: RunningDashboardProps) {
  const [timeRange, setTimeRange] = useState<string>('4');

  const weeklyMetrics = useMemo(() => 
    calculateRunningMetrics(sessions, weeklyKmGoal, parseInt(timeRange)),
    [sessions, weeklyKmGoal, timeRange]
  );

  const currentWeek = useMemo(() => 
    getCurrentWeekRunningMetrics(sessions, weeklyKmGoal),
    [sessions, weeklyKmGoal]
  );

  const chartData = weeklyMetrics.map(m => ({
    week: m.weekLabel,
    km: Number(m.weeklyDistanceKm.toFixed(1)),
    elevation: Math.round(m.weeklyElevationGainM),
    time: Math.round(m.weeklyTimeMin),
    load: Math.round(m.weeklyLoad),
    sessions: m.sessionCount,
  }));

  const showDistanceAlert = currentWeek && currentWeek.distanceDeltaPct > 25;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-1">Semana {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}{entry.unit || ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4">4 semanas</SelectItem>
            <SelectItem value="8">8 semanas</SelectItem>
            <SelectItem value="12">12 semanas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alert for sudden distance increase */}
      {showDistanceAlert && (
        <Alert className="border-warning bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            <strong>⚠️ Ojo:</strong> Subiste +{Math.round(currentWeek.distanceDeltaPct)}% km vs la semana pasada.
            Considera moderar el volumen para evitar lesiones.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Week Stats */}
      {currentWeek && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Objetivo Semanal</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-2xl text-cyan-500">
                  {currentWeek.weeklyDistanceKm.toFixed(1)}
                </span>
                <span className="text-muted-foreground">/ {weeklyKmGoal} km</span>
              </div>
              <Progress 
                value={Math.min(currentWeek.goalProgressPct, 100)} 
                className="mt-2 h-2"
              />
              <span className="text-sm text-muted-foreground">
                {Math.round(currentWeek.goalProgressPct)}%
              </span>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Tiempo Semanal</span>
              </div>
              <span className="font-bold text-2xl">
                {Math.floor(currentWeek.weeklyTimeMin / 60)}h {currentWeek.weeklyTimeMin % 60}m
              </span>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Mountain className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Elevación</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-2xl">
                  {Math.round(currentWeek.weeklyElevationGainM)}
                </span>
                <span className="text-muted-foreground">m D+</span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-4 w-4 text-accent" />
                <span className="text-sm text-muted-foreground">Carga Semanal</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-2xl">
                  {Math.round(currentWeek.weeklyLoad)}
                </span>
                <span className="text-muted-foreground">pts</span>
              </div>
              <span className="text-xs text-muted-foreground">
                (tiempo × RPE)
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts - Stacked vertically on mobile */}
      <div className="space-y-4">
        {/* Distance & Elevation */}
        <Card className="card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Footprints className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500" />
              Distancia y Elevación
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[300px]">
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={chartData} margin={{ left: -10, right: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={10} tick={{ fontSize: 10 }} />
                    <YAxis 
                      yAxisId="left"
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10}
                      width={35}
                      tickFormatter={(v) => `${v}`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10}
                      width={35}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      yAxisId="left"
                      dataKey="km" 
                      name="Km" 
                      fill="hsl(199, 89%, 48%)" 
                      radius={[2, 2, 0, 0]} 
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="elevation" 
                      name="D+ (m)"
                      stroke="hsl(25, 95%, 53%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(25, 95%, 53%)', r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time & Load */}
        <Card className="card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Tiempo y Carga
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[300px]">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={10} tick={{ fontSize: 10 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} width={35} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="time" 
                      name="Tiempo (min)"
                      stroke="hsl(173, 80%, 45%)" 
                      fill="hsl(173, 80%, 45%)"
                      fillOpacity={0.3}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="load" 
                      name="Carga"
                      stroke="hsl(142, 76%, 45%)" 
                      fill="hsl(142, 76%, 45%)"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Summary Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-base">Resumen por Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3">Semana</th>
                  <th className="text-right py-2 px-3">Km</th>
                  <th className="text-right py-2 px-3">Tiempo</th>
                  <th className="text-right py-2 px-3">D+</th>
                  <th className="text-right py-2 px-3">Sesiones</th>
                  <th className="text-right py-2 px-3">% Objetivo</th>
                </tr>
              </thead>
              <tbody>
                {weeklyMetrics.map((m, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-3">{m.weekLabel}</td>
                    <td className="text-right py-2 px-3 font-medium text-cyan-500">
                      {m.weeklyDistanceKm.toFixed(1)}
                    </td>
                    <td className="text-right py-2 px-3">{m.weeklyTimeMin} min</td>
                    <td className="text-right py-2 px-3">{Math.round(m.weeklyElevationGainM)} m</td>
                    <td className="text-right py-2 px-3">{m.sessionCount}</td>
                    <td className="text-right py-2 px-3">
                      <Badge 
                        variant="outline" 
                        className={m.goalProgressPct >= 100 ? 'bg-success/20 text-success' : ''}
                      >
                        {Math.round(m.goalProgressPct)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
