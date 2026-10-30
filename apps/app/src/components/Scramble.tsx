import { useEffect, useRef, useState } from 'react';

import { Txt, type Variant } from './ui';

const GLYPHS = '[]{}<>/\\|=+*#%&@$?!01';

/**
 * Text that arrives as symbols and settles into words, letter by letter (Lama Lama's buttons do this): used where the
 * booking turns into a real time and room.
 */
export function Scramble({ text, v = 'display', color, duration = 900, size }: { text: string; v?: Variant; color?: string; duration?: number; size?: number }) {
  const [shown, setShown] = useState(text.replace(/\S/g, '·'));
  const start = useRef(0);
  useEffect(() => {
    start.current = Date.now();
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - start.current) / duration);
      const fixed = Math.floor(k * text.length);
      setShown(
        text
          .split('')
          .map((ch, i) => (i < fixed || ch === ' ' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(''),
      );
      if (k >= 1) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [text, duration]);
  return (
    <Txt v={v} color={color} size={size} accessibilityLabel={text} style={{ fontVariant: ['tabular-nums'] }}>
      {shown}
    </Txt>
  );
}
