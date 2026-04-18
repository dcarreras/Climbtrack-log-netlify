import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { SessionData } from '@/utils/metricsUtils';

interface Props { sessions: SessionData[] }

const T = {
  bg: '#050505', bgCard: '#131313', ink: '#FAFAF9',
  inkMuted: 'rgba(250,250,249,0.62)', inkFaint: 'rgba(250,250,249,0.38)',
  inkDim: 'rgba(250,250,249,0.16)', rule: 'rgba(250,250,249,0.09)',
  accent: '#E23A1F',
  sans: "'Urbanist', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
};

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: T.sans, fontSize: 10, color: T.inkFaint,
      textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 500,
      marginBottom: 16 }}>
      {children}
    </div>
  );
}

const STRENGTH_TYPES = new Set(['training', 'hangboard']);

const TYPE_LABEL: Record<string, string> = {
  training: 'Entrenamiento',
  hangboard: 'Hangboard',
};

export default function StrengthDashboard({ sessions }: Props) {
  const strengthSessions = useMemo(() =>
    sessions.filter(s => STRENGTH_TYPES.has(s.session_type)), [sessions]);

  const weekly = useMemo(() => {
    const map = new Map<string, { min: number; count: number; load: number }>();
    strengthSessions.forEach(s => {
      const d = new Date(s.date);
      const mon = new Date(d);
      mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = mon.toISOString().slice(0, 10);
      const prev = map.get(key) || { min: 0, count: 0, load: 0 };
      const min = s.duration_min || s.time_min || 0;
      const rpe = s.rpe_1_10 || 6;
      map.set(key, {
        min: prev.min + min,
        count: prev.count + 1,
        load: prev.load + min * rpe,
      });
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([date, v]) => ({
        week: date.slice(5),
        min: v.min,
        count: v.count,
        load: Math.round(v.load),
      }));
  }, [strengthSessions]);

  const totals = useMemo(() => ({
    sessions: strengthSessions.length,
    min: strengthSessions.reduce((t, s) => t + (s.duration_min || s.time_min || 0), 0),
    avgRpe: strengthSessions.filter(s => s.rpe_1_10).length > 0
      ? (strengthSessions.reduce((t, s) => t + (s.rpe_1_10 || 0), 0) /
          strengthSessions.filter(s => s.rpe_1_10).length).toFixed(1)
      : '-',
    byType: strengthSessions.reduce((acc, s) => {
      acc[s.session_type] = (acc[s.session_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  }), [strengthSessions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: T.bgCard, border: `1px solid ${T.rule}`,
        padding: '10px 14px', fontFamily: T.sans, fontSize: 12, color: T.ink }}>
        <div style={{ marginBottom: 6, color: T.inkFaint, fontSize: 10,
          textTransform: 'uppercase', letterSpacing: '0.12em' }}>Sem. {label}</div>
        {payload.map((e: any, i: number) => (
          <div key={i} style={{ color: T.inkMuted }}>{e.name}: <span style={{ color: T.ink, fontWeight: 600 }}>{e.value}</span></div>
        ))}
      </div>
    );
  };

  if (strengthSessions.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center',
        border: `1px solid ${T.rule}`, color: T.inkFaint, fontFamily: T.sans, fontSize: 14 }}>
        Sin sesiones de fuerza registradas
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        border: `1px solid ${T.rule}` }}>
        {[
          { value: totals.sessions, label: 'Sesiones' },
          { value: Math.round(totals.min / 60 * 10) / 10, unit: 'h', label: 'Tiempo total' },
          { value: totals.avgRpe, label: 'RPE medio' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '16px 14px', borderRight: i < 2 ? `1px solid ${T.rule}` : 'none' }}>
            <div style={{ fontFamily: T.sans, fontSize: 28, color: T.ink,
              fontWeight: 700, lineHeight: 1, letterSpacing: '-0.025em' }}>
              {s.value}<span style={{ fontSize: 13, color: T.inkFaint, fontWeight: 400 }}>{(s as any).unit}</span>
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 9, color: T.inkFaint,
              textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: 6 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* By type */}
      <div>
        <Kicker>Por tipo</Kicker>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {Object.entries(totals.byType).map(([type, count]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 0', borderBottom: `1px solid ${T.rule}` }}>
              <div style={{ fontFamily: T.sans, fontSize: 14, color: T.ink, fontWeight: 500, flex: 1 }}>
                {TYPE_LABEL[type] || type}
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 22, color: T.ink, fontWeight: 700 }}>
                {count}
              </div>
              <div style={{ fontFamily: T.sans, fontSize: 9, color: T.inkFaint,
                textTransform: 'uppercase', letterSpacing: '0.16em' }}>ses</div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly volume chart */}
      <div>
        <Kicker>Volumen semanal · min</Kicker>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weekly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={T.rule} vertical={false} />
            <XAxis dataKey="week" tick={{ fontFamily: T.mono, fontSize: 9, fill: T.inkFaint }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: T.mono, fontSize: 9, fill: T.inkFaint }}
              axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="min" name="min" fill={T.ink} opacity={0.85} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly load chart */}
      <div>
        <Kicker>Carga semanal · min × RPE</Kicker>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={weekly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={T.rule} vertical={false} />
            <XAxis dataKey="week" tick={{ fontFamily: T.mono, fontSize: 9, fill: T.inkFaint }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: T.mono, fontSize: 9, fill: T.inkFaint }}
              axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="load" name="carga" fill={T.accent} opacity={0.75} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent sessions */}
      <div>
        <Kicker>Últimas sesiones</Kicker>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {strengthSessions.slice(0, 8).map(s => {
            const min = s.duration_min || s.time_min || 0;
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 0', borderBottom: `1px solid ${T.rule}` }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%',
                  border: `1px solid ${T.rule}`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontFamily: T.sans, fontSize: 10, color: T.inkFaint, fontWeight: 600 }}>
                  F
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.sans, fontSize: 9, color: T.inkFaint,
                    textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 3 }}>
                    {new Date(s.date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  </div>
                  <div style={{ fontFamily: T.sans, fontSize: 14, color: T.ink, fontWeight: 500 }}>
                    {TYPE_LABEL[s.session_type] || s.session_type}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: T.sans, fontSize: 18, color: T.ink, fontWeight: 700 }}>
                    {min}<span style={{ fontSize: 11, color: T.inkFaint }}> min</span>
                  </div>
                  {s.rpe_1_10 && (
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: T.inkFaint }}>
                      RPE {s.rpe_1_10}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
