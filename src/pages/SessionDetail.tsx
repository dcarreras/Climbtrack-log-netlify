import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Target, 
  Plus,
  ChevronLeft,
  Trash2,
  CheckCircle2,
  XCircle,
  Camera,
  Pencil,
  Activity,
  Timer,
  TrendingUp,
  Gauge,
  Heart,
  Flame,
  Mountain
} from 'lucide-react';
import { format } from 'date-fns';
import AddClimbForm from '@/components/climbs/AddClimbForm';
import EditClimbDialog from '@/components/climbs/EditClimbDialog';
import MediaUpload from '@/components/media/MediaUpload';
import MediaGallery from '@/components/media/MediaGallery';
import EditSessionDialog from '@/components/session/EditSessionDialog';

// Helper to get attachments for a specific climb
const getClimbAttachments = (attachments: any[], climbId: string) => {
  return attachments?.filter((a: any) => a.climb_id === climbId) || [];
};

// Helper to get session-level attachments (no climb_id)
const getSessionAttachments = (attachments: any[]) => {
  return attachments?.filter((a: any) => !a.climb_id) || [];
};

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddClimb, setShowAddClimb] = useState(false);
  const [showUploadMedia, setShowUploadMedia] = useState(false);
  const [showEditSession, setShowEditSession] = useState(false);
  const [editingClimb, setEditingClimb] = useState<any>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, gyms(name, city), climbs(*), attachments(*)')
        .eq('id', id!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch Strava data if this session is linked
  const { data: stravaData } = useQuery({
    queryKey: ['strava-activity', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strava_activities')
        .select('*')
        .eq('synced_to_session_id', id!)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const deleteSession = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sessions').delete().eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
      toast.success('Session deleted');
      navigate('/home');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  const deleteClimb = useMutation({
    mutationFn: async (climbId: string) => {
      const { error } = await supabase.from('climbs').delete().eq('id', climbId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      toast.success('Climb deleted');
    },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-40 bg-muted rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  if (!session) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Session not found</h2>
          <Link to="/home">
            <Button>Volver a Home</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const sends = session.climbs?.filter((c: any) => c.sent).length || 0;
  const attempts = session.climbs?.length || 0;
  const sendRate = attempts > 0 ? Math.round((sends / attempts) * 100) : 0;

  const getGradeColor = (grade: string) => {
    if (!grade) return 'bg-muted';
    const num = parseInt(grade.replace(/\D/g, ''));
    if (num <= 2) return 'bg-success';
    if (num <= 4) return 'bg-info';
    if (num <= 6) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {format(new Date(session.date), 'EEEE, MMMM d, yyyy')}
            </h1>
            {session.description && (
              <p className="text-muted-foreground mt-1">{session.description}</p>
            )}
            <div className="flex items-center gap-3 text-muted-foreground mt-1">
              <Badge variant="secondary" className="capitalize">
                {session.session_type}
              </Badge>
              {session.gyms?.name && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {session.gyms.name}
                </span>
              )}
            </div>
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setShowEditSession(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar sesión?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán la sesión, todas las escaladas y las fotos asociadas. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteSession.mutate()}
                  className="bg-destructive text-destructive-foreground"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Edit Session Dialog */}
        {session && (
          <EditSessionDialog
            session={session}
            open={showEditSession}
            onOpenChange={setShowEditSession}
          />
        )}

        {/* Strava Data Card - Show if linked to Strava */}
        {stravaData && (
          <Card className="card-elevated border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                Datos de Strava
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {/* Distance */}
                {stravaData.distance_meters && (
                  <div className="text-center">
                    <TrendingUp className="h-4 w-4 text-cyan-500 mx-auto mb-1" />
                    <div className="text-xl font-bold">{(stravaData.distance_meters / 1000).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">km</div>
                  </div>
                )}
                {/* Pace (min/km) */}
                {stravaData.average_speed && stravaData.average_speed > 0 && (
                  <div className="text-center">
                    <Gauge className="h-4 w-4 text-green-500 mx-auto mb-1" />
                    <div className="text-xl font-bold">
                      {(() => {
                        const paceSeconds = 1000 / stravaData.average_speed;
                        const mins = Math.floor(paceSeconds / 60);
                        const secs = Math.floor(paceSeconds % 60);
                        return `${mins}:${secs.toString().padStart(2, '0')}`;
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">min/km</div>
                  </div>
                )}
                {/* Moving Time */}
                {stravaData.moving_time_seconds && (
                  <div className="text-center">
                    <Timer className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                    <div className="text-xl font-bold">
                      {Math.floor(stravaData.moving_time_seconds / 60)}:{(stravaData.moving_time_seconds % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-xs text-muted-foreground">tiempo</div>
                  </div>
                )}
                {/* Elevation */}
                {stravaData.total_elevation_gain && (
                  <div className="text-center">
                    <Mountain className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                    <div className="text-xl font-bold">{Math.round(stravaData.total_elevation_gain)}</div>
                    <div className="text-xs text-muted-foreground">m desnivel</div>
                  </div>
                )}
                {/* Heart Rate */}
                {stravaData.average_heartrate && (
                  <div className="text-center">
                    <Heart className="h-4 w-4 text-red-500 mx-auto mb-1" />
                    <div className="text-xl font-bold">{Math.round(stravaData.average_heartrate)}</div>
                    <div className="text-xs text-muted-foreground">bpm avg</div>
                  </div>
                )}
                {/* Calories */}
                {stravaData.calories && (
                  <div className="text-center">
                    <Flame className="h-4 w-4 text-orange-500 mx-auto mb-1" />
                    <div className="text-xl font-bold">{stravaData.calories}</div>
                    <div className="text-xs text-muted-foreground">kcal</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="card-elevated">
            <CardContent className="pt-6 text-center">
              <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold">{session.duration_min || '-'}</div>
              <div className="text-xs text-muted-foreground">Minutes</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6 text-center">
              <Target className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold">{attempts}</div>
              <div className="text-xs text-muted-foreground">Climbs</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-1" />
              <div className="text-2xl font-bold text-success">{sends}</div>
              <div className="text-xs text-muted-foreground">Sends</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{sendRate}%</div>
              <div className="text-xs text-muted-foreground">Send Rate</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{session.rpe_1_10 || '-'}</div>
              <div className="text-xs text-muted-foreground">RPE</div>
            </CardContent>
          </Card>
        </div>

        {/* Session Info */}
        {(session.mood || session.notes) && (
          <Card className="card-elevated">
            <CardContent className="pt-6">
              {session.mood && (
                <div className="mb-3">
                  <span className="text-lg">{session.mood}</span>
                </div>
              )}
              {session.notes && (
                <p className="text-muted-foreground">{session.notes}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Media Gallery & Upload - Session level only */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Fotos y Videos de la Sesión
            </h2>
            <Dialog open={showUploadMedia} onOpenChange={setShowUploadMedia}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Subir
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Subir Media</DialogTitle>
                </DialogHeader>
                <MediaUpload 
                  sessionId={session.id} 
                  onSuccess={() => setShowUploadMedia(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {getSessionAttachments(session.attachments).length > 0 ? (
            <MediaGallery 
              attachments={getSessionAttachments(session.attachments)} 
              sessionId={session.id}
            />
          ) : (
            <Card className="card-elevated">
              <CardContent className="py-8 text-center">
                <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No photos or videos yet</p>
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={() => setShowUploadMedia(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Media
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Climbs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Climbs</h2>
            <Dialog open={showAddClimb} onOpenChange={setShowAddClimb}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Climb
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Climb</DialogTitle>
                </DialogHeader>
                <AddClimbForm 
                  sessionId={session.id} 
                  onSuccess={() => {
                    setShowAddClimb(false);
                    queryClient.invalidateQueries({ queryKey: ['session', id] });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {!session.climbs || session.climbs.length === 0 ? (
            <Card className="card-elevated">
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No climbs logged yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first climb to this session
                </p>
                <Button onClick={() => setShowAddClimb(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Climb
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {session.climbs.map((climb: any) => {
                // Map color band to actual colors
                const colorMap: Record<string, string> = {
                  white: 'bg-white',
                  blue: 'bg-blue-500',
                  green: 'bg-green-500',
                  yellow: 'bg-yellow-400',
                  red: 'bg-red-500',
                  black: 'bg-gray-900',
                  orange: 'bg-orange-500',
                  purple: 'bg-purple-600',
                  pink: 'bg-pink-500',
                };
                
                const tagLabels: Record<string, { label: string; icon: string }> = {
                  romos: { label: 'Romos', icon: '🫳' },
                  regletas: { label: 'Regletas', icon: '✋' },
                  desplome: { label: 'Desplome', icon: '↗️' },
                  equilibrio: { label: 'Equilibrio', icon: '⚖️' },
                  dinamico: { label: 'Dinámico', icon: '💨' },
                };
                
                return (
                  <Card 
                    key={climb.id} 
                    className="card-elevated cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => setEditingClimb(climb)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Color band indicator - always show for boulders */}
                          {climb.discipline === 'boulder' && (
                            <div 
                              className={`w-12 h-12 rounded-full flex-shrink-0 shadow-md border-2 border-border/50 ${
                                climb.color_band ? colorMap[climb.color_band] : 'bg-muted'
                              }`}
                              title={climb.color_band || 'Sin color'}
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {climb.color_band && (
                                <Badge variant="outline" className="capitalize text-xs">
                                  {climb.color_band}
                                </Badge>
                              )}
                              {climb.grade_value && (
                                <Badge className={getGradeColor(climb.grade_value)}>
                                  {climb.grade_value}
                                </Badge>
                              )}
                              <Badge variant="outline" className="capitalize">
                                {climb.discipline}
                              </Badge>
                              {climb.flash && (
                                <Badge className="bg-accent text-accent-foreground">⚡ Flash</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              {climb.attempts > 1 && <span>{climb.attempts} intentos</span>}
                              {!climb.sent && <span className="text-orange-500">• En proyecto</span>}
                            </div>
                            {/* Tags */}
                            {climb.tags && climb.tags.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {climb.tags.map((tag: string) => (
                                  <Badge 
                                    key={tag} 
                                    variant="secondary" 
                                    className="text-xs gap-1"
                                  >
                                    {tagLabels[tag]?.icon || ''} {tagLabels[tag]?.label || tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Photos button */}
                          {(() => {
                            const climbPhotos = getClimbAttachments(session.attachments, climb.id);
                            return climbPhotos.length > 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingClimb(climb);
                                }}
                              >
                                <Camera className="h-4 w-4" />
                                {climbPhotos.length}
                              </Button>
                            ) : null;
                          })()}
                          {climb.sent ? (
                            <CheckCircle2 className="h-6 w-6 text-success" />
                          ) : (
                            <XCircle className="h-6 w-6 text-muted-foreground" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingClimb(climb);
                            }}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('¿Eliminar esta escalada?')) {
                                deleteClimb.mutate(climb.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Climb notes */}
                      {climb.notes && climb.notes !== '[Boulder]' && climb.notes !== '[Autobelay]' && climb.notes !== '[Cuerda]' && (
                        <p className="mt-2 text-sm text-muted-foreground pl-14">{climb.notes}</p>
                      )}
                      
                      {/* Climb photos */}
                      {getClimbAttachments(session.attachments, climb.id).length > 0 && (
                        <div className="mt-3 pl-14">
                          <div className="flex gap-2 flex-wrap">
                            {getClimbAttachments(session.attachments, climb.id).map((attachment: any) => (
                              <div key={attachment.id} className="w-16 h-16 rounded-lg overflow-hidden">
                                {attachment.type === 'photo' ? (
                                  <img 
                                    src={attachment.file_url} 
                                    alt="Climb photo"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <video 
                                    src={attachment.file_url}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Edit Climb Dialog */}
          {editingClimb && (
            <EditClimbDialog
              climb={editingClimb}
              sessionId={session.id}
              open={!!editingClimb}
              onOpenChange={(open) => !open && setEditingClimb(null)}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
