export type VideoCompressionProgress = (progress: number) => void;

export type VideoCompressionResult = {
  file: File;
  compressed: boolean;
  originalBytes: number;
  compressedBytes: number;
  message?: string;
};

type CapturableVideo = HTMLVideoElement & {
  webkitCaptureStream?: () => MediaStream;
};

const TARGET_RATIO = 0.9;

function getCaptureStream(video: CapturableVideo): MediaStream | null {
  if (typeof video.captureStream === 'function') return video.captureStream();
  if (typeof video.webkitCaptureStream === 'function') return video.webkitCaptureStream();
  return null;
}

function getRecorderMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function compressAttempt(
  video: CapturableVideo,
  canvas: HTMLCanvasElement,
  mimeType: string,
  duration: number,
  sourceBitrate: number,
  ratio: number,
  onProgress: VideoCompressionProgress,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const sourceStream = getCaptureStream(video);
    const canvasStream = canvas.captureStream(30);
    if (!sourceStream) {
      reject(new Error('La capture vidéo n’est pas prise en charge par ce navigateur.'));
      return;
    }

    sourceStream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
    const targetBitrate = Math.max(80_000, Math.floor(sourceBitrate * ratio));
    const videoBitrate = Math.max(60_000, Math.floor(targetBitrate * 0.88));
    const audioBitrate = Math.max(16_000, Math.floor(targetBitrate * 0.12));
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: videoBitrate,
        audioBitsPerSecond: audioBitrate,
      });
    } catch (error) {
      canvasStream.getTracks().forEach((track) => track.stop());
      reject(error);
      return;
    }

    const chunks: Blob[] = [];
    let settled = false;
    const cleanup = () => {
      sourceStream.getTracks().forEach((track) => track.stop());
      canvasStream.getTracks().forEach((track) => track.stop());
      video.onended = null;
      video.pause();
    };
    const finish = () => {
      if (settled || recorder.state === 'inactive') return;
      recorder.stop();
    };
    const drawFrame = () => {
      if (settled || video.ended) return;
      const context = canvas.getContext('2d');
      if (context) context.drawImage(video, 0, 0, canvas.width, canvas.height);
      onProgress(Math.min(99, Math.round((video.currentTime / duration) * 90)));
      requestAnimationFrame(drawFrame);
    };

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => {
      cleanup();
      if (!settled) {
        settled = true;
        reject(new Error('La compression vidéo a échoué.'));
      }
    };
    recorder.onstop = () => {
      cleanup();
      if (!settled) {
        settled = true;
        onProgress(100);
        resolve(new Blob(chunks, { type: mimeType }));
      }
    };
    video.onended = finish;

    try {
      recorder.start(1_000);
      video.currentTime = 0;
      void video.play().then(drawFrame).catch((error) => {
        cleanup();
        if (!settled) {
          settled = true;
          reject(error);
        }
      });
    } catch (error) {
      cleanup();
      if (!settled) {
        settled = true;
        reject(error);
      }
    }
  });
}

/**
 * Re-encode a local video before upload. The first attempt targets 90% of the
 * source average bitrate; a second attempt is used when the resulting file is
 * still not at least 10% smaller.
 */
export async function compressVideo(
  file: File,
  onProgress: VideoCompressionProgress = () => undefined,
): Promise<VideoCompressionResult> {
  if (!file.type.startsWith('video/')) {
    return { file, compressed: false, originalBytes: file.size, compressedBytes: file.size };
  }

  const mimeType = getRecorderMimeType();
  const video = document.createElement('video') as CapturableVideo;
  const objectUrl = URL.createObjectURL(file);
  video.preload = 'auto';
  video.playsInline = true;
  video.muted = false;
  video.volume = 0;
  video.src = objectUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Impossible de lire cette vidéo pour la compresser.'));
    });

    const duration = video.duration;
    if (!mimeType || !Number.isFinite(duration) || duration <= 0 || video.videoWidth === 0 || video.videoHeight === 0) {
      return {
        file,
        compressed: false,
        originalBytes: file.size,
        compressedBytes: file.size,
        message: 'Compression indisponible pour ce format ou ce navigateur ; fichier original envoyé.',
      };
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const sourceBitrate = (file.size * 8) / duration;
    let compressedBlob = await compressAttempt(video, canvas, mimeType, duration, sourceBitrate, TARGET_RATIO, onProgress);

    if (compressedBlob.size > file.size * TARGET_RATIO) {
      compressedBlob = await compressAttempt(video, canvas, mimeType, duration, sourceBitrate, 0.75, onProgress);
    }

    if (compressedBlob.size >= file.size * TARGET_RATIO) {
      return {
        file,
        compressed: false,
        originalBytes: file.size,
        compressedBytes: file.size,
        message: 'La compression n’a pas atteint 10 % de réduction ; fichier original envoyé.',
      };
    }

    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const outputName = file.name.replace(/\.[^/.]+$/, '') + `.${extension}`;
    return {
      file: new File([compressedBlob], outputName, { type: mimeType }),
      compressed: true,
      originalBytes: file.size,
      compressedBytes: compressedBlob.size,
    };
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}