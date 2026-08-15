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

  const uploadFile = async (file: File): Promise<MediaItem | null> => {
    setIsUploading(true);
    try {
      // 1. Obtenir la signature auprès de notre serveur
      const sig = await getMediaUploadSignature(adminReq(pwd));

      // 2. Envoyer le fichier directement à Cloudinary
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', sig.apiKey);
      form.append('timestamp', String(sig.timestamp));
      form.append('signature', sig.signature);
      form.append('folder', sig.folder);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`,
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

      // 3. Enregistrer le média dans la base de données
      const media = await createMedia(
        {
          name: file.name,
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          resourceType: uploaded.resource_type === 'video' ? 'video' : 'image',
        },
        adminReq(pwd),
      );
      return media;
    } catch (err) {
      console.error('Upload error', err);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading };
}
