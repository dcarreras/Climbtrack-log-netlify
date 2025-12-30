import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, CartesianGrid, Legend 
} from 'recharts';
import { Mountain, Target, TrendingUp, Flame, Award, Zap } from 'lucide-react';
import { calculateClimbMetrics, getCurrentWeekClimbMetrics, Modality, SessionData } from '@/utils/metricsUtils';
import { getBoulderColorStyle, BOULDER_COLORS, getBoulderDisplayLabel } from '@/utils/gradeUtils';

interface ClimbDashboardProps {
  sessions: SessionData[];
}

export default function ClimbDashboard({ sessions }: ClimbDashboardProps) {
  const [modality, setModality] = useState<Modality>('boulder');
  const [timeRange, setTimeRange] = useState<string>('4');

  const weeklyMetrics = useMemo(() => 
    calculateClimbMetrics(sessions, modality, parseInt(timeRange)),
    [sessions, modality, timeRange]
  );

  const currentWeek = useMemo(() => 
    getCurrentWeekClimbMetrics(sessions, modality),
    [sessions, modality]
  );

  const chartData = weeklyMetrics.map(m => ({
    week: m.weekLabel,
    maxSent: m.maxSentIndex,
    maxTried: m.maxTriedIndex,
    avgWeighted: m.avgWeightedIndex,
    attempts: m.totalAttempts,
    sends: m.sentCount,
    flashes: m.flashCount,
  }));

  const isBoulder = modality === 'boulder';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-1">Semana {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
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
        <Select value={modality} onValueChange={(v) => setModality(v as Modality)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="boulder">Boulder</SelectItem>
            <SelectItem value="autobelay">Autobelay</SelectItem>
            <SelectItem value="rope">Cuerda</SelectItem>
          </SelectContent>
        </Select>

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

      {/* Current Week Stats */}
      {currentWeek && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Award className="h-3.5 w-3.5 text-success" />
                <span className="text-xs text-muted-foreground">Max Sent</span>
              </div>
              {isBoulder && currentWeek.maxSentIndex > 0 ? (
                <div className="flex items-center gap-1.5">
                  <div 
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${getBoulderColorStyle(currentWeek.maxSentLabel.split(' ')[0]).bg}`}
                  />
                  <span className="font-bold text-xs sm:text-sm leading-tight">{currentWeek.maxSentLabel}</span>
                </div>
              ) : (
                <span className="font-bold text-lg sm:text-xl">{currentWeek.maxSentLabel}</span>
              )}
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target className="h-3.5 w-3.5 text-warning" />
                <span className="text-xs text-muted-foreground">Max Tried</span>
              </div>
              {isBoulder && currentWeek.maxTriedIndex > 0 ? (
                <div className="flex items-center gap-1.5">
                  <div 
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${getBoulderColorStyle(currentWeek.maxTriedLabel.split(' ')[0]).bg}`}
                  />
                  <span className="font-bold text-xs sm:text-sm leading-tight">{currentWeek.maxTriedLabel}</span>
                </div>
              ) : (
                <span className="font-bold text-lg sm:text-xl">{currentWeek.maxTriedLabel}</span>
              )}
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">Avg Weighted</span>
              </div>
              <span className="font-bold text-xs sm:text-sm leading-tight">{currentWeek.avgWeightedLabel}</span>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Flame className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs text-muted-foreground">Volumen</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">{currentWeek.totalAttempts} int</Badge>
                <Badge className="bg-success/20 text-success border-success/30 text-xs px-1.5 py-0.5">
                  {currentWeek.sentCount} tops
                </Badge>
                {isBoulder && currentWeek.flashCount > 0 && (
                  <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-xs px-1.5 py-0.5">
                    {currentWeek.flashCount} flash
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts - Stacked vertically on mobile */}
      <div className="space-y-4">
        {/* Grade Progression */}
        <Card className="card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Progresión de Grado
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[300px]">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={10} tick={{ fontSize: 10 }} />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={10}
                      width={40}
                      domain={[0, isBoulder ? 7 : 'auto']}
                      tickFormatter={(v) => isBoulder ? (BOULDER_COLORS[v - 1]?.slice(0, 3) || '') : v}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="maxSent" 
                      name="Max Sent"
                      stroke="hsl(142, 76%, 45%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(142, 76%, 45%)', r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="maxTried" 
                      name="Max Tried"
                      stroke="hsl(25, 95%, 53%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(25, 95%, 53%)', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Volume */}
        <Card className="card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
              Volumen Semanal
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[300px]">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={10} tick={{ fontSize: 10 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} width={35} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="attempts" name="Intentos" fill="hsl(173, 80%, 45%)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="sends" name="Tops" fill="hsl(142, 76%, 45%)" radius={[2, 2, 0, 0]} />
                    {isBoulder && (
                      <Bar dataKey="flashes" name="Flashes" fill="hsl(45, 93%, 47%)" radius={[2, 2, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Boulder Color Legend */}
      {isBoulder && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-base">Equivalencia de Colores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {BOULDER_COLORS.map(color => (
                <div key={color} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${getBoulderColorStyle(color).bg}`} />
                  <span className="text-sm">{getBoulderDisplayLabel(color)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
