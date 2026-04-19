import { ReactNode, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Bike,
  Cable,
  ChevronRight,
  Clock3,
  Dumbbell,
  Footprints,
  Layers3,
  Mountain,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStrava } from '@/hooks/useStrava';
import AppLayout from '@/components/layout/AppLayout';

type SessionType = 'boulder' | 'rope' | 'hybrid' | 'training' | 'running' | 'bike' | 'all';

const ITEMS_PER_PAGE = 12;
const CLIMB_TYPES = new Set(['boulder', 'rope', 'hybrid']);

const T = {
  bg: '#050505',
  panel: '#080808',
  panelSoft: 'rgba(250,250,249,0.03)',
  ink: '#FAFAF9',
  inkMuted: 'rgba(250,250,249,0.62)',
  inkFaint: 'rgba(250,250,249,0.38)',
  inkDim: 'rgba(250,250,249,0.16)',
  rule: 'rgba(250,250,249,0.09)',
  ruleStrong: 'rgba(250,250,249,0.18)',
  accent: '#E23A1F',
  accentDim: 'rgba(226,58,31,0.18)',
};

const SESSION_ICON_CONFIG: Record<
  string,
  { Icon: typeof Mountain; label: string; accent: string }
> = {
  boulder: { Icon: Mountain, label: 'Bloque', accent: '#F5F5F4' },
  rope: { Icon: Cable, label: 'Vías', accent: 'rgba(245,245,244,0.8)' },
  hybrid: { Icon: Layers3, label: 'Mixta', accent: 'rgba(245,245,244,0.62)' },
  running: { Icon: Footprints, label: 'Running', accent: '#FAFAF9' },
  bike: { Icon: Bike, label: 'Bici', accent: 'rgba(245,245,244,0.72)' },
  training: { Icon: Dumbbell, label: 'Fuerza', accent: 'rgba(245,245,244,0.56)' },
};

const filters: { key: SessionType; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'boulder', label: 'Bloque' },
  { key: 'rope', label: 'Vías' },
  { key: 'running', label: 'Running' },
  { key: 'bike', label: 'Bici' },
  { key: 'training', label: 'Fuerza' },
];

function Kicker({ index, children }: { index?: string; children: ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em]"
      style={{ color: T.inkFaint }}
    >
      {index && (
        <span className="font-mono" style={{ color: T.inkDim }}>
          {index}
        </span>
      )}
      <span>{children}</span>
    </div>
  );
}

function getSessionDuration(session: { duration_min: number | null; time_min?: number | null }) {
  return session.duration_min || session.time_min || 0;
}

export default function Sessions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<SessionType>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { isConnected: isStravaConnected, isSyncing, syncActivities } = useStrava();

  const { data: sessions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: async () => {
      const [sessionsResult, stravaResult] = await Promise.all([
        supabase
          .from('sessions')
          .select(
            '*, gyms(name, city), climbs(id, sent, flash, attempts, color_band, grade_value, discipline)',
          )
          .eq('user_id', user!.id)
          .eq('status', 'completed')
          .order('date', { ascending: false }),
        supabase
          .from('strava_activities')
          .select('synced_to_session_id')
          .eq('user_id', user!.id)
          .not('synced_to_session_id', 'is', null),
      ]);

      if (sessionsResult.error) throw sessionsResult.error;

      const stravaIds = new Set(stravaResult.data?.map((item) => item.synced_to_session_id) || []);

      return sessionsResult.data.map((session) => ({
        ...session,
        isFromStrava: stravaIds.has(session.id),
      }));
    },
    enabled: !!user,
  });

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const matchesType = typeFilter === 'all' || session.session_type === typeFilter;
      const haystack = [
        session.gyms?.name,
        session.notes,
        session.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = searchTerm.trim() === '' || haystack.includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [searchTerm, sessions, typeFilter]);

  const totalPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE);
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const totals = useMemo(() => {
    const climbs = sessions.flatMap((session) => session.climbs || []);
    return {
      sessions: sessions.length,
      hours:
        Math.round(
          sessions.reduce((sum, session) => sum + getSessionDuration(session), 0) / 6,
        ) / 10,
      tops: climbs.filter((climb) => climb.sent).length,
      km: sessions.reduce((sum, session) => sum + (Number(session.distance_km) || 0), 0),
    };
  }, [sessions]);

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[980px] pb-24 pt-4 sm:pt-6">
        <div className="space-y-8 px-4 sm:space-y-10 sm:px-6 md:px-8">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Kicker>Actividad</Kicker>
              <h1
                className="mt-3 text-[clamp(2.4rem,8vw,4.1rem)] font-bold uppercase leading-none tracking-[-0.05em]"
                style={{ color: T.ink }}
              >
                Sesiones
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isStravaConnected && (
                <button
                  onClick={syncActivities}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-2 border px-3 py-2 text-[11px] uppercase tracking-[0.18em]"
                  style={{ borderColor: T.ruleStrong, color: T.inkMuted }}
                  type="button"
                >
                  <RefreshCw className={isSyncing ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                  Strava
                </button>
              )}
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/sessions/new"
              className="border p-5 no-underline transition-colors"
              style={{ borderColor: T.ruleStrong, background: T.panel }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: T.inkFaint }}>
                    Acción rápida
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.03em]" style={{ color: T.ink }}>
                    Nueva sesión
                  </div>
                  <div className="mt-1 text-sm" style={{ color: T.inkMuted }}>
                    Registra escalada, fuerza o una sesión guiada.
                  </div>
                </div>
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                  style={{ background: T.ink, color: T.bg }}
                >
                  <Plus className="h-5 w-5" />
                </div>
              </div>
            </Link>

            <Link
              to="/timer?tab=hangboard"
              className="border p-5 no-underline transition-colors"
              style={{ borderColor: T.ruleStrong, background: T.panel }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: T.inkFaint }}>
                    Temporizador
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.03em]" style={{ color: T.ink }}>
                    Campus
                  </div>
                  <div className="mt-1 text-sm" style={{ color: T.inkMuted }}>
                    Abre Hangboard/Campus directamente y empieza a temporizar.
                  </div>
                </div>
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                  style={{ background: T.accentDim, color: T.ink, border: `1px solid rgba(226,58,31,0.28)` }}
                >
                  <Clock3 className="h-5 w-5" />
                </div>
              </div>
            </Link>
          </section>

          <div className="grid grid-cols-2 border-y sm:grid-cols-4" style={{ borderColor: T.ruleStrong }}>
            {[
              { value: totals.sessions, label: 'Sesiones' },
              { value: totals.hours.toFixed(1), label: 'Tiempo', unit: 'h' },
              { value: totals.tops, label: 'Tops' },
              { value: totals.km.toFixed(0), label: 'Km' },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="px-3 py-5 sm:px-4 sm:py-6"
                style={{
                  borderRight: index % 2 === 0 ? `1px solid ${T.rule}` : 'none',
                  borderBottom: index < 2 ? `1px solid ${T.rule}` : 'none',
                }}
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[2rem] font-bold leading-none tracking-[-0.06em]" style={{ color: T.ink }}>
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: T.inkFaint }}>
                      {stat.unit}
                    </span>
                  )}
                </div>
                <div className="mt-3 text-[10px] uppercase tracking-[0.2em]" style={{ color: T.inkFaint }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <section className="space-y-4">
            <div
              className="flex items-center gap-3 border-b pb-3"
              style={{ borderColor: T.ruleStrong }}
            >
              <Search className="h-4 w-4 shrink-0" style={{ color: T.inkFaint }} />
              <input
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar gimnasio, notas o descripción"
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: T.ink }}
              />
            </div>

            <div
              className="grid overflow-hidden border sm:grid-cols-6"
              style={{ borderColor: T.ruleStrong }}
            >
              {filters.map((filter, index) => {
                const active = typeFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    className="px-3 py-3 text-[10px] uppercase tracking-[0.18em]"
                    onClick={() => {
                      setTypeFilter(filter.key);
                      setCurrentPage(1);
                    }}
                    style={{
                      background: active ? T.ink : 'transparent',
                      color: active ? T.bg : T.inkMuted,
                      borderRight: index < filters.length - 1 ? `1px solid ${T.rule}` : 'none',
                      borderBottom:
                        index < 4 && filters.length > 4 ? `1px solid ${T.rule}` : 'none',
                    }}
                    type="button"
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Kicker index="01">Historial</Kicker>
              <span className="text-sm" style={{ color: T.inkFaint }}>
                {filteredSessions.length} resultado{filteredSessions.length === 1 ? '' : 's'}
              </span>
            </div>

            {isError ? (
              <div className="border px-5 py-8 text-center" style={{ borderColor: T.ruleStrong, background: T.panel }}>
                <p className="text-sm" style={{ color: T.inkMuted }}>
                  No se pudieron cargar las sesiones.
                </p>
                <button
                  className="mt-4 border px-4 py-2 text-[11px] uppercase tracking-[0.18em]"
                  onClick={() => refetch()}
                  style={{ borderColor: T.ruleStrong, color: T.ink }}
                  type="button"
                >
                  Reintentar
                </button>
              </div>
            ) : isLoading ? (
              <div className="border px-5 py-8 text-center text-sm" style={{ borderColor: T.ruleStrong, background: T.panel, color: T.inkMuted }}>
                Cargando…
              </div>
            ) : paginatedSessions.length === 0 ? (
              <div className="border px-5 py-8 text-center" style={{ borderColor: T.ruleStrong, background: T.panel }}>
                <p className="text-sm" style={{ color: T.inkMuted }}>
                  {sessions.length === 0
                    ? 'Aún no hay sesiones registradas.'
                    : 'No hay resultados con los filtros actuales.'}
                </p>
                <Link
                  to="/sessions/new"
                  className="mt-4 inline-flex items-center gap-2 border px-4 py-2 text-[11px] uppercase tracking-[0.18em] no-underline"
                  style={{ borderColor: T.ruleStrong, color: T.ink }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nueva sesión
                </Link>
              </div>
            ) : (
              <div className="border" style={{ borderColor: T.ruleStrong, background: T.bg }}>
                {paginatedSessions.map((session, index) => {
                  const config = SESSION_ICON_CONFIG[session.session_type] || SESSION_ICON_CONFIG.training;
                  const SessionIcon = config.Icon;
                  const sends = session.climbs?.filter((climb) => climb.sent).length || 0;
                  const attempts =
                    session.climbs?.reduce((sum, climb) => sum + (climb.attempts || 0), 0) ||
                    session.climbs?.length ||
                    0;

                  return (
                    <Link
                      key={session.id}
                      to={`/sessions/${session.id}`}
                      className="flex items-center gap-4 px-4 py-4 no-underline sm:px-5"
                      style={{
                        borderBottom: index < paginatedSessions.length - 1 ? `1px solid ${T.rule}` : 'none',
                      }}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                        style={{ background: T.panelSoft, border: `1px solid ${T.ruleStrong}`, color: config.accent }}
                      >
                        <SessionIcon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: T.inkFaint }}>
                          <span>{format(parseISO(session.date), 'EEE d MMM', { locale: es })}</span>
                          <span>{config.label}</span>
                          {session.isFromStrava && <span style={{ color: T.accent }}>Strava</span>}
                        </div>
                        <div className="mt-1 text-lg font-semibold tracking-[-0.03em]" style={{ color: T.ink }}>
                          {session.gyms?.name || config.label}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm" style={{ color: T.inkMuted }}>
                          {CLIMB_TYPES.has(session.session_type) ? (
                            <span>
                              {sends}/{attempts} tops
                            </span>
                          ) : (
                            <>
                              <span>{Number(session.distance_km || 0).toFixed(1)} km</span>
                              <span>{getSessionDuration(session)} min</span>
                            </>
                          )}
                          {session.rpe_1_10 && <span>RPE {session.rpe_1_10}</span>}
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: T.inkFaint }} />
                    </Link>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  className="border px-3 py-2 font-mono text-[11px]"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  style={{
                    borderColor: T.ruleStrong,
                    color: currentPage === 1 ? T.inkDim : T.ink,
                  }}
                  type="button"
                >
                  ←
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
                  let pageNumber = index + 1;
                  if (totalPages > 5) {
                    if (currentPage <= 3) pageNumber = index + 1;
                    else if (currentPage >= totalPages - 2) pageNumber = totalPages - 4 + index;
                    else pageNumber = currentPage - 2 + index;
                  }

                  const active = pageNumber === currentPage;

                  return (
                    <button
                      key={pageNumber}
                      className="border px-3 py-2 font-mono text-[11px]"
                      onClick={() => setCurrentPage(pageNumber)}
                      style={{
                        background: active ? T.ink : 'transparent',
                        borderColor: active ? T.ink : T.ruleStrong,
                        color: active ? T.bg : T.ink,
                      }}
                      type="button"
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                <button
                  className="border px-3 py-2 font-mono text-[11px]"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  style={{
                    borderColor: T.ruleStrong,
                    color: currentPage === totalPages ? T.inkDim : T.ink,
                  }}
                  type="button"
                >
                  →
                </button>
              </div>
            )}
          </section>

          <section className="border-t pt-6" style={{ borderColor: T.rule }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Kicker index="02">Accesos</Kicker>
              <div className="flex flex-wrap gap-2">
                <button
                  className="border px-3 py-2 text-[11px] uppercase tracking-[0.18em]"
                  onClick={() => navigate('/analytics')}
                  style={{ borderColor: T.ruleStrong, color: T.ink }}
                  type="button"
                >
                  Ir a stats
                </button>
                <button
                  className="border px-3 py-2 text-[11px] uppercase tracking-[0.18em]"
                  onClick={() => navigate('/sessions/new')}
                  style={{ borderColor: T.ruleStrong, color: T.ink }}
                  type="button"
                >
                  Registrar entrenamiento
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
