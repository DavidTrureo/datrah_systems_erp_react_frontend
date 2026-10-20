/**
 * Utilidad Profesional de Optimización de Imágenes para Facturación ERP
 * Regla de Rendimiento y Almacenamiento:
 * 1. Compresión client-side a WebP (ahorro del 70-85% sin pérdida visual).
 * 2. Control de dimensiones máximas (1920x1920) para evitar saturación de memoria.
 * 3. Soporte para Base64, Blob y File con fallback seguro a JPEG.
 */

export interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface OptimizeResult {
  blob: Blob;
  isPdf: boolean;
  format: 'webp' | 'jpeg' | 'pdf';
  originalSize: number;
  compressedSize: number;
  dataUrl?: string;
}

/**
 * Verifica si una cadena ya es una URL pública en la nube
 */
export const isCloudUrl = (val: string | null | undefined): boolean => {
  if (!val || typeof val !== 'string') return false;
  const str = val.trim().toLowerCase();
  return str.startsWith('http://') || str.startsWith('https://');
};

/**
 * Convierte un Data URL Base64 a un objeto Blob binario
 */
export const dataUrlToBlob = (dataUrl: string): Blob | null => {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  if (!dataUrl.startsWith('data:')) return null;

  try {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.error('Error al convertir DataURL a Blob:', err);
    return null;
  }
};

/**
 * Convierte un Blob o File a Data URL
 */
export const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Comprime y convierte una imagen a formato WebP optimizado con resolución controlada.
 * Si el archivo es un PDF, respeta el formato binario original.
 */
export const comprimirAWebP = async (
  fileOrDataUrl: File | Blob | string,
  options: OptimizeOptions = {}
): Promise<OptimizeResult> => {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.82 } = options;

  let inputBlob: Blob | null = null;
  let isPdf = false;

  if (typeof fileOrDataUrl === 'string') {
    if (fileOrDataUrl.includes('application/pdf')) {
      isPdf = true;
    }
    inputBlob = dataUrlToBlob(fileOrDataUrl);
  } else if (fileOrDataUrl instanceof Blob) {
    inputBlob = fileOrDataUrl;
    if (inputBlob.type === 'application/pdf') {
      isPdf = true;
    }
  }

  if (!inputBlob) {
    throw new Error('Formato de archivo no válido para optimización.');
  }

  // Si es PDF se mantiene sin alterar
  if (isPdf) {
    return {
      blob: inputBlob,
      isPdf: true,
      format: 'pdf',
      originalSize: inputBlob.size,
      compressedSize: inputBlob.size,
    };
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(inputBlob!);
    const img = new Image();

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        // Escalar proporcionalmente
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve({
            blob: inputBlob!,
            isPdf: false,
            format: 'jpeg',
            originalSize: inputBlob!.size,
            compressedSize: inputBlob!.size,
          });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a WebP con fallback a JPEG
        canvas.toBlob(
          async (webpBlob) => {
            URL.revokeObjectURL(objectUrl);
            if (!webpBlob) {
              canvas.toBlob(
                async (jpegBlob) => {
                  const finalBlob = jpegBlob || inputBlob!;
                  const dataUrl = await blobToDataUrl(finalBlob);
                  resolve({
                    blob: finalBlob,
                    isPdf: false,
                    format: 'jpeg',
                    originalSize: inputBlob!.size,
                    compressedSize: finalBlob.size,
                    dataUrl,
                  });
                },
                'image/jpeg',
                quality
              );
              return;
            }

            const dataUrl = await blobToDataUrl(webpBlob);
            resolve({
              blob: webpBlob,
              isPdf: false,
              format: 'webp',
              originalSize: inputBlob!.size,
              compressedSize: webpBlob.size,
              dataUrl,
            });
          },
          'image/webp',
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo decodificar la imagen: ' + err));
    };

    img.src = objectUrl;
  });
};
