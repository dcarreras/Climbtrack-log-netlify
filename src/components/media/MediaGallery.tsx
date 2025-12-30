import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Image, Video, Trash2, Play, X, Expand } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Attachment {
  id: string;
  file_url: string;
  type: 'photo' | 'video';
  created_at: string;
}

interface MediaGalleryProps {
  attachments: Attachment[];
  sessionId: string;
}

export default function MediaGallery({ attachments, sessionId }: MediaGalleryProps) {
  const queryClient = useQueryClient();
  const [selectedMedia, setSelectedMedia] = useState<Attachment | null>(null);

  const deleteAttachment = useMutation({
    mutationFn: async (attachment: Attachment) => {
      // Extract file path from URL
      const url = new URL(attachment.file_url);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(p => p === 'climbing-media');
      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('climbing-media')
        .remove([filePath]);

      if (storageError) {
        console.warn('Storage deletion failed:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success('Media deleted');
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      setSelectedMedia(null);
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {attachments.map((attachment) => (
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
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Expand className="h-6 w-6 text-white" />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <DialogHeader className="absolute top-4 right-4 z-10">
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="icon"
                onClick={() => {
                  if (selectedMedia && confirm('Delete this media?')) {
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
          </DialogHeader>
          
          <div className="flex items-center justify-center min-h-[60vh] p-4">
            {selectedMedia?.type === 'photo' ? (
              <img
                src={selectedMedia.file_url}
                alt="Climbing photo"
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            ) : selectedMedia?.type === 'video' ? (
              <video
                src={selectedMedia.file_url}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] rounded-lg"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
