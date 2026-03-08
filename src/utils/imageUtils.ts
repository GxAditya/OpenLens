import Pica from 'pica';

const pica = new Pica();

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function estimateSize(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.round((base64.length * 3) / 4);
}

export async function loadImageFile(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const maxPixels = 15_000_000;
        const pixels = canvas.width * canvas.height;
        if (pixels > maxPixels) {
          const scale = Math.sqrt(maxPixels / pixels);
          const sw = Math.round(canvas.width * scale);
          const sh = Math.round(canvas.height * scale);
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = sw;
          smallCanvas.height = sh;
          smallCanvas.getContext('2d')!.drawImage(canvas, 0, 0, sw, sh);
          resolve({ dataUrl: smallCanvas.toDataURL('image/png'), width: sw, height: sh });
        } else {
          resolve({ dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
        }
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function resizeImage(
  dataUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImg(dataUrl);
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = img.naturalWidth;
  srcCanvas.height = img.naturalHeight;
  srcCanvas.getContext('2d')!.drawImage(img, 0, 0);

  const destCanvas = document.createElement('canvas');
  destCanvas.width = Math.max(1, Math.round(targetWidth));
  destCanvas.height = Math.max(1, Math.round(targetHeight));

  await pica.resize(srcCanvas, destCanvas, { quality: 3 });

  return {
    dataUrl: destCanvas.toDataURL('image/png'),
    width: destCanvas.width,
    height: destCanvas.height,
  };
}

export async function rotateImage(
  dataUrl: string,
  degrees: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImg(dataUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const isRightAngle = degrees === 90 || degrees === 270 || degrees === -90 || degrees === -270;
  if (isRightAngle) {
    canvas.width = img.naturalHeight;
    canvas.height = img.naturalWidth;
  } else {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}

export async function convertImage(
  dataUrl: string,
  format: 'png' | 'jpeg' | 'webp',
  quality: number = 92
): Promise<{ blob: Blob; dataUrl: string; size: number }> {
  const img = await loadImg(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;

  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);

  const mimeType = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
  const q = format === 'png' ? undefined : quality / 100;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Conversion failed'));
        const reader = new FileReader();
        reader.onload = () => resolve({ blob, dataUrl: reader.result as string, size: blob.size });
        reader.readAsDataURL(blob);
      },
      mimeType,
      q
    );
  });
}

export async function removeImageBackground(
  dataUrl: string,
  model: 'small' | 'medium' | 'large',
  onProgress?: (progress: number, message: string) => void
): Promise<{ dataUrl: string; width: number; height: number }> {
  onProgress?.(0, 'Loading background removal model...');
  const { removeBackground } = await import('@imgly/background-removal');

  const img = await loadImg(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d')!.drawImage(img, 0, 0);

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/png')
  );

  const resultBlob = await removeBackground(blob, {
    model: model as any,
    progress: (key: string, current: number, total: number) => {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      const msg = String(key).includes('download')
        ? `Downloading ${model} model... ${pct}%`
        : `Processing... ${pct}%`;
      onProgress?.(pct, msg);
    },
  });

  const resultUrl = URL.createObjectURL(resultBlob);
  const resultImg = await loadImg(resultUrl);
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = resultImg.naturalWidth;
  resultCanvas.height = resultImg.naturalHeight;
  resultCanvas.getContext('2d')!.drawImage(resultImg, 0, 0);
  URL.revokeObjectURL(resultUrl);

  return {
    dataUrl: resultCanvas.toDataURL('image/png'),
    width: resultCanvas.width,
    height: resultCanvas.height,
  };
}

export async function upscaleImage(
  dataUrl: string,
  scale: 2 | 4,
  onProgress?: (progress: number, message: string) => void
): Promise<{ dataUrl: string; width: number; height: number }> {
  onProgress?.(5, 'Loading upscaling model...');

  const UpscalerModule = await import('upscaler');
  const Upscaler = UpscalerModule.default;
  const upscaler = new Upscaler();

  onProgress?.(15, 'Upscaling image (2×)...');

  let result: string;
  try {
    result = await upscaler.upscale(dataUrl, {
      output: 'base64',
      patchSize: 64,
      padding: 2,
      progress: (pct: number) => {
        const base = scale === 4 ? 15 : 15;
        const range = scale === 4 ? 40 : 80;
        onProgress?.(base + Math.round(pct * range), 'Upscaling...');
      },
    });
  } catch {
    // Fallback: simple canvas upscale with pica
    onProgress?.(20, 'Fallback upscaling with pica...');
    const img = await loadImg(dataUrl);
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = img.naturalWidth;
    srcCanvas.height = img.naturalHeight;
    srcCanvas.getContext('2d')!.drawImage(img, 0, 0);

    const destCanvas = document.createElement('canvas');
    destCanvas.width = img.naturalWidth * 2;
    destCanvas.height = img.naturalHeight * 2;
    await pica.resize(srcCanvas, destCanvas, { quality: 3 });
    result = destCanvas.toDataURL('image/png');
  }

  if (scale === 4) {
    onProgress?.(55, 'Upscaling again (4×)...');
    try {
      result = await upscaler.upscale(result, {
        output: 'base64',
        patchSize: 64,
        padding: 2,
        progress: (pct: number) => {
          onProgress?.(55 + Math.round(pct * 40), 'Upscaling 4×...');
        },
      });
    } catch {
      const img2 = await loadImg(result);
      const s2 = document.createElement('canvas');
      s2.width = img2.naturalWidth;
      s2.height = img2.naturalHeight;
      s2.getContext('2d')!.drawImage(img2, 0, 0);
      const d2 = document.createElement('canvas');
      d2.width = img2.naturalWidth * 2;
      d2.height = img2.naturalHeight * 2;
      await pica.resize(s2, d2, { quality: 3 });
      result = d2.toDataURL('image/png');
    }
  }

  onProgress?.(95, 'Finalizing...');
  const finalImg = await loadImg(result);
  return { dataUrl: result, width: finalImg.naturalWidth, height: finalImg.naturalHeight };
}
