import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
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
      const url = new URL(attachment.file_url);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(p => p === 'climbing-media');
      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      await supabase.storage.from('climbing-media').remove([filePath]);
      
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Biblioteca Multimedia</h1>
            <p className="text-muted-foreground">
              Todas tus fotos y videos de escalada
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="card-elevated">
            <CardContent className="pt-6 text-center">
              <Image className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold">{photos.length}</div>
              <div className="text-xs text-muted-foreground">Fotos</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6 text-center">
              <Video className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold">{videos.length}</div>
              <div className="text-xs text-muted-foreground">Videos</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold">{attachments?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todo</TabsTrigger>
            <TabsTrigger value="photo">Fotos</TabsTrigger>
            <TabsTrigger value="video">Videos</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Gallery Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredAttachments.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="py-12 text-center">
              <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin contenido multimedia</h3>
              <p className="text-muted-foreground">
                Sube fotos y videos en tus sesiones de escalada
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filteredAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                onClick={() => setSelectedMedia(attachment)}
              >
                {attachment.type === 'photo' ? (
                  <img
                    src={attachment.file_url}
                    alt="Climbing photo"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted relative">
                    <video
                      src={attachment.file_url}
                      className="w-full h-full object-cover"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-8 w-8 text-white" />
                    </div>
                  </div>
                )}
                
                {/* Color band indicator for climb attachments */}
                {attachment.climbs?.color_band && (
                  <div 
                    className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 border-white shadow-md ${colorMap[attachment.climbs.color_band]}`}
                  />
                )}
                
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Expand className="h-6 w-6 text-white" />
                </div>
                
                {/* Date badge */}
                {attachment.sessions?.date && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <Badge variant="secondary" className="text-xs bg-black/60 text-white border-none">
                      {format(new Date(attachment.sessions.date), 'dd MMM')}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
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