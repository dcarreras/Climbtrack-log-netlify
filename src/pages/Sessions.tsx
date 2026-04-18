import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStrava } from '@/hooks/useStrava';
import AppLayout from '@/components/layout/AppLayout';
import { RunningSessionCard } from '@/components/sessions/RunningSessionCard';
import { ClimbSessionCard } from '@/components/sessions/ClimbSessionCard';
import { Search, RefreshCw } from 'lucide-react';

type SessionType = 'boulder' | 'rope' | 'hybrid' | 'training' | 'running' | 'bike' | 'all';

const ITEMS_PER_PAGE = 10;

export default function Sessions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<SessionType>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { 
    isConnected: isStravaConnected, 
    isSyncing, 
    syncActivities 
  } = useStrava();

  const { data: sessions, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: async () => {
      const [sessionsResult, stravaResult] = await Promise.all([
        supabase
          .from('sessions')
          .select(`
            *,
            gyms(name, city),
            climbs(id, sent, flash, color_band, grade_value, discipline)
          `)
          .eq('user_id', user!.id)
          .order('date', { ascending: false }),
        supabase
          .from('strava_activities')
          .select('synced_to_session_id')
          .eq('user_id', user!.id)
          .not('synced_to_session_id', 'is', null)
      ]);
      
      if (sessionsResult.error) throw sessionsResult.error;
      
      const stravaSessionIds = new Set(
        stravaResult.data?.map(a => a.synced_to_session_id) || []
      );
      
      return sessionsResult.data.map(session => ({
        ...session,
        isFromStrava: stravaSessionIds.has(session.id)
      }));
    },
    enabled: !!user,
  });

  const filteredSessions = sessions?.filter((session) => {
    const matchesType = typeFilter === 'all' || session.session_type === typeFilter;
    const matchesSearch = searchTerm === '' || 
      session.gyms?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesSearch;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSessions = filteredSessions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  const handleFilterChange = (value: SessionType) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Stats
  const totalSessions = sessions?.length || 0;
  const totalClimbs = sessions?.reduce((acc, s) => acc + (s.climbs?.length || 0), 0) || 0;
  const totalSends =
    sessions?.reduce(
      (acc, s) => acc + (s.climbs?.filter((c: { sent: boolean }) => c.sent).length || 0),
      0,
    ) || 0;
  const totalKm = sessions?.reduce((acc, s) => acc + (Number(s.distance_km) || 0), 0) || 0;

  // Check if session is running type
  const isEnduranceSession = (sessionType: string) =>
    sessionType === 'running' || sessionType === 'bike';

  const T = {
    bg: '#050505', bgCard: '#131313', ink: '#FAFAF9',
    inkMuted: 'rgba(250,250,249,0.62)', inkFaint: 'rgba(250,250,249,0.38)',
    inkDim: 'rgba(250,250,249,0.16)', rule: 'rgba(250,250,249,0.09)',
    ruleStrong: 'rgba(250,250,249,0.18)', accent: '#E23A1F',
    sans: "'Urbanist', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', monospace",
  };

  const filters: { k: SessionType; l: string }[] = [
    { k: 'all', l: 'Todo' },
    { k: 'boulder', l: 'Boulder' },
    { k: 'rope', l: 'Cuerda' },
    { k: 'running', l: 'Running' },
    { k: 'bike', l: 'Bici' },
  ];

  return (
    <AppLayout>
      <div style={{ background: T.bg, minHeight: '100vh', paddingBottom: 100 }}>
        {/* Header */}
        <div style={{ padding: '28px 20px 24px' }}>
          <div style={{ fontFamily: T.sans, fontSize: 10, color: T.inkFaint,
            textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: 10 }}>
            Historial
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: T.sans, fontSize: 42, color: T.ink, lineHeight: 0.95,
              fontWeight: 700, letterSpacing: '-0.025em', textTransform: 'uppercase' }}>
              Sesiones
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {isStravaConnected && (
                <button onClick={syncActivities} disabled={isSyncing} style={{
                  background: 'transparent', border: `1px solid rgba(249,115,22,0.4)`,
                  color: '#f97316', padding: '8px 14px', cursor: 'pointer',
                  fontFamily: T.sans, fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <RefreshCw style={{ width: 12, height: 12 }} className={isSyncing ? 'animate-spin' : ''} />
                  Strava
                </button>
              )}
              <button onClick={() => navigate('/sessions/new')} style={{
                background: T.ink, color: T.bg, border: 'none',
                padding: '10px 18px', cursor: 'pointer',
                fontFamily: T.sans, fontSize: 11, fontWeight: 600,
                letterSpacing: '0.16em', textTransform: 'uppercase',
              }}>
                + Nueva
              </button>
            </div>
          </div>
        </div>

        {/* Summary strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
          borderTop: `1px solid ${T.rule}`, borderBottom: `1px solid ${T.rule}` }}>
          {[
            { value: totalSessions, label: 'Total' },
            { value: totalClimbs, label: 'Vías' },
            { value: totalSends, label: 'Tops' },
            { value: `${totalKm.toFixed(0)}`, label: 'km' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '16px 16px',
              borderRight: i < 3 ? `1px solid ${T.rule}` : 'none',
            }}>
              <div style={{ fontFamily: T.sans, fontSize: 26, color: T.ink,
                fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>
                {s.value}
              </div>
              <div style={{ fontFamily: T.sans, fontSize: 9, color: T.inkFaint,
                textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: 6, fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Type filters */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${T.rule}` }}>
            {filters.map(f => (
              <button key={f.k} onClick={() => handleFilterChange(f.k)} style={{
                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 0', position: 'relative',
                fontFamily: T.sans, fontSize: 10,
                color: typeFilter === f.k ? T.ink : T.inkFaint,
                textTransform: 'uppercase', letterSpacing: '0.18em',
                fontWeight: typeFilter === f.k ? 600 : 500,
              }}>
                {f.l}
                {typeFilter === f.k && (
                  <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0,
                    height: 1, background: T.ink }} />
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 0', borderBottom: `1px solid ${T.rule}` }}>
            <Search style={{ width: 14, height: 14, color: T.inkFaint, flexShrink: 0 }} />
            <input
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Buscar gimnasio, notas…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: T.ink, fontFamily: T.sans, fontSize: 14,
              }}
            />
          </div>
        </div>

        {/* Sessions list */}
        <div style={{ padding: '0 20px' }}>
          {isError ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ fontFamily: T.sans, fontSize: 14, color: T.inkFaint, marginBottom: 16 }}>
                Error al cargar sesiones
              </div>
              <button onClick={() => refetch()} style={{
                background: 'transparent', border: `1px solid ${T.ruleStrong}`,
                color: T.ink, padding: '10px 20px', cursor: 'pointer',
                fontFamily: T.sans, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>Reintentar</button>
            </div>
          ) : isLoading ? (
            <div style={{ padding: '40px 0', textAlign: 'center',
              fontFamily: T.sans, fontSize: 13, color: T.inkFaint }}>
              Cargando…
            </div>
          ) : filteredSessions.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ fontFamily: T.sans, fontSize: 15, color: T.ink,
                fontWeight: 600, marginBottom: 8 }}>
                {sessions?.length === 0 ? 'Sin sesiones' : 'Sin resultados'}
              </div>
              <div style={{ fontFamily: T.sans, fontSize: 13, color: T.inkFaint, marginBottom: 20 }}>
                {sessions?.length === 0 ? 'Empieza registrando tu primera sesión.' : 'Prueba otros filtros.'}
              </div>
              {sessions?.length === 0 && (
                <button onClick={() => navigate('/sessions/new')} style={{
                  background: T.ink, color: T.bg, border: 'none',
                  padding: '12px 24px', cursor: 'pointer',
                  fontFamily: T.sans, fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.16em', textTransform: 'uppercase',
                }}>+ Nueva sesión</button>
              )}
            </div>
          ) : (
            <>
              <div style={{ marginTop: 8 }}>
                {paginatedSessions.map(session =>
                  isEnduranceSession(session.session_type) ? (
                    <RunningSessionCard key={session.id} session={session} onClick={() => navigate(`/sessions/${session.id}`)} />
                  ) : (
                    <ClimbSessionCard key={session.id} session={session} onClick={() => navigate(`/sessions/${session.id}`)} />
                  )
                )}
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 4,
                  padding: '24px 0', borderTop: `1px solid ${T.rule}`, marginTop: 8 }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      background: 'transparent', border: `1px solid ${T.ruleStrong}`,
                      color: currentPage === 1 ? T.inkDim : T.ink,
                      padding: '8px 14px', cursor: currentPage === 1 ? 'default' : 'pointer',
                      fontFamily: T.mono, fontSize: 11,
                    }}>←</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button key={pageNum} onClick={() => setCurrentPage(pageNum)} style={{
                        background: currentPage === pageNum ? T.ink : 'transparent',
                        color: currentPage === pageNum ? T.bg : T.inkMuted,
                        border: `1px solid ${currentPage === pageNum ? T.ink : T.rule}`,
                        padding: '8px 14px', cursor: 'pointer',
                        fontFamily: T.mono, fontSize: 11,
                      }}>{pageNum}</button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      background: 'transparent', border: `1px solid ${T.ruleStrong}`,
                      color: currentPage === totalPages ? T.inkDim : T.ink,
                      padding: '8px 14px', cursor: currentPage === totalPages ? 'default' : 'pointer',
                      fontFamily: T.mono, fontSize: 11,
                    }}>→</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
