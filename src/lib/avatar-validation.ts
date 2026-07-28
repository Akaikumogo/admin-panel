export type AvatarValidationResult =
  | { ok: true; hasFace: boolean; faceConfidence: number; whiteBgRatio: number }
  | { ok: false; reason: 'no_face' | 'not_white_bg' | 'load_error' };

const WHITE_THRESHOLD = 235; // near-white RGB channel min
const WHITE_EDGE_RATIO = 0.72; // border pixels that must be near-white
const BORDER_FRAC = 0.12; // sample outer 12% as "background"

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('load_error'));
    };
    img.src = url;
  });
}

async function detectFace(
  imgEl: HTMLImageElement,
): Promise<{ hasFace: boolean; confidence: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FaceDetectorCtor = (window as any).FaceDetector as
    | (new (opts?: { fastMode?: boolean }) => {
        detect: (img: HTMLImageElement) => Promise<Array<{ boundingBox: DOMRect }>>;
      })
    | undefined;

  if (FaceDetectorCtor) {
    try {
      const det = new FaceDetectorCtor({ fastMode: true });
      const faces = await det.detect(imgEl);
      if (faces?.length > 0) {
        return { hasFace: true, confidence: 0.9 };
      }
      return { hasFace: false, confidence: 0 };
    } catch {
      /* fall through */
    }
  }

  // Heuristic fallback: skin-tone + contrast (same idea as mobile app)
  const canvas = document.createElement('canvas');
  const w = (canvas.width = 64);
  const h = (canvas.height = 64);
  const ctx = canvas.getContext('2d');
  if (!ctx) return { hasFace: false, confidence: 0 };
  ctx.drawImage(imgEl, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  let minL = 255;
  let maxL = 0;
  for (let i = 0; i < data.length; i += 4) {
    const R = data[i];
    const G = data[i + 1];
    const B = data[i + 2];
    r += R;
    g += G;
    b += B;
    n += 1;
    const L = 0.299 * R + 0.587 * G + 0.114 * B;
    if (L < minL) minL = L;
    if (L > maxL) maxL = L;
  }
  const avgR = r / n;
  const avgG = g / n;
  const avgB = b / n;
  const contrast = maxL - minL;
  const skinish =
    avgR > 95 &&
    avgG > 40 &&
    avgB > 20 &&
    avgR > avgB &&
    Math.abs(avgR - avgG) > 5 &&
    contrast > 30;
  return { hasFace: skinish, confidence: skinish ? 0.55 : 0.15 };
}

function measureWhiteBackground(imgEl: HTMLImageElement): number {
  const canvas = document.createElement('canvas');
  const size = 128;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  ctx.drawImage(imgEl, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const border = Math.max(1, Math.floor(size * BORDER_FRAC));
  let edge = 0;
  let white = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const onEdge =
        x < border || y < border || x >= size - border || y >= size - border;
      if (!onEdge) continue;
      edge += 1;
      const i = (y * size + x) * 4;
      const R = data[i];
      const G = data[i + 1];
      const B = data[i + 2];
      if (R >= WHITE_THRESHOLD && G >= WHITE_THRESHOLD && B >= WHITE_THRESHOLD) {
        white += 1;
      }
    }
  }

  return edge === 0 ? 0 : white / edge;
}

/** Validate employee avatar: person face + white background. */
export async function validateEmployeeAvatar(
  file: File,
): Promise<AvatarValidationResult> {
  let img: HTMLImageElement;
  try {
    img = await loadImageFromFile(file);
  } catch {
    return { ok: false, reason: 'load_error' };
  }

  const face = await detectFace(img);
  if (!face.hasFace) {
    return { ok: false, reason: 'no_face' };
  }

  const whiteBgRatio = measureWhiteBackground(img);
  if (whiteBgRatio < WHITE_EDGE_RATIO) {
    return { ok: false, reason: 'not_white_bg' };
  }

  return {
    ok: true,
    hasFace: true,
    faceConfidence: face.confidence,
    whiteBgRatio,
  };
}
