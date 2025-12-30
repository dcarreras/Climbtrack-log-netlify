import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Camera, X, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickPhotoCaptureProps {
  // We'll store photos temporarily until session is created
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
}

export default function QuickPhotoCapture({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 10 
}: QuickPhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = maxPhotos - photos.length;
    const filesToAdd = files.slice(0, remainingSlots);

    // Validate and add files
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    filesToAdd.forEach((file) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Solo se permiten imágenes (JPEG, PNG, WebP)');
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        toast.error('Imagen muy grande. Máximo 20MB.');
        return;
      }

      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === validFiles.length) {
          setPreviews([...previews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (validFiles.length > 0) {
      onPhotosChange([...photos, ...validFiles]);
      toast.success(`${validFiles.length} foto(s) añadida(s)`);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
    setPreviews(newPreviews);
  };

  return (
    <div className="space-y-3">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        className="hidden"
      />

      {/* Photo thumbnails */}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative w-16 h-16">
              <img 
                src={preview} 
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Camera button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={photos.length >= maxPhotos}
        className="gap-2"
      >
        <Camera className="h-4 w-4" />
        {photos.length > 0 
          ? `Añadir foto (${photos.length}/${maxPhotos})`
          : 'Tomar foto'
        }
      </Button>
    </div>
  );
}

// Helper to upload photos after session is created
export async function uploadSessionPhotos(
  photos: File[],
  sessionId: string,
  userId: string
): Promise<void> {
  for (const file of photos) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${sessionId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('climbing-media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from('climbing-media')
      .getPublicUrl(uploadData.path);

    await supabase.from('attachments').insert({
      user_id: userId,
      session_id: sessionId,
      file_url: urlData.publicUrl,
      type: 'photo',
    });
  }
}
