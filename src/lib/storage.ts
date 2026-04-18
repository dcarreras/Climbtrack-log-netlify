import { supabase } from '@/integrations/supabase/client';

const PUBLIC_STORAGE_MARKER = '/storage/v1/object/public/';

function getPublicObjectPath(fileUrl: string, bucket: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(fileUrl);
  } catch {
    throw new Error(`Invalid storage URL: ${fileUrl}`);
  }

  const marker = `${PUBLIC_STORAGE_MARKER}${bucket}/`;
  const markerIndex = parsedUrl.pathname.indexOf(marker);

  if (markerIndex === -1) {
    throw new Error(`Storage URL does not belong to bucket "${bucket}"`);
  }

  const objectPath = decodeURIComponent(
    parsedUrl.pathname.slice(markerIndex + marker.length),
  );

  if (!objectPath) {
    throw new Error(`Storage URL has no object path: ${fileUrl}`);
  }

  return objectPath;
}

export async function removeAttachmentFiles(
  attachments: Array<{ file_url: string }>,
  bucket = 'climbing-media',
): Promise<void> {
  if (attachments.length === 0) return;

  const paths = Array.from(
    new Set(attachments.map((attachment) => getPublicObjectPath(attachment.file_url, bucket))),
  );

  const { error } = await supabase.storage.from(bucket).remove(paths);

  if (error) throw error;
}
