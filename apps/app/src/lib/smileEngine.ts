import { closestShade, LINEAR, labFromLinear, rgbFromLab, SHADE_LAB, type Lab } from './smileShade';

/**
 * The Glimlach-studio's engine, in the browser only. Google MediaPipe's Face Landmarker (loaded from its CDN when the
 * studio opens, run on the device: nothing is uploaded) finds the inner edge of the lips. Inside that line, with soft
 * edges, the pixels that look like enamel (bright, low in red, low in chroma) are moved toward a VITA shade in CIELAB,
 * keeping each pixel's own variation, so the texture, the gaps and the highlights stay; lips and gums are left alone.
 * Without the model (offline, an old browser, a headless test) the sample photo uses its mouth line measured by hand.
 */

const VERSION = '0.10.21';
const BUNDLE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/vision_bundle.mjs`;
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/** Face mesh points along the inner edge of the lips, clockwise from the right corner of the mouth (as seen). */
const INNER_LIPS = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];

export type Pt = { x: number; y: number };

/** The sample photo (smile.jpg, 1400 × 934): the inner lip line, measured once with the same model. */
export const SAMPLE_MOUTH: Pt[] = [
  [613, 483], [630, 481], [651, 480], [676, 481], [707, 484], [742, 487], [778, 486], [807, 484], [831, 483], [851, 485],
  [867, 488], [847, 510], [830, 523], [806, 534], [777, 541], [743, 542], [707, 539], [678, 532], [652, 520], [634, 506],
].map(([x, y]) => ({ x, y }));

type FaceMarker = { detect(image: CanvasImageSource): { faceLandmarks: { x: number; y: number }[][] } };
type Vision = {
  FilesetResolver: { forVisionTasks(path: string): Promise<unknown> };
  FaceLandmarker: { createFromOptions(fileset: unknown, options: object): Promise<FaceMarker> };
};

let faceModel: Promise<FaceMarker> | null = null;
let quiet = false;

/** MediaPipe reports its own start-up (TensorFlow Lite, the GL context) on the console; that noise is kept out. */
function quietMediaPipe() {
  if (quiet) return;
  quiet = true;
  const noise = /^(INFO:|I\d{4}|W\d{4})|TensorFlow Lite|gl_context|Graph successfully|XNNPACK|Feedback manager/;
  for (const level of ['error', 'warn', 'info', 'log'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && noise.test(args[0])) return;
      original(...args);
    };
  }
}

/** The face model, on the CPU. A failed load can be tried again later. */
export function loadFace(): Promise<FaceMarker> {
  if (!faceModel) {
    quietMediaPipe();
    faceModel = (async () => {
      // A plain dynamic import of a URL, kept away from the bundler.
      const vision = (await new Function('u', 'return import(u)')(BUNDLE)) as Vision;
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
      // One still photo: the CPU is quick enough, and it spares the page the GPU's start-up, which can hold up the
      // first frames on a slow phone.
      return vision.FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'CPU' }, runningMode: 'IMAGE', numFaces: 1 });
    })();
    faceModel.catch(() => {
      faceModel = null;
    });
  }
  return faceModel;
}

const timeout = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

/** The inner lip line in the image's pixels, or null when there is no face, no open smile, or no model. */
export async function findMouth(image: HTMLCanvasElement, ms = 15000): Promise<Pt[] | null> {
  const model = await timeout(loadFace(), ms);
  const face = model.detect(image).faceLandmarks[0];
  if (!face) return null;
  const pts = INNER_LIPS.map((i) => ({ x: face[i].x * image.width, y: face[i].y * image.height }));
  // A closed mouth has no teeth to show: the two lip lines lie on top of each other.
  const top = (pts[5].y + pts[4].y + pts[6].y) / 3;
  const bottom = (pts[15].y + pts[14].y + pts[16].y) / 3;
  const width = Math.abs(pts[10].x - pts[0].x);
  if (bottom - top < width * 0.06) return null;
  return pts;
}

// ------------------------------------------------------------------------------------------------------ photos

/** Loads a picture into a canvas, at most `max` pixels on its long side. */
export async function loadImage(src: string, max = 1600): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  await img.decode();
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * s);
  c.height = Math.round(img.naturalHeight * s);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** A file from the camera or the photo library, as a data URL no larger than `max` on its long side. */
export async function fileToDataUrl(file: File, max = 1600): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const c = await loadImage(url, max);
    return c.toDataURL('image/jpeg', 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ------------------------------------------------------------------------------------------------------ the crop

export type Crop = { x: number; y: number; w: number; h: number };

/** A frame around the mouth, from the nose to the chin: `aspect` is height over width. */
export function mouthCrop(mouth: Pt[], imgW: number, imgH: number, aspect: number): Crop {
  const xs = mouth.map((p) => p.x);
  const ys = mouth.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const cx = (minX + maxX) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  let w = (maxX - minX) * 2.15;
  let h = w * aspect;
  const fit = Math.min(1, imgW / w, imgH / h);
  w *= fit;
  h *= fit;
  const x = Math.max(0, Math.min(imgW - w, cx - w / 2));
  const y = Math.max(0, Math.min(imgH - h, cy - h * 0.5));
  return { x, y, w, h };
}

// ------------------------------------------------------------------------------------------------------ the work

/** Everything worked out once per photo; a new shade then only moves numbers. */
export type Prepared = {
  w: number;
  h: number;
  /** The crop as it is. */
  base: ImageData;
  /** Pixel indices (into the crop) that take part, with their weight and their colour in CIELAB. */
  idx: Int32Array;
  wt: Float32Array;
  L: Float32Array;
  A: Float32Array;
  B: Float32Array;
  /** The enamel's average colour in this photo, and the brightness of its brightest enamel. */
  mean: Lab;
  ref: number;
  /** The closest tab to the enamel in this photo (light and camera change it: an estimate). */
  estimate: string;
  /** The mouth line in the crop's pixels. */
  mouth: Pt[];
};

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** A box blur over a part of a float image, `passes` times (three passes are close to a gaussian). */
function blur(src: Float32Array, w: number, x0: number, y0: number, x1: number, y1: number, r: number, passes = 2) {
  const tmp = new Float32Array(src.length);
  const rr = Math.max(1, Math.round(r));
  for (let p = 0; p < passes; p++) {
    for (let y = y0; y < y1; y++) {
      let acc = 0;
      let n = 0;
      for (let x = x0 - rr; x < x1 + rr; x++) {
        if (x + rr < x1 && x + rr >= x0) {
          acc += src[y * w + x + rr];
          n++;
        }
        if (x - rr - 1 >= x0 && x - rr - 1 < x1) {
          acc -= src[y * w + x - rr - 1];
          n--;
        }
        if (x >= x0 && x < x1) tmp[y * w + x] = n ? acc / n : 0;
      }
    }
    for (let x = x0; x < x1; x++) {
      let acc = 0;
      let n = 0;
      for (let y = y0 - rr; y < y1 + rr; y++) {
        if (y + rr < y1 && y + rr >= y0) {
          acc += tmp[(y + rr) * w + x];
          n++;
        }
        if (y - rr - 1 >= y0 && y - rr - 1 < y1) {
          acc -= tmp[(y - rr - 1) * w + x];
          n--;
        }
        if (y >= y0 && y < y1) src[y * w + x] = n ? acc / n : 0;
      }
    }
  }
}

/**
 * Cuts the frame out of the photo at `outW` pixels wide and finds the enamel inside the mouth line: a soft mask from
 * the lip line, then per pixel how much it looks like a tooth.
 */
export function prepare(photo: HTMLCanvasElement, mouthInPhoto: Pt[], crop: Crop, outW: number): Prepared {
  const s = Math.min(1.25, outW / crop.w);
  const w = Math.round(crop.w * s);
  const h = Math.round(crop.h * s);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(photo, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h);
  const base = g.getImageData(0, 0, w, h);
  const mouth = mouthInPhoto.map((p) => ({ x: (p.x - crop.x) * s, y: (p.y - crop.y) * s }));

  // The lip line, opened a little (the landmarks sit on the lip, the teeth start just past it; the colour test below
  // keeps the lips out), filled, and softened.
  const cx = mouth.reduce((t, p) => t + p.x, 0) / mouth.length;
  const cy = mouth.reduce((t, p) => t + p.y, 0) / mouth.length;
  const m = document.createElement('canvas');
  m.width = w;
  m.height = h;
  const mg = m.getContext('2d', { willReadFrequently: true })!;
  mg.fillStyle = '#fff';
  mg.beginPath();
  mouth.forEach((p, i) => {
    const x = cx + (p.x - cx) * 1.03;
    const y = cy + (p.y - cy) * 1.14;
    if (i) mg.lineTo(x, y);
    else mg.moveTo(x, y);
  });
  mg.closePath();
  mg.fill();
  const alphaData = mg.getImageData(0, 0, w, h).data;
  const xs = mouth.map((p) => p.x);
  const ys = mouth.map((p) => p.y);
  const mouthW = Math.max(...xs) - Math.min(...xs);
  const r = Math.max(1.5, mouthW * 0.016);
  const pad = Math.ceil(r * 3) + 2;
  const x0 = Math.max(0, Math.floor(Math.min(...xs) - pad));
  const x1 = Math.min(w, Math.ceil(Math.max(...xs) + pad));
  const y0 = Math.max(0, Math.floor(Math.min(...ys) - (cy - Math.min(...ys)) * 0.2 - pad));
  const y1 = Math.min(h, Math.ceil(Math.max(...ys) + (Math.max(...ys) - cy) * 0.2 + pad));
  const mask = new Float32Array(w * h);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) mask[y * w + x] = alphaData[(y * w + x) * 4 + 3] / 255;
  blur(mask, w, x0, y0, x1, y1, r, 2);

  // Colour of every pixel in the box.
  const n = (x1 - x0) * (y1 - y0);
  const Ls = new Float32Array(n);
  const As = new Float32Array(n);
  const Bs = new Float32Array(n);
  const px = base.data;
  const lab: Lab = { L: 0, a: 0, b: 0 };
  const candidates: number[] = [];
  for (let y = y0, k = 0; y < y1; y++)
    for (let x = x0; x < x1; x++, k++) {
      const i = (y * w + x) * 4;
      labFromLinear(LINEAR[px[i]], LINEAR[px[i + 1]], LINEAR[px[i + 2]], lab);
      Ls[k] = lab.L;
      As[k] = lab.a;
      Bs[k] = lab.b;
      if (mask[y * w + x] > 0.5 && lab.a < 10) candidates.push(lab.L);
    }
  candidates.sort((p, q) => p - q);
  const ref = candidates.length ? candidates[Math.floor(candidates.length * 0.9)] : 80;

  // How much each pixel looks like enamel: low red (lips and gums are red), bright for this photo, not too colourful.
  const weight = new Float32Array(w * h);
  for (let y = y0, k = 0; y < y1; y++)
    for (let x = x0; x < x1; x++, k++) {
      const mk = mask[y * w + x];
      if (mk < 0.01) continue;
      const a = As[k];
      const chroma = Math.hypot(a, Bs[k]);
      const wa = 1 - smooth(5.5, 12.5, a);
      const wl = smooth(ref * 0.52, ref * 0.76, Ls[k]);
      const wc = 1 - smooth(30, 42, chroma);
      weight[y * w + x] = mk * wa * wl * wc;
    }
  blur(weight, w, x0, y0, x1, y1, Math.max(1, r * 0.35), 1);

  const idx: number[] = [];
  const wt: number[] = [];
  const L: number[] = [];
  const A: number[] = [];
  const B: number[] = [];
  let sw = 0;
  const mean = { L: 0, a: 0, b: 0 };
  for (let y = y0, k = 0; y < y1; y++)
    for (let x = x0; x < x1; x++, k++) {
      const v = weight[y * w + x];
      if (v < 0.015) continue;
      idx.push(y * w + x);
      wt.push(v);
      L.push(Ls[k]);
      A.push(As[k]);
      B.push(Bs[k]);
      const v2 = v * v;
      sw += v2;
      mean.L += Ls[k] * v2;
      mean.a += As[k] * v2;
      mean.b += Bs[k] * v2;
    }
  if (sw > 0) {
    mean.L /= sw;
    mean.a /= sw;
    mean.b /= sw;
  } else Object.assign(mean, SHADE_LAB.A2);

  return {
    w,
    h,
    base,
    idx: Int32Array.from(idx),
    wt: Float32Array.from(wt),
    L: Float32Array.from(L),
    A: Float32Array.from(A),
    B: Float32Array.from(B),
    mean,
    ref,
    // Light and camera change brightness most, so hue and chroma count for more than lightness.
    estimate: closestShade(mean, 0.3),
    mouth,
  };
}

/** How far to move the enamel to go from the photo's own shade to `shade`, scaled to the photo's exposure. */
export type Shift = { dL: number; da: number; db: number; facings: number };

export function shiftTo(prep: Prepared, shade: string, from = prep.estimate, facings = 0): Shift {
  const t = SHADE_LAB[shade] ?? SHADE_LAB.A2;
  const f = SHADE_LAB[from] ?? SHADE_LAB.A2;
  const k = Math.max(0.7, Math.min(1.2, prep.mean.L / f.L));
  return { dL: (t.L - f.L) * k * 1.15, da: t.a - f.a, db: (t.b - f.b) * 1.05, facings };
}

/**
 * Draws the crop with the enamel moved by `shift` into `out` (an ImageData the size of the crop). Facings even out
 * colour and brightness toward the average, keeping some texture, with a touch more gloss.
 */
export function render(prep: Prepared, shift: Shift, out: ImageData) {
  out.data.set(prep.base.data);
  const d = out.data;
  const { idx, wt, L, A, B, mean, ref } = prep;
  const f = shift.facings;
  for (let k = 0; k < idx.length; k++) {
    const w = wt[k];
    let l = L[k];
    let a = A[k];
    let b = B[k];
    // Highlights stay highlights: they move less.
    const hl = smooth(ref + 1, ref + 12, l);
    const lift = shift.dL * (1 - 0.65 * hl);
    if (f > 0) {
      const dark = smooth(ref * 0.6, ref * 0.85, l);
      l += (mean.L - l) * f * 0.75 * dark + f * 4;
      a += (mean.a - a) * f * 0.85;
      b += (mean.b - b) * f * 0.85;
    }
    const nl = L[k] + (l + lift - L[k]) * w;
    const na = A[k] + (a + shift.da - A[k]) * w;
    const nb = B[k] + (b + shift.db - B[k]) * w;
    const [r, g, bl] = rgbFromLab(nl, na, nb);
    const i = idx[k] * 4;
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = bl;
  }
}
