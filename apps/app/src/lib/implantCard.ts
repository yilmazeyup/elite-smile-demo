import { dateLong, doctorById, ME, toothName } from '@smile/shared';

import { tr } from '../i18n';
import { PASSPORT, passportDates } from './teethData';

/**
 * The implant passport as a picture (PNG), to share with another care provider or keep in your photos: the same card
 * as on screen, drawn on a canvas. Web only.
 */

export type PassportField = { k: string; v: string };

export function passportFields(today: Date): PassportField[] {
  const d = passportDates(today);
  return [
    { k: 'Regio', v: `${PASSPORT.region} · ${toothName(PASSPORT.region)}` },
    { k: 'Maat', v: `Ø ${PASSPORT.diameter} × ${PASSPORT.length} mm` },
    { k: 'Materiaal', v: PASSPORT.material },
    { k: 'Verbinding', v: PASSPORT.connection },
    { k: 'Type', v: `${PASSPORT.brand} · ref ${PASSPORT.ref}` },
    { k: 'Lot', v: PASSPORT.lot },
    { k: 'Geplaatst', v: `${dateLong(d.placed)} · ${doctorById(PASSPORT.by).name}` },
    { k: 'Botopbouw', v: dateLong(d.graft) },
    { k: 'Torque', v: PASSPORT.torque },
    { k: 'Opbouw', v: 'Volgt na het vastgroeien' },
    { k: 'Kroon', v: `Gepland ${dateLong(d.crown)}` },
  ];
}

/** The machine-readable line at the bottom of the card, as on a passport. */
export function passportMrz(today: Date): string[] {
  const d = passportDates(today);
  const ymd = `${String(d.placed.getFullYear()).slice(2)}${String(d.placed.getMonth() + 1).padStart(2, '0')}${String(d.placed.getDate()).padStart(2, '0')}`;
  const name = ME.name.toUpperCase().replace(/\s+/g, '<');
  return [`IMPL<NLD<${name}<<FDI${PASSPORT.region}`.padEnd(44, '<').slice(0, 44), `${PASSPORT.ref.replace('-', '')}<D41L10<TI4<${PASSPORT.lot.replace('-', '')}<${ymd}`.padEnd(44, '<').slice(0, 44)];
}

export async function passportImage(today: Date): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const W = 1200;
  const H = 760;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const r = 44;
  const round = () => {
    g.beginPath();
    g.moveTo(r, 0);
    g.arcTo(W, 0, W, H, r);
    g.arcTo(W, H, 0, H, r);
    g.arcTo(0, H, 0, 0, r);
    g.arcTo(0, 0, W, 0, r);
    g.closePath();
  };
  round();
  g.save();
  g.clip();
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#16306F');
  bg.addColorStop(1, '#0B1A3A');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // a guilloche of fine arcs, as on a passport page
  g.strokeStyle = 'rgba(127,201,242,0.08)';
  g.lineWidth = 1;
  for (let i = 0; i < 60; i++) {
    g.beginPath();
    g.ellipse(W * 0.82, H * 0.3, 120 + i * 9, 60 + i * 5, 0.4, 0, Math.PI * 2);
    g.stroke();
  }
  const sans = '"Figtree", system-ui, sans-serif';
  const mono = '"JetBrains Mono", ui-monospace, monospace';
  const display = '"Sora", system-ui, sans-serif';
  g.fillStyle = '#7FC9F2';
  g.font = `600 22px ${mono}`;
  g.fillText(tr('IMPLANTAATPASPOORT').toUpperCase(), 64, 82);
  g.fillStyle = '#FFFFFF';
  g.font = `600 54px ${display}`;
  g.fillText(tr(`Implantaat ${PASSPORT.region}`), 64, 150);
  g.font = `500 26px ${sans}`;
  g.fillStyle = '#B6C2DF';
  g.fillText(`${ME.name} · Elite Smile Dental Clinic`, 64, 192);
  // the fields in two columns
  const fields = passportFields(today);
  const colX = [64, 620];
  fields.forEach((f, i) => {
    const col = i < 6 ? 0 : 1;
    const row = i < 6 ? i : i - 6;
    const x = colX[col];
    const y = 262 + row * 62;
    g.fillStyle = '#7FC9F2';
    g.font = `500 17px ${mono}`;
    g.fillText(tr(f.k).toUpperCase(), x, y);
    g.fillStyle = '#FFFFFF';
    g.font = `600 25px ${sans}`;
    let v = tr(f.v);
    while (g.measureText(v).width > 500 && v.length > 4) v = `${v.slice(0, -2)}…`;
    g.fillText(v, x, y + 30);
  });
  // the machine-readable zone
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.fillRect(0, H - 128, W, 128);
  g.fillStyle = '#DCE6FF';
  g.font = `500 30px ${mono}`;
  passportMrz(today).forEach((line, i) => g.fillText(line, 64, H - 76 + i * 40));
  g.fillStyle = 'rgba(255,190,60,0.9)';
  g.font = `600 18px ${mono}`;
  g.textAlign = 'right';
  g.fillText(tr('DEMO · VERZONNEN GEGEVENS'), W - 64, 82);
  g.restore();
  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'));
}

/** Shares the card with the system share sheet, or downloads it where sharing files is not possible. */
export async function sharePassport(today: Date): Promise<'shared' | 'downloaded' | 'failed'> {
  const blob = await passportImage(today);
  if (!blob) return 'failed';
  const file = new File([blob], `implantaatpaspoort-${PASSPORT.region}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: tr('Implantaatpaspoort'), text: tr('Mijn implantaatpaspoort (regio 36), van Elite Smile.') });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'failed';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}
