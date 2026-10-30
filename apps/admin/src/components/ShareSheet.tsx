import { doctorById, tr, type DoctorId } from '@smile/shared';
import { useEffect, useRef, useState } from 'react';

import { drawQr } from '../qr';
import { Icon } from './Icon';
import { Avatar } from './ui';

/** The dentist's own public page on the website, next to the panel on the demo site. */
export const doctorPageUrl = (id: DoctorId) => new URL(`../website/tandarts/${id}/`, window.location.href).toString();

/** Sharing a dentist's page: the link, a QR code to scan from the screen, and the phone's own share sheet. */
export function ShareSheet({ id, onClose }: { id: DoctorId | null; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const sheet = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);
  const doctor = id ? doctorById(id) : null;
  const url = id ? doctorPageUrl(id) : '';
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (!id || !canvas.current) return;
    // Dark navy on white in both looks: phones read a QR code best with full contrast.
    drawQr(canvas.current, url, { size: 176, dark: '#0B1A3A', light: '#FFFFFF', quiet: 3 });
    setCopied(false);
    sheet.current?.querySelector<HTMLButtonElement>('.copy')?.focus();
  }, [id, url]);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [id, onClose]);

  if (!doctor || !id) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Without clipboard access: select the field so it can be copied by hand.
      sheet.current?.querySelector<HTMLInputElement>('input')?.select();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="share-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="share-sheet glass" role="dialog" aria-modal="true" aria-label={`Deel de pagina van ${doctor.name}`} ref={sheet}>
        <button className="icon-btn close" onClick={onClose} aria-label="Sluiten">
          <Icon name="close" size={16} />
        </button>
        <div className="share-head">
          <Avatar doctor={doctor} size={52} ring={doctor.color} />
          <div>
            <div className="kicker">Eigen pagina</div>
            <h2>{doctor.name}</h2>
            <p>{doctor.title}</p>
          </div>
        </div>
        <div className="share-body">
          <div className="qr">
            <canvas ref={canvas} aria-label={`QR-code voor ${url}`} role="img" />
            <span>Scan met je telefoon</span>
          </div>
          <div className="share-side">
            <label className="url">
              <span>Link naar de pagina</span>
              <input readOnly value={url} dir="ltr" onFocus={(e) => e.target.select()} />
            </label>
            <button className={`btn primary copy${copied ? ' done' : ''}`} onClick={copy}>
              <Icon name={copied ? 'check' : 'copy'} size={15} />
              {copied ? 'Gekopieerd' : 'Kopieer link'}
            </button>
            {canShare ? (
              <button className="btn" onClick={() => navigator.share({ title: `${doctor.name} · Elite Smile`, text: tr(doctor.title), url }).catch(() => {})}>
                <Icon name="share" size={15} />
                Delen via…
              </button>
            ) : null}
            <a className="btn ghost" href={url} target="_blank" rel="noreferrer">
              <Icon name="external" size={15} className="flip-rtl" />
              Open de pagina
            </a>
          </div>
        </div>
        <p className="fine">De openbare pagina van {doctor.name} op de website van Elite Smile, met boeken in de app.</p>
      </div>
    </div>
  );
}
