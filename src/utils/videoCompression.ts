// Video compression utility using native browser APIs

interface CompressionProgress {
  stage: 'loading' | 'compressing' | 'finalizing';
  progress: number;
}

interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

const TARGET_SIZE_MB = 40; // Target size in MB
const TARGET_BITRATE = 1000000; // 1 Mbps for compressed video

export async function compressVideo(
  file: File,
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  const originalSize = file.size;
  
  // If file is already small enough, return as-is
  if (originalSize <= TARGET_SIZE_MB * 1024 * 1024) {
    return {
      blob: file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1
    };
  }

  onProgress?.({ stage: 'loading', progress: 0 });

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    video.onloadedmetadata = async () => {
      // Calculate target dimensions (reduce if video is very large)
      let targetWidth = video.videoWidth;
      let targetHeight = video.videoHeight;
      
      // Scale down if resolution is too high
      const maxDimension = 1280;
      if (targetWidth > maxDimension || targetHeight > maxDimension) {
        const scale = maxDimension / Math.max(targetWidth, targetHeight);
        targetWidth = Math.round(targetWidth * scale);
        targetHeight = Math.round(targetHeight * scale);
      }
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      onProgress?.({ stage: 'loading', progress: 50 });

      // Create MediaRecorder with compression settings
      const stream = canvas.captureStream(30); // 30 fps
      
      // Try to get audio from original video
      try {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(video);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioContext.destination);
        
        destination.stream.getAudioTracks().forEach(track => {
          stream.addTrack(track);
        });
      } catch (e) {
        console.log('No audio track or audio extraction failed');
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: TARGET_BITRATE
      });

      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        onProgress?.({ stage: 'finalizing', progress: 90 });
        
        const blob = new Blob(chunks, { type: mimeType });
        const compressedSize = blob.size;
        
        onProgress?.({ stage: 'finalizing', progress: 100 });
        
        // Clean up
        URL.revokeObjectURL(video.src);
        
        resolve({
          blob,
          originalSize,
          compressedSize,
          compressionRatio: originalSize / compressedSize
        });
      };

      recorder.onerror = (e) => {
        reject(new Error('Recording failed'));
      };

      // Start recording
      recorder.start(100);
      onProgress?.({ stage: 'compressing', progress: 0 });

      video.currentTime = 0;
      
      const duration = video.duration;
      
      const drawFrame = () => {
        if (video.ended || video.paused) {
          recorder.stop();
          return;
        }
        
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        
        const progress = (video.currentTime / duration) * 100;
        onProgress?.({ stage: 'compressing', progress: Math.min(progress, 85) });
        
        requestAnimationFrame(drawFrame);
      };

      video.onended = () => {
        setTimeout(() => recorder.stop(), 100);
      };

      video.play().then(drawFrame).catch(reject);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
    video.load();
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
