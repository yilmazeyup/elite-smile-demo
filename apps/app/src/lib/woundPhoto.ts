/**
 * The wound photo, in the browser: a frame from the camera or a picture from the library, made small (about 320
 * pixels, a JPEG of a few dozen kilobytes) before it goes to the clinic panel; and a drawn example of a healing implant
 * site for trying the flow without a camera. The example is an illustration, clearly labelled as such.
 */

/** Draws a source into a canvas no larger than `max` on its long side; `mirror` flips it left to right. */
function fit(source: CanvasImageSource, w: number, h: number, max: number, mirror = false): HTMLCanvasElement {
  const s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * s);
  c.height = Math.round(h * s);
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  if (mirror) {
    g.translate(c.width, 0);
    g.scale(-1, 1);
  }
  g.drawImage(source, 0, 0, c.width, c.height);
  return c;
}

/** A still from the live camera, at most 960 pixels, as the dentist would see the mouth (not mirrored). */
export function grabFrame(video: HTMLVideoElement): string {
  return fit(video, video.videoWidth, video.videoHeight, 960).toDataURL('image/jpeg', 0.9);
}

/** Any picture (a data URL or a file URL) as a small JPEG for sending: about 320 pixels on its long side. */
export async function compress(src: string, max = 320, quality = 0.74): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return fit(img, img.naturalWidth, img.naturalHeight, max).toDataURL('image/jpeg', quality);
}

export async function fileToDataUrl(file: File, max = 1280): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return fit(img, img.naturalWidth, img.naturalHeight, max).toDataURL('image/jpeg', 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The drawn example: the lower left jaw seen from the front, with the premolar (35) and the second molar (37) either
 * side of a calm, closed implant site (36): pink gum, a faint line where it was opened and three small stitches.
 */
export function sampleWound(): string {
  const W = 800;
  const H = 600;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;

  // The mouth, softly lit from the front.
  const bg = g.createRadialGradient(W * 0.5, H * 0.55, 40, W * 0.5, H * 0.55, W * 0.7);
  bg.addColorStop(0, '#6E2E35');
  bg.addColorStop(0.55, '#3C1419');
  bg.addColorStop(1, '#16070A');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  // The cheek pulled aside, top left, and the lip below.
  const lip = g.createLinearGradient(0, H * 0.82, 0, H);
  lip.addColorStop(0, '#C9707A');
  lip.addColorStop(1, '#A7525E');
  g.fillStyle = lip;
  g.beginPath();
  g.moveTo(0, H * 0.86);
  g.bezierCurveTo(W * 0.3, H * 0.8, W * 0.7, H * 0.8, W, H * 0.88);
  g.lineTo(W, H);
  g.lineTo(0, H);
  g.closePath();
  g.fill();

  // The gum ridge of the lower jaw.
  const gum = g.createLinearGradient(0, H * 0.42, 0, H * 0.86);
  gum.addColorStop(0, '#F2A3A9');
  gum.addColorStop(0.5, '#E5868F');
  gum.addColorStop(1, '#C7646F');
  g.fillStyle = gum;
  g.beginPath();
  g.moveTo(-10, H * 0.6);
  g.bezierCurveTo(W * 0.2, H * 0.5, W * 0.8, H * 0.5, W + 10, H * 0.6);
  g.lineTo(W + 10, H * 0.88);
  g.bezierCurveTo(W * 0.7, H * 0.8, W * 0.3, H * 0.8, -10, H * 0.88);
  g.closePath();
  g.fill();

  // Two teeth either side of the gap: rounded crowns with a highlight.
  const tooth = (x: number, w: number, h: number) => {
    const y = H * 0.56 - h;
    const t = g.createLinearGradient(x, y, x + w, y + h);
    t.addColorStop(0, '#FFFDF7');
    t.addColorStop(0.6, '#EDE6D6');
    t.addColorStop(1, '#CFC5B0');
    g.fillStyle = t;
    g.beginPath();
    g.moveTo(x + 6, H * 0.6);
    g.bezierCurveTo(x - 8, y + h * 0.4, x + w * 0.05, y, x + w * 0.3, y + 6);
    g.bezierCurveTo(x + w * 0.45, y + 18, x + w * 0.55, y + 18, x + w * 0.7, y + 6);
    g.bezierCurveTo(x + w * 0.95, y, x + w + 8, y + h * 0.4, x + w - 6, H * 0.6);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath();
    g.ellipse(x + w * 0.3, y + h * 0.35, w * 0.08, h * 0.22, -0.2, 0, Math.PI * 2);
    g.fill();
  };
  tooth(W * 0.06, W * 0.22, H * 0.24);
  tooth(W * 0.68, W * 0.27, H * 0.22);

  // The healing site: a slightly deeper pink, a faint pale film, the line and three stitches.
  const site = g.createRadialGradient(W * 0.48, H * 0.6, 10, W * 0.48, H * 0.6, W * 0.2);
  site.addColorStop(0, 'rgba(214,104,116,0.9)');
  site.addColorStop(1, 'rgba(214,104,116,0)');
  g.fillStyle = site;
  g.fillRect(W * 0.25, H * 0.45, W * 0.46, H * 0.3);
  g.fillStyle = 'rgba(250,236,214,0.35)';
  g.beginPath();
  g.ellipse(W * 0.48, H * 0.6, W * 0.11, H * 0.03, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(150,52,64,0.75)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(W * 0.33, H * 0.61);
  g.bezierCurveTo(W * 0.42, H * 0.59, W * 0.54, H * 0.59, W * 0.63, H * 0.61);
  g.stroke();
  g.strokeStyle = '#1E2C5A';
  g.lineWidth = 3.2;
  g.lineCap = 'round';
  for (const x of [0.39, 0.48, 0.57]) {
    g.beginPath();
    g.moveTo(W * x - 9, H * 0.575);
    g.lineTo(W * x + 9, H * 0.64);
    g.stroke();
    g.beginPath();
    g.moveTo(W * x + 9, H * 0.575);
    g.lineTo(W * x - 5, H * 0.625);
    g.stroke();
    g.beginPath();
    g.moveTo(W * x + 9, H * 0.575);
    g.quadraticCurveTo(W * x + 20, H * 0.55, W * x + 16, H * 0.53);
    g.stroke();
  }

  // A soft vignette and the label.
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  return c.toDataURL('image/jpeg', 0.9);
}
