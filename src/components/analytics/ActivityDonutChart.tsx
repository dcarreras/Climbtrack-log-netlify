import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { SessionData } from '@/utils/metricsUtils';

interface ActivityDonutChartProps {
  sessions: SessionData[];
  periodDays: number;
}

// Activity type colors matching the reference design
const ACTIVITY_COLORS: Record<string, string> = {
  boulder: 'hsl(25, 95%, 53%)',      // Orange
  rope: 'hsl(280, 70%, 50%)',        // Purple
  hybrid: 'hsl(320, 70%, 55%)',      // Pink
  running: 'hsl(199, 89%, 48%)',     // Cyan/Blue
  strength: 'hsl(142, 76%, 45%)',    // Green
  hangboard: 'hsl(45, 93%, 47%)',    // Yellow
  flexibility: 'hsl(173, 80%, 45%)', // Teal
  other: 'hsl(215, 20%, 45%)',       // Gray
};

const ACTIVITY_LABELS: Record<string, string> = {
  boulder: 'Boulder',
  rope: 'Cuerda',
  hybrid: 'Híbrido',
  running: 'Running',
  strength: 'Fuerza',
  hangboard: 'Hangboard',
  flexibility: 'Flexibilidad',
  other: 'Otro',
};

export default function ActivityDonutChart({ sessions, periodDays }: ActivityDonutChartProps) {
  const data = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    
    const filteredSessions = sessions.filter(s => new Date(s.date) >= startDate);
    
    // Group by session type and sum duration
    const typeMap: Record<string, number> = {};
    
    filteredSessions.forEach(session => {
      const type = session.session_type || 'other';
      const duration = session.duration_min || session.time_min || 0;
      typeMap[type] = (typeMap[type] || 0) + duration;
    });
    
    const total = Object.values(typeMap).reduce((a, b) => a + b, 0);
    
    return {
      items: Object.entries(typeMap)
        .map(([type, minutes]) => ({
          type,
          label: ACTIVITY_LABELS[type] || type,
          minutes,
          hours: Math.round(minutes / 60 * 10) / 10,
          percentage: total > 0 ? Math.round((minutes / total) * 100) : 0,
          color: ACTIVITY_COLORS[type] || ACTIVITY_COLORS.other,
        }))
        .sort((a, b) => b.minutes - a.minutes),
      totalHours: Math.round(total / 60 * 10) / 10,
      totalMinutes: total,
    };
  }, [sessions, periodDays]);

  // Find the dominant activity for center label
  const dominantActivity = data.items[0];
  const dominantPercentage = dominantActivity?.percentage || 0;
  const dominantLabel = dominantActivity?.label || 'Sin datos';

  return (
    <Card className="card-elevated">
      <CardContent className="p-3 sm:p-6">
        {/* Mobile: Stacked layout, Desktop: Row layout */}
        <div className="flex flex-col items-center gap-4">
          {/* Top row: Total hours + Donut Chart + Legend */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 w-full">
            {/* Total hours - compact on mobile */}
            <div className="text-center flex-shrink-0">
              <div className="text-2xl sm:text-4xl font-bold">{data.totalHours}</div>
              <div className="text-[10px] sm:text-sm text-muted-foreground">horas</div>
            </div>

            {/* Donut Chart - smaller on mobile */}
            <div className="relative w-28 h-28 sm:w-44 sm:h-44 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.items}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={2}
                    dataKey="minutes"
                    stroke="none"
                  >
                    {data.items.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="central"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) - 6}
                                className="fill-foreground text-base sm:text-2xl font-bold"
                              >
                                {dominantPercentage}%
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 10}
                                className="fill-muted-foreground text-[8px] sm:text-xs"
                              >
                                {dominantLabel}
                              </tspan>
                            </text>
                          );
                        }
                        return null;
                      }}
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend - single column on mobile, two on desktop */}
            <div className="flex flex-col gap-1 sm:gap-2 text-[10px] sm:text-sm flex-shrink-0">
              {data.items.map((item) => (
                <div key={item.type} className="flex items-center gap-1.5 sm:gap-2">
                  <div
                    className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity breakdown with hours - scrollable row on mobile */}
          <div className="w-full overflow-x-auto">
            <div className="flex gap-2 sm:grid sm:grid-cols-4 sm:gap-3 min-w-max sm:min-w-0">
              {data.items.slice(0, 4).map((item) => (
                <div
                  key={item.type}
                  className="bg-muted/30 rounded-lg p-2 sm:p-3 text-center min-w-[70px] sm:min-w-0"
                >
                  <div className="text-sm sm:text-lg font-bold" style={{ color: item.color }}>
                    {item.hours}h
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
