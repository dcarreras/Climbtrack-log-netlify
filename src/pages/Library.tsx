import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { removeAttachmentFiles } from '@/lib/storage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Image, 
  Video, 
  X, 
  Play, 
  Calendar,
  ChevronLeft,
  Trash2,
  Expand
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AttachmentWithClimb {
  id: string;
  file_url: string;
  type: 'photo' | 'video';
  created_at: string;
  session_id: string | null;
  climb_id: string | null;
  sessions?: {
    id: string;
    date: string;
    session_type: string;
  } | null;
  climbs?: {
    id: string;
    color_band: string | null;
    grade_value: string | null;
    discipline: string;
    sent: boolean;
    tags: string[] | null;
  } | null;
}

export default function Library() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMedia, setSelectedMedia] = useState<AttachmentWithClimb | null>(null);
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all');

  const { data: attachments, isLoading } = useQuery({
    queryKey: ['library', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attachments')
        .select(`
          *,
          sessions(id, date, session_type),
          climbs(id, color_band, grade_value, discipline, sent, tags)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AttachmentWithClimb[];
    },
    enabled: !!user,
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachment: AttachmentWithClimb) => {
      await removeAttachmentFiles([attachment]);
      
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Media eliminado');
      queryClient.invalidateQueries({ queryKey: ['library'] });
      setSelectedMedia(null);
    },
    onError: (error) => {
      toast.error('Error al eliminar: ' + error.message);
    },
  });

  const filteredAttachments = attachments?.filter(a => 
    filter === 'all' || a.type === filter
  ) || [];

  const photos = attachments?.filter(a => a.type === 'photo') || [];
  const videos = attachments?.filter(a => a.type === 'video') || [];

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

  const T = {
    bg: '#050505', ink: '#FAFAF9', inkFaint: 'rgba(250,250,249,0.38)',
    inkDim: 'rgba(250,250,249,0.16)', rule: 'rgba(250,250,249,0.09)',
    sans: "'Urbanist', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', monospace",
  };

  const filterOpts: { k: 'all' | 'photo' | 'video'; l: string }[] = [
    { k: 'all', l: 'Todo' },
    { k: 'photo', l: 'Fotos' },
    { k: 'video', l: 'Videos' },
  ];

  return (
    <AppLayout>
      <div style={{ background: T.bg, minHeight: '100vh', paddingBottom: 100 }}>
        {/* Header */}
        <div style={{ padding: '28px 20px 24px' }}>
          <div style={{ fontFamily: T.sans, fontSize: 10, color: T.inkFaint,
            textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: 10 }}>
            Archivo visual
          </div>
          <div style={{ fontFamily: T.sans, fontSize: 42, color: T.ink, lineHeight: 0.95,
            fontWeight: 700, letterSpacing: '-0.025em', textTransform: 'uppercase' }}>
            Galería
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          borderTop: `1px solid ${T.rule}`, borderBottom: `1px solid ${T.rule}` }}>
          {[
            { value: photos.length, label: 'Fotos' },
            { value: videos.length, label: 'Videos' },
            { value: attachments?.length || 0, label: 'Total' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '16px 16px',
              borderRight: i < 2 ? `1px solid ${T.rule}` : 'none',
            }}>
              <div style={{ fontFamily: T.sans, fontSize: 26, color: T.ink,
                fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontFamily: T.sans, fontSize: 9, color: T.inkFaint,
                textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: 6, fontWeight: 500 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {filterOpts.map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)} style={{
                padding: '8px 16px',
                border: `1px solid ${filter === f.k ? T.ink : 'rgba(250,250,249,0.18)'}`,
                background: filter === f.k ? T.ink : 'transparent',
                color: filter === f.k ? T.bg : 'rgba(250,250,249,0.62)',
                fontFamily: T.sans, fontSize: 10, letterSpacing: '0.16em',
                textTransform: 'uppercase', cursor: 'pointer', fontWeight: filter === f.k ? 600 : 500,
              }}>{f.l}</button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div style={{ padding: '20px 20px 0' }}>
          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ aspectRatio: '1', background: 'rgba(250,250,249,0.04)' }} />
              ))}
            </div>
          ) : filteredAttachments.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center',
              border: `1px solid ${T.rule}` }}>
              <div style={{ fontFamily: T.sans, fontSize: 15, color: T.ink,
                fontWeight: 600, marginBottom: 8 }}>Sin contenido multimedia</div>
              <div style={{ fontFamily: T.sans, fontSize: 13, color: T.inkFaint }}>
                Sube fotos y videos en tus sesiones de escalada
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr md:1fr 1fr 1fr 1fr', gap: 6 }}>
              {filteredAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden',
                    cursor: 'pointer', border: `1px solid ${T.rule}` }}
                  onClick={() => setSelectedMedia(attachment)}
                >
                  {attachment.type === 'photo' ? (
                    <img src={attachment.file_url} alt="Climbing photo"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', position: 'relative',
                      background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <video src={attachment.file_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                        <Play style={{ width: 28, height: 28, color: '#FAFAF9' }} />
                      </div>
                    </div>
                  )}
                  {attachment.climbs?.color_band && (
                    <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 border-white ${colorMap[attachment.climbs.color_band]}`} />
                  )}
                  {attachment.sessions?.date && (
                    <div style={{ position: 'absolute', bottom: 6, left: 6, right: 6 }}>
                      <span style={{ padding: '3px 7px', background: 'rgba(5,5,5,0.75)',
                        fontFamily: T.mono, fontSize: 9, color: T.ink, letterSpacing: '0.1em' }}>
                        {format(new Date(attachment.sessions.date), 'dd MMM')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Vista ampliada del archivo</DialogTitle>
            <DialogDescription>
              Previsualización del archivo multimedia guardado en tu biblioteca.
            </DialogDescription>
          </DialogHeader>
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              variant="destructive"
              size="icon"
              onClick={() => {
                if (selectedMedia && confirm('¿Eliminar este media?')) {
                  deleteAttachment.mutate(selectedMedia);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setSelectedMedia(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
            {selectedMedia?.type === 'photo' ? (
              <img
                src={selectedMedia.file_url}
                alt="Climbing photo"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            ) : selectedMedia?.type === 'video' ? (
              <video
                src={selectedMedia.file_url}
                controls
                autoPlay
                className="max-w-full max-h-[70vh] rounded-lg"
              />
            ) : null}
            
            {/* Media info */}
            {selectedMedia && (
              <div className="mt-4 flex flex-wrap items-center gap-2 justify-center">
                {selectedMedia.sessions?.date && (
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(selectedMedia.sessions.date), 'dd MMM yyyy')}
                  </Badge>
                )}
                {selectedMedia.climbs?.color_band && (
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${colorMap[selectedMedia.climbs.color_band]}`} />
                    <span className="text-white text-sm capitalize">{selectedMedia.climbs.color_band}</span>
                  </div>
                )}
                {selectedMedia.climbs?.grade_value && (
                  <Badge>{selectedMedia.climbs.grade_value}</Badge>
                )}
                {selectedMedia.climbs?.sent && (
                  <Badge className="bg-success">✓ Enviado</Badge>
                )}
                {selectedMedia.sessions?.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMedia(null);
                      navigate(`/sessions/${selectedMedia.sessions?.id}`);
                    }}
                  >
                    Ver sesión
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
