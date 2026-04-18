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

export default function BikeDashboard({ sessions }: Props) {
  const bikeSessions = useMemo(() =>
    sessions.filter(s => s.session_type === 'bike'), [sessions]);

  const weekly = useMemo(() => {
    const map = new Map<string, { km: number; min: number; elev: number; count: number }>();
    bikeSessions.forEach(s => {
      const d = new Date(s.date);
      const mon = new Date(d);
      mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = mon.toISOString().slice(0, 10);
      const prev = map.get(key) || { km: 0, min: 0, elev: 0, count: 0 };
      map.set(key, {
        km: prev.km + (Number(s.distance_km) || 0),
        min: prev.min + (s.duration_min || s.time_min || 0),
        elev: prev.elev + (Number(s.elevation_gain_m) || 0),
        count: prev.count + 1,
      });
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([date, v]) => ({
        week: date.slice(5),
        km: Math.round(v.km * 10) / 10,
        min: v.min,
        elev: Math.round(v.elev),
        count: v.count,
      }));
  }, [bikeSessions]);

  const totals = useMemo(() => ({
    sessions: bikeSessions.length,
    km: Math.round(bikeSessions.reduce((t, s) => t + (Number(s.distance_km) || 0), 0) * 10) / 10,
    min: bikeSessions.reduce((t, s) => t + (s.duration_min || s.time_min || 0), 0),
    elev: Math.round(bikeSessions.reduce((t, s) => t + (Number(s.elevation_gain_m) || 0), 0)),
  }), [bikeSessions]);

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

  if (bikeSessions.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center',
        border: `1px solid ${T.rule}`, color: T.inkFaint, fontFamily: T.sans, fontSize: 14 }}>
        Sin sesiones de bici registradas
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
        border: `1px solid ${T.rule}` }}>
        {[
          { value: totals.sessions, label: 'Sesiones' },
          { value: `${totals.km}`, unit: 'km', label: 'Distancia' },
          { value: Math.round(totals.min / 60 * 10) / 10, unit: 'h', label: 'Tiempo' },
          { value: totals.elev, unit: 'm', label: 'Desnivel' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '16px 14px', borderRight: i < 3 ? `1px solid ${T.rule}` : 'none' }}>
            <div style={{ fontFamily: T.sans, fontSize: 28, color: T.ink,
              fontWeight: 700, lineHeight: 1, letterSpacing: '-0.025em' }}>
              {s.value}<span style={{ fontSize: 13, color: T.inkFaint, fontWeight: 400 }}>{s.unit}</span>
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 9, color: T.inkFaint,
              textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: 6 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly km chart */}
      <div>
        <Kicker>Distancia semanal · km</Kicker>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weekly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={T.rule} vertical={false} />
            <XAxis dataKey="week" tick={{ fontFamily: T.mono, fontSize: 9, fill: T.inkFaint }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: T.mono, fontSize: 9, fill: T.inkFaint }}
              axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="km" name="km" fill={T.ink} opacity={0.85} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly elevation chart */}
      <div>
        <Kicker>Desnivel semanal · m</Kicker>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={weekly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={T.rule} vertical={false} />
            <XAxis dataKey="week" tick={{ fontFamily: T.mono, fontSize: 9, fill: T.inkFaint }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: T.mono, fontSize: 9, fill: T.inkFaint }}
              axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="elev" name="m D+" fill={T.inkFaint} opacity={0.7} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent sessions */}
      <div>
        <Kicker>Últimas sesiones</Kicker>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {bikeSessions.slice(0, 8).map(s => {
            const km = Number(s.distance_km || 0).toFixed(1);
            const min = s.duration_min || s.time_min || 0;
            const elev = Number(s.elevation_gain_m || 0);
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 0', borderBottom: `1px solid ${T.rule}` }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%',
                  border: `1px solid ${T.ruleStrong || T.rule}`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontFamily: T.sans, fontSize: 10, color: T.inkFaint, fontWeight: 600 }}>
                  B
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.sans, fontSize: 9, color: T.inkFaint,
                    textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 3 }}>
                    {new Date(s.date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  </div>
                  <div style={{ fontFamily: T.sans, fontSize: 14, color: T.ink, fontWeight: 500 }}>
                    Bici · {min} min
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: T.sans, fontSize: 18, color: T.ink, fontWeight: 700 }}>
                    {km}<span style={{ fontSize: 11, color: T.inkFaint }}> km</span>
                  </div>
                  {elev > 0 && (
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: T.inkFaint }}>
                      +{Math.round(elev)} m
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
