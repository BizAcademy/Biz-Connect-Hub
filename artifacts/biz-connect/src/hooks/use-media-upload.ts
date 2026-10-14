import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createMedia, uploadDatabaseImage, uploadDatabaseVideo } from '@workspace/api-client-react';
import type { MediaItem } from '@workspace/api-client-react';
import { useToast } from './use-toast';

const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

async function responseJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Échec de l'envoi.");
  return data as T;
}

/** Images are stored in PostgreSQL; existing video-file uploads use Supabase. */
export function useMediaUpload(pwd: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const qc = useQueryClient();
  const { toast } = useToast();

  const uploadFile = async (file: File, options?: { databaseVideo?: boolean }): Promise<MediaItem | null> => {
    setIsUploading(true);
    const isVideo = file.type.startsWith('video/');
    setUploadStatus(isVideo ? 'Envoi de la vidéo originale…' : "Enregistrement de l'image en base…");
    try {
      if (!file.size) throw new Error('Le fichier est vide.');
      const headers = { 'x-admin-password': pwd };
      let media: MediaItem;
      if (!isVideo) {
        if (file.size > MAX_IMAGE_BYTES) throw new Error("L'image dépasse la limite de 10 Mo.");
        media = await uploadDatabaseImage(file, {
          headers: { ...headers, 'x-file-name': encodeURIComponent(file.name) },
        });
      } else if (options?.databaseVideo) {
        if (file.size > 200 * 1024 * 1024) throw new Error('La vidéo dépasse la limite de 200 Mo. Vous pouvez aussi utiliser YouTube.');
        media = await uploadDatabaseVideo(file, { headers: { ...headers, 'x-file-name': encodeURIComponent(file.name) } });
      } else {
        if (file.size > 500 * 1024 * 1024) throw new Error('La vidéo dépasse la limite de 500 Mo.');
        const target = await responseJson<{ uploadUrl: string; publicUrl: string; publicId: string }>(
          await fetch(`${API_BASE}/media/uploads/supabase-signed-url`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name }),
          }),
        );
        await responseJson(await fetch(target.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        }));
        media = await createMedia({
          name: file.name, url: target.publicUrl, publicId: target.publicId, resourceType: 'video',
        }, { headers });
      }
      await qc.invalidateQueries({ queryKey: ['/api/media'] });
      return media;
    } catch (error) {
      const apiData = (error as { data?: { error?: string } })?.data;
      toast({
        title: "Échec de l'envoi",
        description: apiData?.error ?? (error instanceof Error ? error.message : 'Veuillez réessayer.'),
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };
  return { uploadFile, isUploading, uploadStatus };
}
