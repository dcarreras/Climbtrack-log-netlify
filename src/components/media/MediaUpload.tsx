import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, Video, X, Loader2 } from 'lucide-react';
import { compressVideo, formatBytes } from '@/utils/videoCompression';

interface MediaUploadProps {
  sessionId: string;
  climbId?: string;
  onSuccess?: () => void;
}

export default function MediaUpload({ sessionId, climbId, onSuccess }: MediaUploadProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressionProgress, setCompressionProgress] = useState<{
    stage: string;
    progress: number;
  } | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
  } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de archivo inválido. Sube una imagen o video.');
      return;
    }

    // Increased limit to 500MB for videos (will be compressed)
    const maxSize = file.type.startsWith('video/') ? 524288000 : 52428800;
    if (file.size > maxSize) {
      toast.error(`Archivo muy grande. Máximo ${file.type.startsWith('video/') ? '500MB' : '50MB'}.`);
      return;
    }

    setSelectedFile(file);
    setCompressionInfo(null);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !user) throw new Error('No file selected');

      setUploading(true);
      let fileToUpload: Blob = selectedFile;
      let finalFileName = selectedFile.name;

      // Compress video if needed
      if (selectedFile.type.startsWith('video/') && selectedFile.size > 40 * 1024 * 1024) {
        toast.info('Comprimiendo video...', { duration: 2000 });
        
        try {
          const result = await compressVideo(selectedFile, (progress) => {
            setCompressionProgress({
              stage: progress.stage === 'loading' ? 'Cargando...' :
                     progress.stage === 'compressing' ? 'Comprimiendo...' :
                     'Finalizando...',
              progress: progress.progress
            });
          });
          
          fileToUpload = result.blob;
          setCompressionInfo({
            originalSize: result.originalSize,
            compressedSize: result.compressedSize
          });
          
          // Change extension to webm for compressed videos
          finalFileName = selectedFile.name.replace(/\.[^/.]+$/, '.webm');
          
          toast.success(
            `Video comprimido: ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)}`,
            { duration: 3000 }
          );
        } catch (error) {
          console.error('Compression failed:', error);
          toast.warning('No se pudo comprimir. Subiendo original...');
        } finally {
          setCompressionProgress(null);
        }
      }

      // Generate unique filename
      const fileExt = finalFileName.split('.').pop();
      const fileName = `${user.id}/${sessionId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('climbing-media')
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('climbing-media')
        .getPublicUrl(uploadData.path);

      // Save to attachments table
      const attachmentType = selectedFile.type.startsWith('video/') ? 'video' : 'photo';
      
      const { error: dbError } = await supabase.from('attachments').insert({
        user_id: user.id,
        session_id: sessionId,
        climb_id: climbId || null,
        file_url: urlData.publicUrl,
        type: attachmentType,
      });

      if (dbError) throw dbError;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      toast.success('¡Media subida correctamente!');
      setSelectedFile(null);
      setPreview(null);
      setCompressionInfo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Error al subir: ' + error.message);
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setCompressionInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        className="hidden"
      />

      {!selectedFile ? (
        <Button
          type="button"
          variant="outline"
          className="w-full h-24 border-dashed flex flex-col gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Toca para subir foto o video
          </span>
        </Button>
      ) : (
        <div className="relative">
          {preview ? (
            <div className="relative rounded-lg overflow-hidden">
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-48 object-cover"
              />
              <button
                type="button"
                onClick={clearSelection}
                className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative bg-muted rounded-lg p-6 flex items-center gap-4">
              <Video className="h-8 w-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatBytes(selectedFile.size)}
                  {selectedFile.size > 40 * 1024 * 1024 && (
                    <span className="text-primary ml-2">• Se comprimirá</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="p-1 hover:bg-background rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {compressionProgress && (
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{compressionProgress.stage}</span>
                <span className="text-muted-foreground">{Math.round(compressionProgress.progress)}%</span>
              </div>
              <Progress value={compressionProgress.progress} className="h-2" />
            </div>
          )}

          <Button
            type="button"
            className="w-full mt-3"
            onClick={() => uploadMutation.mutate()}
            disabled={uploading || !!compressionProgress}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {compressionProgress ? compressionProgress.stage : 'Subiendo...'}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Subir {selectedFile.type.startsWith('video/') ? 'Video' : 'Foto'}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
