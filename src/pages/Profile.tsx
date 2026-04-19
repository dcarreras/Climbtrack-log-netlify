import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStrava } from '@/hooks/useStrava';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  Activity,
  BarChart3,
  BookOpen,
  Camera,
  ChevronRight,
  CircleHelp,
  Clock3,
  Footprints,
  Grid2x2,
  Link2,
  Loader2,
  Save,
  Settings,
  Trophy,
  Unlink,
  User,
  List,
  RefreshCw,
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type GradeSystem = Database['public']['Enums']['grade_system'];

const gradeSystems: { value: GradeSystem; label: string }[] = [
  { value: 'v-grade', label: 'V-Scale (V0, V4, V8)' },
  { value: 'font', label: 'Font (4a, 6b+, 7c)' },
  { value: 'french', label: 'French (5a, 6c, 8a)' },
  { value: 'yds', label: 'YDS (5.10a, 5.12c)' },
];

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

const BOULDER_ORDER = ['white', 'blue', 'green', 'yellow', 'red', 'purple', 'black'];

function Kicker({ index, children }: { index?: string; children: React.ReactNode }) {
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

function MenuRow({
  icon,
  title,
  subtitle,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div
      className="flex items-center gap-4 px-4 py-4 sm:px-5"
      style={{ borderBottom: `1px solid ${T.rule}` }}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ color: T.inkMuted }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xl font-semibold tracking-[-0.03em]" style={{ color: T.ink }}>
          {title}
        </div>
        <div className="mt-1 text-sm" style={{ color: T.inkFaint }}>
          {subtitle}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: T.inkFaint }} />
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block no-underline">
        {content}
      </Link>
    );
  }

  return (
    <button className="block w-full text-left" onClick={onClick} type="button">
      {content}
    </button>
  );
}

function SectionCard({
  id,
  title,
  icon,
  children,
  accent,
}: {
  id?: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section id={id} className="border" style={{ borderColor: T.ruleStrong, background: T.panel }}>
      <div className="border-b px-5 py-4" style={{ borderColor: T.rule }}>
        <div className="flex items-center gap-3">
          <div style={{ color: accent || T.inkMuted }}>{icon}</div>
          <h2 className="text-[2rem] font-semibold tracking-[-0.04em]" style={{ color: T.ink }}>
            {title}
          </h2>
        </div>
      </div>
      <div className="space-y-5 px-5 py-5">{children}</div>
    </section>
  );
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const {
    isConnected: isStravaConnected,
    connection,
    isLoading: isStravaLoading,
    isSyncing,
    connectStrava,
    disconnectStrava,
    isDisconnecting,
    syncActivities,
  } = useStrava();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['profile-menu-sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, date, session_type, distance_km, climbs(sent, grade_value, color_band)')
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['profile-menu-attachments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attachments')
        .select('id, type, session_id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: customProtocols = [] } = useQuery({
    queryKey: ['profile-menu-protocols', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hangboard_protocols')
        .select('id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [displayName, setDisplayName] = useState('');
  const [gradeSystem, setGradeSystem] = useState<GradeSystem>('v-grade');
  const [units, setUnits] = useState('kg');
  const [weeklyRunningKmGoal, setWeeklyRunningKmGoal] = useState('20');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name || '');
    setGradeSystem(profile.default_grade_system || 'v-grade');
    setUnits(profile.units || 'kg');
    setWeeklyRunningKmGoal(profile.weekly_running_km_goal?.toString() || '20');
    setAvatarUrl(profile.avatar_url || null);
  }, [profile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor de 5MB');
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, avatar_url: data.publicUrl });

      if (updateError) throw updateError;

      setAvatarUrl(data.publicUrl);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Foto actualizada');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la foto');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').upsert({
        id: user!.id,
        display_name: displayName || null,
        default_grade_system: gradeSystem,
        units,
        weekly_running_km_goal: parseFloat(weeklyRunningKmGoal) || 20,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Ajustes guardados');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const firstName = (displayName || user?.email?.split('@')[0] || 'Usuario').split(' ')[0];

  const menuStats = useMemo(() => {
    const photoCount = attachments.filter((attachment) => attachment.type === 'photo').length;
    const placeCount = new Set(attachments.map((attachment) => attachment.session_id).filter(Boolean)).size;
    const longestRun = sessions
      .filter((session) => session.session_type === 'running')
      .reduce((max, session) => Math.max(max, Number(session.distance_km) || 0), 0);
    const maxBoulder =
      sessions
        .flatMap((session) => session.climbs || [])
        .filter((climb) => climb.sent && climb.color_band)
        .sort((left, right) => {
          const leftIndex = BOULDER_ORDER.indexOf(String(left.color_band).toLowerCase());
          const rightIndex = BOULDER_ORDER.indexOf(String(right.color_band).toLowerCase());
          return rightIndex - leftIndex;
        })[0]?.color_band || 'Sin datos';

    return {
      sessionsLabel:
        sessions.length > 0
          ? `${sessions.length} sesiones · ${new Intl.DateTimeFormat('es-ES', {
              month: 'short',
              year: 'numeric',
            }).format(new Date())}`
          : 'Sin sesiones registradas',
      galleryLabel: `${photoCount} fotos · ${placeCount} lugares`,
      timerLabel: `Protocolos guardados · ${customProtocols.length}`,
      recordsLabel: `${String(maxBoulder).toUpperCase()} boulder · ${longestRun.toFixed(1)} km`,
    };
  }, [attachments, customProtocols.length, sessions]);

  const goToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[980px] pb-24 pt-4 sm:pt-6">
        <div className="space-y-8 px-4 sm:space-y-10 sm:px-6 md:px-8">
          <header>
            <Kicker>Navegación completa</Kicker>
            <h1
              className="mt-3 text-[clamp(2.5rem,8vw,4.2rem)] font-bold uppercase leading-none tracking-[-0.05em]"
              style={{ color: T.ink }}
            >
              Menú
            </h1>
          </header>

          <div className="border p-4 sm:p-5" style={{ borderColor: T.ruleStrong, background: T.panel }}>
            <div className="flex flex-wrap items-center gap-4">
              <Avatar className="h-16 w-16 border" style={{ borderColor: T.ruleStrong }}>
                <AvatarImage src={avatarUrl || undefined} alt="Foto de perfil" />
                <AvatarFallback style={{ background: T.ink, color: T.bg, fontSize: 28, fontWeight: 700 }}>
                  {firstName[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-semibold tracking-[-0.03em]" style={{ color: T.ink }}>
                  {displayName || firstName}
                </div>
                <div className="mt-1 text-sm" style={{ color: T.inkFaint }}>
                  {user?.email}
                </div>
              </div>
              <button
                className="border px-4 py-2 text-[11px] uppercase tracking-[0.18em]"
                onClick={() => goToSection('perfil')}
                style={{ borderColor: T.ruleStrong, color: T.ink }}
                type="button"
              >
                Ver
              </button>
            </div>
          </div>

          <section className="space-y-3">
            <Kicker index="01">Actividad</Kicker>
            <div className="border" style={{ borderColor: T.ruleStrong, background: T.bg }}>
              <MenuRow
                icon={<List className="h-5 w-5" />}
                title="Historial de sesiones"
                subtitle={menuStats.sessionsLabel}
                href="/sessions"
              />
              <MenuRow
                icon={<Grid2x2 className="h-5 w-5" />}
                title="Galería"
                subtitle={menuStats.galleryLabel}
                href="/library"
              />
              <MenuRow
                icon={<Clock3 className="h-5 w-5" />}
                title="Cronómetro · Hangboard"
                subtitle={menuStats.timerLabel}
                href="/timer?tab=hangboard"
              />
            </div>
          </section>

          <section className="space-y-3">
            <Kicker index="02">Progreso</Kicker>
            <div className="border" style={{ borderColor: T.ruleStrong, background: T.bg }}>
              <MenuRow
                icon={<BarChart3 className="h-5 w-5" />}
                title="Análisis y tendencias"
                subtitle="ACWR · Volumen · Pirámide"
                href="/analytics"
              />
              <MenuRow
                icon={<Trophy className="h-5 w-5" />}
                title="Récords personales"
                subtitle={menuStats.recordsLabel}
                href="/analytics"
              />
              <MenuRow
                icon={<BookOpen className="h-5 w-5" />}
                title="Biblioteca de rutas"
                subtitle="Sesiones y detalles guardados"
                href="/sessions"
              />
            </div>
          </section>

          <section className="space-y-3">
            <Kicker index="03">Cuenta</Kicker>
            <div className="border" style={{ borderColor: T.ruleStrong, background: T.bg }}>
              <MenuRow
                icon={<User className="h-5 w-5" />}
                title="Perfil"
                subtitle={displayName || firstName}
                onClick={() => goToSection('perfil')}
              />
              <MenuRow
                icon={<Link2 className="h-5 w-5" />}
                title="Integraciones"
                subtitle={isStravaConnected ? 'Strava · conectado' : 'Strava · pendiente'}
                onClick={() => goToSection('integraciones')}
              />
              <MenuRow
                icon={<Settings className="h-5 w-5" />}
                title="Ajustes y unidades"
                subtitle={`${units === 'kg' ? 'Métrico' : 'Imperial'} · ${gradeSystem}`}
                onClick={() => goToSection('ajustes')}
              />
              <MenuRow
                icon={<CircleHelp className="h-5 w-5" />}
                title="Ayuda y soporte"
                subtitle="Centro · Contacto"
                onClick={() => goToSection('soporte')}
              />
            </div>
          </section>

          <SectionCard id="perfil" title="Perfil" icon={<User className="h-5 w-5" />}>
            <div className="flex flex-col items-center gap-4 border-b pb-5" style={{ borderColor: T.rule }}>
              <div className="relative">
                <Avatar className="h-28 w-28 border" style={{ borderColor: T.ruleStrong }}>
                  <AvatarImage src={avatarUrl || undefined} alt="Foto de perfil" />
                  <AvatarFallback style={{ background: T.ink, color: T.bg, fontSize: 36, fontWeight: 700 }}>
                    {firstName[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border"
                  style={{ background: T.panel, borderColor: T.ruleStrong, color: T.ink }}
                  disabled={uploadingAvatar}
                  type="button"
                >
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <p className="text-sm" style={{ color: T.inkMuted }}>
                Haz clic en el icono para cambiar tu foto
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Nombre</Label>
                <Input
                  id="displayName"
                  placeholder="Tu nombre"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard id="ajustes" title="Preferencias" icon={<Settings className="h-5 w-5" />} accent={T.accent}>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="gradeSystem">Sistema de grados por defecto</Label>
                <Select value={gradeSystem} onValueChange={(value) => setGradeSystem(value as GradeSystem)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeSystems.map((grade) => (
                      <SelectItem key={grade.value} value={grade.value}>
                        {grade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="units">Unidades de peso</Label>
                <Select value={units} onValueChange={setUnits}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                    <SelectItem value="lb">Libras (lb)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="objetivos" title="Objetivos Running" icon={<Footprints className="h-5 w-5" />} accent="#38BDF8">
            <div className="space-y-2">
              <Label htmlFor="weeklyKmGoal">Objetivo semanal de km</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="weeklyKmGoal"
                  type="number"
                  min="0"
                  step="1"
                  value={weeklyRunningKmGoal}
                  onChange={(event) => setWeeklyRunningKmGoal(event.target.value)}
                  className="w-28"
                />
                <span style={{ color: T.inkMuted }}>km / semana</span>
              </div>
              <p className="text-xs" style={{ color: T.inkFaint }}>
                Se usa en el resumen conjunto para controlar volumen y posibles interferencias.
              </p>
            </div>
          </SectionCard>

          <SectionCard id="integraciones" title="Strava" icon={<Activity className="h-5 w-5" />} accent="#F97316">
            {isStravaLoading ? (
              <div className="text-sm" style={{ color: T.inkMuted }}>
                Cargando estado de Strava…
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm" style={{ color: T.inkMuted }}>
                    {isStravaConnected
                      ? `Conectado desde ${connection?.created_at ? new Date(connection.created_at).toLocaleDateString('es-ES') : ''}`
                      : 'Conecta tu cuenta para importar actividades de running y bici'}
                  </span>
                  {isStravaConnected && (
                    <span
                      className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em]"
                      style={{ background: 'rgba(34,197,94,0.12)', color: '#4ADE80' }}
                    >
                      Conectado
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {isStravaConnected ? (
                    <>
                      <Button variant="outline" onClick={syncActivities} disabled={isSyncing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Sincronizando…' : 'Sincronizar ahora'}
                      </Button>
                      <Button variant="destructive" onClick={() => disconnectStrava()} disabled={isDisconnecting}>
                        <Unlink className="mr-2 h-4 w-4" />
                        Desconectar
                      </Button>
                    </>
                  ) : (
                    <Button onClick={connectStrava}>
                      <Link2 className="mr-2 h-4 w-4" />
                      Conectar con Strava
                    </Button>
                  )}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard id="soporte" title="Ayuda y soporte" icon={<CircleHelp className="h-5 w-5" />}>
            <div className="space-y-3">
              <p className="text-sm" style={{ color: T.inkMuted }}>
                Si algo no cuadra en sesiones, sincronización o métricas, usa estos accesos rápidos.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="mailto:support@ascend.app?subject=Soporte%20Ascend"
                  className="border px-4 py-2 text-[11px] uppercase tracking-[0.18em] no-underline"
                  style={{ borderColor: T.ruleStrong, color: T.ink }}
                >
                  Contacto
                </a>
                <button
                  className="border px-4 py-2 text-[11px] uppercase tracking-[0.18em]"
                  onClick={() => navigate('/analytics')}
                  style={{ borderColor: T.ruleStrong, color: T.ink }}
                  type="button"
                >
                  Ver métricas
                </button>
              </div>
            </div>
          </SectionCard>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            <Button variant="destructive" onClick={async () => signOut()}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
