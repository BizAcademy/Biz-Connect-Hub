import { useCallback, useState } from 'react';

/**
 * Upload a file to object storage via the admin-protected presigned URL flow.
 * Returns the objectPath (e.g. /objects/uploads/<id>) which is served by
 * GET /api/storage/objects/*.
 */
export function useAdminUpload(pwd: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      setIsUploading(true);
      setError(null);
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/storage/uploads/request-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': pwd,
          },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type || 'application/octet-stream',
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Impossible d'obtenir l'URL d'upload");
        }
        const { uploadURL, objectPath } = await res.json();

        const put = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        });
        if (!put.ok) throw new Error("Échec de l'envoi du fichier");

        // Path served by the API
        return `${import.meta.env.BASE_URL}api/storage${objectPath}`.replace(/\/\/+/g, '/');
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Upload failed');
        setError(e);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [pwd],
  );

  return { uploadFile, isUploading, error };
}
