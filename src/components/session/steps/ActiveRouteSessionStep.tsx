import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  Check,
  Clock,
  Pause,
  Play,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { clearActiveRouteStorage } from '@/lib/routeSessionStorage';
import {
  clearQueuedRoutePhotosForSession,
  flushRoutePhotoQueue,
  getQueuedRoutePhotoStoragePath,
  listQueuedRoutePhotos,
  queueRoutePhotoUpload,
} from '@/lib/routePhotoQueue';
import { formatElapsedMs, getElapsedSessionMs } from '@/lib/sessionLifecycle';
import { removeAttachmentFiles } from '@/lib/storage';
import type { Tables } from '@/integrations/supabase/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

type ActiveSessionRow = Pick<
  Tables<'sessions'>,
  | 'created_at'
  | 'date'
  | 'gym_id'
  | 'id'
  | 'paused_at'
  | 'paused_ms'
  | 'planned_session_id'
  | 'started_at'
  | 'status'
>;

type ActiveClimbRow = Pick<
  Tables<'climbs'>,
  'attempts' | 'flash' | 'grade_value' | 'id' | 'order_index' | 'sent'
>;

type ActiveAttachmentRow = Pick<
  Tables<'attachments'>,
  'climb_id' | 'file_url' | 'id' | 'type'
>;

interface ActiveRouteSessionData {
  attachments: ActiveAttachmentRow[];
  climbs: ActiveClimbRow[];
  session: ActiveSessionRow & {
    gyms: Pick<Tables<'gyms'>, 'city' | 'name'> | null;
  };
}

interface ActiveRouteSessionStepProps {
  onDiscarded: () => void;
  onFinishRequested: () => void;
  sessionId: string;
}

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function pauseActiveRouteSession(session: ActiveSessionRow) {
  const { error } = await supabase
    .from('sessions')
    .update({
      paused_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  if (error) throw error;
}

async function toggleActiveRouteSessionTimer(session: ActiveSessionRow) {
  if (session.paused_at) {
    const resumedPauseMs =
      (session.paused_ms || 0) + (Date.now() - new Date(session.paused_at).getTime());

    const { error } = await supabase
      .from('sessions')
      .update({
        paused_at: null,
        paused_ms: resumedPauseMs,
      })
      .eq('id', session.id);

    if (error) throw error;
    return;
  }

  await pauseActiveRouteSession(session);
}

export default function ActiveRouteSessionStep({
  onDiscarded,
  onFinishRequested,
  sessionId,
}: ActiveRouteSessionStepProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoTargetClimbIdRef = useRef<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [queuedPhotos, setQueuedPhotos] = useState(0);
  const [uploadingClimbId, setUploadingClimbId] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturingPhoto, setCapturingPhoto] = useState(false);

  const refreshQueuedPhotoCount = useCallback(async () => {
    const queue = await listQueuedRoutePhotos(sessionId);
    setQueuedPhotos(queue.length);
  }, [sessionId]);

  const activeSessionQuery = useQuery({
    queryKey: ['active-route-session', sessionId],
    queryFn: async () => {
      const [sessionResult, climbsResult, attachmentsResult] = await Promise.all([
        supabase
          .from('sessions')
          .select('id, date, gym_id, status, started_at, paused_at, paused_ms, planned_session_id, created_at, gyms(name, city)')
          .eq('id', sessionId)
          .maybeSingle(),
        supabase
          .from('climbs')
          .select('id, grade_value, sent, flash, attempts, order_index')
          .eq('session_id', sessionId)
          .order('order_index', { ascending: true }),
        supabase
          .from('attachments')
          .select('id, climb_id, file_url, type')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true }),
      ]);

      if (sessionResult.error) throw sessionResult.error;
      if (climbsResult.error) throw climbsResult.error;
      if (attachmentsResult.error) throw attachmentsResult.error;
      if (!sessionResult.data) return null;

      return {
        attachments: attachmentsResult.data as ActiveAttachmentRow[],
        climbs: climbsResult.data as ActiveClimbRow[],
        session: sessionResult.data as ActiveRouteSessionData['session'],
      } satisfies ActiveRouteSessionData;
    },
    enabled: !!sessionId,
  });

  const flushQueue = useCallback(
    async (showToasts = false) => {
      const result = await flushRoutePhotoQueue(sessionId);
      await refreshQueuedPhotoCount();

      if (result.uploaded > 0) {
        queryClient.invalidateQueries({ queryKey: ['active-route-session', sessionId] });
      }

      if (showToasts && result.failed > 0) {
        toast('Foto guardada para sincronizar', {
          description: 'Queda en cola y la app la reintentará automáticamente.',
        });
      }

      return result;
    },
    [queryClient, refreshQueuedPhotoCount, sessionId],
  );

  useEffect(() => {
    refreshQueuedPhotoCount();
    flushQueue(false);

    const handleOnline = () => {
      flushQueue(true);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [flushQueue, refreshQueuedPhotoCount]);

  const session = activeSessionQuery.data?.session || null;

  useEffect(() => {
    if (!session || session.paused_at) return undefined;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [session]);

  const elapsedMs = useMemo(() => {
    if (!session) return 0;
    return getElapsedSessionMs(session, now);
  }, [now, session]);

  const stopCameraStream = useCallback(() => {
    setCameraStream((currentStream) => {
      currentStream?.getTracks().forEach((track) => track.stop());
      return null;
    });
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return undefined;

    video.srcObject = cameraStream;

    if (!cameraStream) return undefined;

    const handleLoadedMetadata = () => {
      setCameraReady(true);
      void video.play().catch(() => {
        setCameraError('No se pudo iniciar la vista previa de la cámara.');
      });
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.srcObject = null;
    };
  }, [cameraStream]);

  const completedCount = activeSessionQuery.data?.climbs.filter((climb) => climb.sent).length || 0;
  const totalCount = activeSessionQuery.data?.climbs.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const completeClimb = useMutation({
    mutationFn: async (climbId: string) => {
      const { error } = await supabase
        .from('climbs')
        .update({
          attempts: 1,
          flash: false,
          sent: true,
        })
        .eq('id', climbId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-route-session', sessionId] });
    },
    onError: (error) => {
      toast.error('No se pudo marcar la vía: ' + error.message);
    },
  });

  const toggleTimer = useMutation({
    mutationFn: async () => {
      if (!session) return;
      await toggleActiveRouteSessionTimer(session);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-route-session', sessionId] });
    },
    onError: (error) => {
      toast.error('No se pudo actualizar el contador: ' + error.message);
    },
  });

  const discardSession = useMutation({
    mutationFn: async () => {
      const attachments = activeSessionQuery.data?.attachments || [];
      const queuedEntries = await listQueuedRoutePhotos(sessionId);

      if (attachments.length > 0) {
        await removeAttachmentFiles(
          attachments.map((attachment) => ({ file_url: attachment.file_url })),
        );
      }

      if (queuedEntries.length > 0) {
        const queuedPaths = queuedEntries.map(getQueuedRoutePhotoStoragePath);
        await supabase.storage.from('climbing-media').remove(queuedPaths);
      }

      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;

      await clearQueuedRoutePhotosForSession(sessionId);
    },
    onSuccess: () => {
      clearActiveRouteStorage();
      queryClient.invalidateQueries({ queryKey: ['active-route-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Sesión descartada');
      onDiscarded();
    },
    onError: (error) => {
      toast.error('No se pudo descartar la sesión: ' + error.message);
    },
  });

  const processPhotoFile = useCallback(
    async (file: File, climbId: string) => {
      if (!user) return;

      if (!VALID_IMAGE_TYPES.includes(file.type)) {
        toast.error('Solo se permiten imágenes JPEG, PNG o WebP.');
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        toast.error('La imagen supera el máximo de 20MB.');
        return;
      }

      try {
        setUploadingClimbId(climbId);
        await queueRoutePhotoUpload({
          climbId,
          file,
          fileName: file.name,
          fileType: file.type,
          sessionId,
          userId: user.id,
        });

        const result = await flushQueue(true);

        if (result.uploaded > 0 && result.failed === 0) {
          toast.success('Foto añadida a la vía');
        } else {
          toast('Foto en cola', {
            description: 'La imagen queda guardada y se subirá cuando la conexión lo permita.',
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        toast.error('No se pudo procesar la foto: ' + message);
      } finally {
        photoTargetClimbIdRef.current = null;
        setUploadingClimbId(null);
      }
    },
    [flushQueue, sessionId, user],
  );

  const savePhotoToDevice = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }, []);

  const closeCamera = useCallback(() => {
    stopCameraStream();
    setCameraOpen(false);
    setCameraError(null);
    setCapturingPhoto(false);
    photoTargetClimbIdRef.current = null;
  }, [stopCameraStream]);

  const openMobileCamera = useCallback(
    async (climbId: string) => {
      photoTargetClimbIdRef.current = climbId;
      setCameraError(null);
      setCameraOpen(true);
      setCameraReady(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Este navegador no permite abrir la cámara directamente.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: {
              ideal: 'environment',
            },
          },
        });

        setCameraStream((currentStream) => {
          currentStream?.getTracks().forEach((track) => track.stop());
          return stream;
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No se pudo acceder a la cámara del dispositivo.';
        setCameraError(message);
      }
    },
    [],
  );

  const handlePhotoRequest = (climbId: string) => {
    const shouldUseMobileCamera =
      isMobile || window.matchMedia('(max-width: 767px)').matches;

    if (shouldUseMobileCamera) {
      void openMobileCamera(climbId);
      return;
    }

    photoTargetClimbIdRef.current = climbId;
    fileInputRef.current?.click();
  };

  const handlePhotoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const climbId = photoTargetClimbIdRef.current;

    event.target.value = '';

    if (!file || !climbId) return;

    await processPhotoFile(file, climbId);
  };

  const captureMobilePhoto = async () => {
    const climbId = photoTargetClimbIdRef.current;
    const video = videoRef.current;

    if (!climbId || !video) {
      toast.error('La cámara no está lista todavía.');
      return;
    }

    try {
      if (!video.videoWidth || !video.videoHeight) {
        toast.error('La cámara todavía no tiene imagen disponible.');
        return;
      }

      setCapturingPhoto(true);

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('No se pudo preparar la foto capturada.');
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (capturedBlob) => {
            if (!capturedBlob) {
              reject(new Error('No se pudo capturar la imagen.'));
              return;
            }
            resolve(capturedBlob);
          },
          'image/jpeg',
          0.92,
        );
      });

      const fileName = `route-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
      const file = new File([blob], fileName, {
        lastModified: Date.now(),
        type: 'image/jpeg',
      });

      savePhotoToDevice(file);
      stopCameraStream();
      setCameraOpen(false);

      await processPhotoFile(file, climbId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('No se pudo capturar la foto: ' + message);
    } finally {
      setCapturingPhoto(false);
    }
  };

  const handleFinish = async () => {
    if (!session) return;

    if (completedCount === 0) {
      toast.error('Marca al menos una vía completada o descarta la sesión.');
      return;
    }

    try {
      if (!session.paused_at) {
        await pauseActiveRouteSession(session);
      }

      queryClient.invalidateQueries({ queryKey: ['active-route-session', sessionId] });
      onFinishRequested();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('No se pudo cerrar el tracking: ' + message);
    }
  };

  if (activeSessionQuery.isLoading) {
    return (
      <Card className="card-elevated">
        <CardContent className="py-10 text-center text-muted-foreground">
          Cargando sesión activa...
        </CardContent>
      </Card>
    );
  }

  if (!activeSessionQuery.data || !session) {
    return (
      <Card className="card-elevated">
        <CardContent className="py-10 text-center text-muted-foreground">
          No hay una sesión activa para reanudar.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelected}
      />

      <Dialog
        open={cameraOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCamera();
          }
        }}
      >
        <DialogContent className="max-w-md overflow-hidden p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Capturar foto</DialogTitle>
            <DialogDescription>
              En móvil se abre la cámara directamente para guardar la foto de la vía.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 px-4 pb-4">
            <div className="overflow-hidden rounded-xl border bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="aspect-[3/4] w-full object-cover"
              />
            </div>

            {cameraError && <p className="text-sm text-destructive">{cameraError}</p>}

            {!cameraError && !cameraReady && (
              <p className="text-sm text-muted-foreground">Preparando cámara...</p>
            )}

            <DialogFooter className="gap-2 sm:justify-between sm:space-x-0">
              <Button type="button" variant="outline" onClick={closeCamera}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void captureMobilePhoto()}
                disabled={!!cameraError || !cameraReady || capturingPhoto}
              >
                <Camera className="mr-2 h-4 w-4" />
                {capturingPhoto ? 'Guardando...' : 'Hacer foto'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="card-elevated border-primary/25">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Sesión activa de vías</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Marca cada vía completada y añade foto si quieres.
              </p>
            </div>
            <Badge variant={session.paused_at ? 'secondary' : 'default'}>
              {session.paused_at ? 'Pausada' : 'En curso'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm">{formatElapsedMs(elapsedMs)}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleTimer.mutate()}
              disabled={toggleTimer.isPending}
            >
              {session.paused_at ? (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Reanudar
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pausar
                </>
              )}
            </Button>
            {session.gyms?.name && (
              <Badge variant="secondary">
                {session.gyms.name}
                {session.gyms.city ? ` · ${session.gyms.city}` : ''}
              </Badge>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progreso</span>
              <span className="font-medium">
                {completedCount}/{totalCount} vías
              </span>
            </div>
            <Progress value={progress} />
          </div>

          {queuedPhotos > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <UploadCloud className="h-4 w-4 text-primary" />
              <span>
                {queuedPhotos} foto(s) pendientes de sincronizar. La app seguirá reintentando.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {activeSessionQuery.data.climbs.map((climb, index) => {
          const climbAttachments = activeSessionQuery.data.attachments.filter(
            (attachment) => attachment.climb_id === climb.id,
          );

          return (
            <Card
              key={climb.id}
              className={climb.sent ? 'card-elevated border-green-500/30' : 'card-elevated'}
            >
              <CardContent className="space-y-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Vía {index + 1}</Badge>
                      <span className="text-lg font-semibold">{climb.grade_value || '-'}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {climb.sent ? 'Completada' : 'Pendiente'}
                    </p>
                  </div>

                  {climb.sent ? (
                    <Badge className="bg-green-600 text-white">
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Hecha
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => completeClimb.mutate(climb.id)}
                      disabled={completeClimb.isPending}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Completar
                    </Button>
                  )}
                </div>

                {climbAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {climbAttachments.map((attachment) => (
                      <div key={attachment.id} className="h-16 w-16 overflow-hidden rounded-lg border">
                        <img
                          src={attachment.file_url}
                          alt="Foto de vía"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    {climbAttachments.length > 0
                      ? `${climbAttachments.length} foto(s) adjuntas`
                      : 'Sin fotos'}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePhotoRequest(climb.id)}
                    disabled={!climb.sent || uploadingClimbId === climb.id}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {uploadingClimbId === climb.id ? 'Procesando...' : 'Añadir foto'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={handleFinish}>
          Guardar y terminar entrenamiento
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-destructive"
          onClick={() => {
            if (window.confirm('Se eliminará la sesión activa y sus fotos. ¿Continuar?')) {
              discardSession.mutate();
            }
          }}
          disabled={discardSession.isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Descartar sesión
        </Button>
      </div>
    </div>
  );
}
