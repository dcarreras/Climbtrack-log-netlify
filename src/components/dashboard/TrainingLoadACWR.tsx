import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Shield, 
  Zap,
  Activity,
  ChevronDown,
  ChevronUp,
  BarChart3
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { subDays, startOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';

interface Session {
  id: string;
  date: string;
  duration_min?: number | null;
  rpe_1_10?: number | null;
  distance_km?: number | null;
  session_type: string;
}

interface TrainingLoadACWRProps {
  sessions: Session[];
}

interface LoadMetrics {
  acute: number;
  chronic: number;
  acwr: number;
  status: 'optimal' | 'caution' | 'danger' | 'undertraining';
  trend: 'increasing' | 'stable' | 'decreasing';
}

function calculateTRIMP(session: Session): number {
  // TRIMP = Duration (min) × RPE
  // If no RPE, estimate based on session type
  const duration = session.duration_min || 60; // default 60 min
  const rpe = session.rpe_1_10 || 5; // default moderate
  
  // Add running distance as load factor (1 km = ~10 load units)
  const runningLoad = (session.distance_km || 0) * 10;
  
  return (duration * rpe) + runningLoad;
}

function getLoadStatus(acwr: number): LoadMetrics['status'] {
  if (acwr < 0.8) return 'undertraining';
  if (acwr >= 0.8 && acwr <= 1.3) return 'optimal';
  if (acwr > 1.3 && acwr <= 1.5) return 'caution';
  return 'danger';
}

function getLoadTrend(acute: number, previousAcute: number): LoadMetrics['trend'] {
  const diff = acute - previousAcute;
  const percentChange = previousAcute > 0 ? (diff / previousAcute) * 100 : 0;
  
  if (percentChange > 10) return 'increasing';
  if (percentChange < -10) return 'decreasing';
  return 'stable';
}

export default function TrainingLoadACWR({ sessions }: TrainingLoadACWRProps) {
  const { loadMetrics, chartData } = useMemo(() => {
    const now = new Date();
    
    // Acute load: last 7 days
    const last7Days = startOfDay(subDays(now, 7));
    const acuteSessions = sessions.filter(s => new Date(s.date) >= last7Days);
    const acuteLoad = acuteSessions.reduce((acc, s) => acc + calculateTRIMP(s), 0);
    
    // Chronic load: average of weeks 1-4 (days 7-35)
    const weeks: number[] = [];
    for (let week = 1; week <= 4; week++) {
      const weekStart = startOfDay(subDays(now, week * 7));
      const weekEnd = startOfDay(subDays(now, (week - 1) * 7));
      const weekSessions = sessions.filter(s => {
        const date = new Date(s.date);
        return date >= weekStart && date < weekEnd;
      });
      weeks.push(weekSessions.reduce((acc, s) => acc + calculateTRIMP(s), 0));
    }
    const chronicLoad = weeks.reduce((a, b) => a + b, 0) / 4;
    
    // Previous week for trend (days 7-14)
    const prevWeekStart = startOfDay(subDays(now, 14));
    const prevWeekEnd = startOfDay(subDays(now, 7));
    const prevWeekSessions = sessions.filter(s => {
      const date = new Date(s.date);
      return date >= prevWeekStart && date < prevWeekEnd;
    });
    const previousAcuteLoad = prevWeekSessions.reduce((acc, s) => acc + calculateTRIMP(s), 0);
    
    // Calculate ACWR
    const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

    // Calculate ACWR for past weeks (up to 8 weeks back) for trend chart
    const chartData: { week: string; acwr: number; acute: number; chronic: number }[] = [];
    for (let weeksBack = 7; weeksBack >= 0; weeksBack--) {
      const targetDate = subDays(now, weeksBack * 7);
      
      // Acute load for that week
      const weekAcuteStart = startOfDay(subDays(targetDate, 7));
      const weekAcuteSessions = sessions.filter(s => {
        const date = new Date(s.date);
        return date >= weekAcuteStart && date < startOfDay(targetDate);
      });
      const weekAcuteLoad = weekAcuteSessions.reduce((acc, s) => acc + calculateTRIMP(s), 0);
      
      // Chronic load (4 weeks average before that point)
      const chronicWeeks: number[] = [];
      for (let cw = 1; cw <= 4; cw++) {
        const cwStart = startOfDay(subDays(targetDate, cw * 7));
        const cwEnd = startOfDay(subDays(targetDate, (cw - 1) * 7));
        const cwSessions = sessions.filter(s => {
          const date = new Date(s.date);
          return date >= cwStart && date < cwEnd;
        });
        chronicWeeks.push(cwSessions.reduce((acc, s) => acc + calculateTRIMP(s), 0));
      }
      const weekChronicLoad = chronicWeeks.reduce((a, b) => a + b, 0) / 4;
      const weekAcwr = weekChronicLoad > 0 ? weekAcuteLoad / weekChronicLoad : 0;
      
      chartData.push({
        week: format(targetDate, 'd MMM', { locale: es }),
        acwr: Number(weekAcwr.toFixed(2)),
        acute: Math.round(weekAcuteLoad),
        chronic: Math.round(weekChronicLoad),
      });
    }
    
    return {
      loadMetrics: {
        acute: acuteLoad,
        chronic: chronicLoad,
        acwr,
        status: getLoadStatus(acwr),
        trend: getLoadTrend(acuteLoad, previousAcuteLoad),
      },
      chartData,
    };
  }, [sessions]);

  const statusConfig = {
    optimal: {
      label: 'Zona Óptima',
      color: 'bg-green-500',
      textColor: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      icon: Shield,
      description: 'Carga equilibrada. Buen momento para mantener o aumentar ligeramente.',
    },
    caution: {
      label: 'Precaución',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      icon: AlertTriangle,
      description: 'Carga elevada. Considera moderar la intensidad los próximos días.',
    },
    danger: {
      label: 'Riesgo Alto',
      color: 'bg-red-500',
      textColor: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      icon: AlertTriangle,
      description: 'Riesgo de sobreentrenamiento. Reduce la carga significativamente.',
    },
    undertraining: {
      label: 'Subentrenamiento',
      color: 'bg-blue-500',
      textColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      icon: Zap,
      description: 'Carga baja. Puedes aumentar volumen o intensidad.',
    },
  };

  const config = statusConfig[loadMetrics.status];
  const StatusIcon = config.icon;

  // Calculate progress bar position (0.5 to 1.8 range mapped to 0-100)
  const progressValue = Math.min(Math.max(((loadMetrics.acwr - 0.5) / 1.3) * 100, 0), 100);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Carga de Entrenamiento (ACWR)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ACWR Value and Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${config.bgColor}`}>
              <StatusIcon className={`h-6 w-6 ${config.textColor}`} />
            </div>
            <div>
              <div className="text-3xl font-bold">{loadMetrics.acwr.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Ratio Agudo:Crónico</div>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`${config.bgColor} ${config.textColor} ${config.borderColor}`}
          >
            {config.label}
          </Badge>
        </div>

        {/* ACWR Scale Visualization */}
        <div className="space-y-2">
          <div className="relative h-3 rounded-full overflow-hidden bg-muted">
            {/* Zone colors */}
            <div className="absolute inset-0 flex">
              <div className="w-[23%] bg-blue-500/40" /> {/* 0.5-0.8 Undertraining */}
              <div className="w-[38%] bg-green-500/40" /> {/* 0.8-1.3 Optimal */}
              <div className="w-[15%] bg-yellow-500/40" /> {/* 1.3-1.5 Caution */}
              <div className="w-[24%] bg-red-500/40" /> {/* 1.5+ Danger */}
            </div>
            {/* Marker */}
            <div 
              className={`absolute top-0 w-1 h-full ${config.color} shadow-lg transition-all duration-500`}
              style={{ left: `${progressValue}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.5</span>
            <span>0.8</span>
            <span>1.3</span>
            <span>1.5</span>
            <span>1.8+</span>
          </div>
        </div>

        {/* Load Details */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
              <span className="text-xs sm:text-sm text-muted-foreground">Carga Aguda (7d)</span>
              {loadMetrics.trend === 'increasing' && (
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
              )}
              {loadMetrics.trend === 'decreasing' && (
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
              )}
            </div>
            <div className="text-lg sm:text-xl font-semibold">{Math.round(loadMetrics.acute)}</div>
          </div>
          <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
            <div className="text-xs sm:text-sm text-muted-foreground mb-1">Carga Crónica (4 sem)</div>
            <div className="text-lg sm:text-xl font-semibold">{Math.round(loadMetrics.chronic)}</div>
          </div>
        </div>

        {/* Recommendation */}
        <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
          <p className={`text-sm ${config.textColor}`}>{config.description}</p>
        </div>

        {/* Expandable Details Panel */}
        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Ver evolución y cómo funciona</span>
            </div>
            {isDetailsOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-6">
            {/* How it works explanation */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
              <h4 className="font-semibold text-sm">¿Cómo se calcula el ACWR?</h4>
              <div className="grid gap-2 text-sm">
                <p>
                  <strong className="text-primary">TRIMP</strong> = Duración (min) × RPE + (km running × 10)
                </p>
                <p>
                  <strong className="text-primary">Carga Aguda</strong> = Suma del TRIMP de los últimos 7 días
                </p>
                <p>
                  <strong className="text-primary">Carga Crónica</strong> = Promedio semanal de las últimas 4 semanas
                </p>
                <p>
                  <strong className="text-primary">ACWR</strong> = Carga Aguda ÷ Carga Crónica
                </p>
              </div>
              <div className="pt-3 border-t border-border/50">
                <h5 className="font-medium text-xs text-muted-foreground mb-2">Interpretación de zonas:</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span>&lt;0.8 = Subentrenamiento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span>0.8-1.3 = Zona óptima</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span>1.3-1.5 = Precaución</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span>&gt;1.5 = Riesgo alto</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACWR Trend Chart */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Evolución ACWR (8 semanas)</h4>
              <div className="w-full overflow-x-auto">
                <div className="min-w-[300px] h-48 sm:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="week" 
                        tick={{ fontSize: 9 }} 
                        className="fill-muted-foreground"
                      />
                      <YAxis 
                        domain={[0, 2]} 
                        tick={{ fontSize: 9 }} 
                        className="fill-muted-foreground"
                        tickCount={5}
                        width={30}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === 'acwr') return [value.toFixed(2), 'ACWR'];
                          return [value, name];
                        }}
                      />
                      {/* Zone backgrounds */}
                      <ReferenceArea y1={0} y2={0.8} fill="hsl(217 91% 60%)" fillOpacity={0.1} />
                      <ReferenceArea y1={0.8} y2={1.3} fill="hsl(142 71% 45%)" fillOpacity={0.15} />
                      <ReferenceArea y1={1.3} y2={1.5} fill="hsl(48 96% 53%)" fillOpacity={0.15} />
                      <ReferenceArea y1={1.5} y2={2} fill="hsl(0 84% 60%)" fillOpacity={0.15} />
                      <ReferenceLine y={0.8} stroke="hsl(217 91% 60%)" strokeDasharray="3 3" strokeOpacity={0.5} />
                      <ReferenceLine y={1.3} stroke="hsl(142 71% 45%)" strokeDasharray="3 3" strokeOpacity={0.5} />
                      <ReferenceLine y={1.5} stroke="hsl(48 96% 53%)" strokeDasharray="3 3" strokeOpacity={0.5} />
                      <Line
                        type="monotone"
                        dataKey="acwr"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}