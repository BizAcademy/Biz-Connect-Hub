import { useState } from 'react';
import { getMediaUploadSignature, createMedia } from '@workspace/api-client-react';
import type { MediaItem } from '@workspace/api-client-react';

function adminReq(pwd: string) {
  return { headers: { 'x-admin-password': pwd } };
}

/**
 * Upload d'un fichier image/vidéo vers Cloudinary (upload signé côté serveur),
 * puis enregistrement de l'URL retournée dans la table `media`.
 */
export function useCloudinaryUpload(pwd: string) {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (
    file: File,
    opts?: { removeBackground?: boolean },
  ): Promise<MediaItem | null> => {
    setIsUploading(true);
    try {
      // 1. Obtenir la signature auprès de notre serveur
      const sig = await getMediaUploadSignature(
        { removeBackground: opts?.removeBackground ?? false },
        adminReq(pwd),
      );

      // 2. Envoyer le fichier directement à Cloudinary
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', sig.apiKey);
      form.append('timestamp', String(sig.timestamp));
      form.append('signature', sig.signature);
      form.append('folder', sig.folder);
      if (sig.backgroundRemoval) form.append('background_removal', sig.backgroundRemoval);

      // background_removal n'est pris en compte que sur l'endpoint image/upload
      const endpoint = sig.backgroundRemoval ? 'image' : 'auto';
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/${endpoint}/upload`,
        { method: 'POST', body: form },
      );
      if (!res.ok) {
        console.error('Cloudinary upload failed', await res.text());
        return null;
      }
      const uploaded = (await res.json()) as {
        secure_url: string;
        public_id: string;
        resource_type: string;
      };

      // 3. Enregistrer le média dans la base de données.
      // Si la suppression de fond est demandée, le serveur attend la fin du
      // traitement ; en cas de délai dépassé on retente l'enregistrement
      // (sans ré-uploader le fichier).
      const body = {
        name: file.name,
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        resourceType: uploaded.resource_type === 'video' ? ('video' as const) : ('image' as const),
        removeBackground: Boolean(sig.backgroundRemoval),
      };
      try {
        return await createMedia(body, adminReq(pwd));
      } catch (err) {
        if (!sig.backgroundRemoval) throw err;
        // Nouvel essai unique : le traitement a pu simplement être lent.
        return await createMedia(body, adminReq(pwd));
      }
    } catch (err) {
      console.error('Upload error', err);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading };
}
