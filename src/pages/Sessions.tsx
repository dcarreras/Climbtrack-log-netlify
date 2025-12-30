import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStrava } from '@/hooks/useStrava';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { RunningSessionCard } from '@/components/sessions/RunningSessionCard';
import { ClimbSessionCard } from '@/components/sessions/ClimbSessionCard';
import { 
  Plus, 
  Search, 
  Calendar, 
  Target, 
  CheckCircle2,
  Filter,
  Activity,
  Route,
  RefreshCw
} from 'lucide-react';

type SessionType = 'boulder' | 'rope' | 'hybrid' | 'training' | 'running' | 'all';

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
  const totalSends = sessions?.reduce((acc, s) => acc + (s.climbs?.filter((c: any) => c.sent).length || 0), 0) || 0;
  const totalKm = sessions?.reduce((acc, s) => acc + (Number(s.distance_km) || 0), 0) || 0;

  // Check if session is running type
  const isRunningSession = (sessionType: string) => sessionType === 'running';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Mis Sesiones</h1>
            <p className="text-muted-foreground">Historial completo de entrenamientos</p>
          </div>
          <div className="flex items-center gap-2">
            {isStravaConnected && (
              <Button 
                variant="outline" 
                onClick={syncActivities} 
                disabled={isSyncing}
                className="border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                <Activity className="h-4 w-4 mr-1" />
                Sync Strava
              </Button>
            )}
            <Button onClick={() => navigate('/sessions/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Sesión
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="pt-4 text-center">
              <Calendar className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold">{totalSessions}</div>
              <div className="text-xs text-muted-foreground">Sesiones</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-4 text-center">
              <Target className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold">{totalClimbs}</div>
              <div className="text-xs text-muted-foreground">Escaladas</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-4 text-center">
              <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-green-500">{totalSends}</div>
              <div className="text-xs text-muted-foreground">Completadas</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-4 text-center">
              <Route className="h-5 w-5 text-cyan-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-cyan-500">{totalKm.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">km totales</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-elevated">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por gimnasio, notas..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => handleFilterChange(v as SessionType)}>
                <SelectTrigger className="w-full sm:w-44">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="boulder">Boulder</SelectItem>
                  <SelectItem value="rope">Cuerda</SelectItem>
                  <SelectItem value="hybrid">Mixto</SelectItem>
                  <SelectItem value="training">Entrenamiento</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sessions List */}
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>
                Registro de Sesiones
                {filteredSessions.length !== sessions?.length && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({filteredSessions.length} de {sessions?.length})
                  </span>
                )}
              </span>
              {filteredSessions.length > 0 && (
                <Badge variant="secondary" className="text-xs font-normal">
                  Mostrando {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredSessions.length)} de {filteredSessions.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isError ? (
              <div className="p-8 text-center">
                <Calendar className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pudimos cargar las sesiones</h3>
                <p className="text-muted-foreground mb-4">
                  {error instanceof Error ? error.message : 'Error desconocido. Intenta recargar.'}
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Cargando sesiones...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {sessions?.length === 0 ? 'Sin sesiones registradas' : 'Sin resultados'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {sessions?.length === 0 
                    ? 'Comienza registrando tu primera sesión de escalada'
                    : 'Intenta con otros filtros de búsqueda'
                  }
                </p>
                {sessions?.length === 0 && (
                  <Button onClick={() => navigate('/sessions/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Sesión
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedSessions.map((session) => (
                    isRunningSession(session.session_type) ? (
                      <RunningSessionCard
                        key={session.id}
                        session={session}
                        onClick={() => navigate(`/sessions/${session.id}`)}
                      />
                    ) : (
                      <ClimbSessionCard
                        key={session.id}
                        session={session}
                        onClick={() => navigate(`/sessions/${session.id}`)}
                      />
                    )
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination className="mt-6">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
