import { ARABIC_FONTS, FONTS_URL, paletteCss } from '@smile/shared';

import { rtl } from '../i18n';

/**
 * The web layer of the look: the porcelain and night palettes as CSS variables, the pearl light that drifts behind every
 * screen (the soft blue, lilac and mint of enamel in light), glass, the enamel sheen, and the small motions. Elements
 * opt in with `fx('…')` (a data attribute), so React Native's own styles stay untouched.
 */

const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.04  0 0 0 0 0.1  0 0 0 0 0.23  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const CSS = `
${paletteCss()}
html,body,#root{background:var(--es-bg);}
html{transition:background-color .6s ease;}
body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;overscroll-behavior:none;font-feature-settings:"ss01","cv11";}
::selection{background:var(--es-sky);color:#fff;}
*{scrollbar-width:none;-webkit-tap-highlight-color:transparent;}
*::-webkit-scrollbar{width:0;height:0;display:none;}
:focus-visible{outline:2px solid var(--es-sky);outline-offset:3px;border-radius:12px;}
input,textarea{caret-color:var(--es-sky);}
input::placeholder,textarea::placeholder{color:var(--es-muted);opacity:1;}

/* switching looks: the new one grows as a circle from where you tapped */
::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal;}
::view-transition-new(root){animation:esReveal .8s cubic-bezier(.65,0,.25,1) both;}
@keyframes esReveal{from{clip-path:circle(0 at var(--es-wipe-x,90%) var(--es-wipe-y,6%))}to{clip-path:circle(150% at var(--es-wipe-x,90%) var(--es-wipe-y,6%))}}

[data-fx~="glass"]{-webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);background-color:var(--es-glass)!important;}
[data-fx~="glass-strong"]{-webkit-backdrop-filter:blur(26px) saturate(180%);backdrop-filter:blur(26px) saturate(180%);background-color:var(--es-glass)!important;
  box-shadow:0 18px 44px -18px rgba(11,26,58,.28),inset 0 1px 0 rgba(255,255,255,.55);}
[data-theme="night"] [data-fx~="glass-strong"]{box-shadow:0 18px 44px -18px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);}
[data-fx~="grain"]{position:relative;}
[data-fx~="grain"]::after{content:"";position:absolute;inset:0;background-image:${NOISE};opacity:.035;pointer-events:none;border-radius:inherit;}

/* the pearl light behind every page: slow, soft, never in the way */
[data-fx~="pearl"]{overflow:hidden;background-color:var(--es-bg);}
[data-fx~="pearl"]::before,[data-fx~="pearl"]::after{content:"";position:absolute;pointer-events:none;will-change:transform;filter:blur(8px);}
[data-fx~="pearl"]::before{left:-45%;top:-30%;width:160%;height:85%;
  background:radial-gradient(closest-side,rgba(45,180,232,.20),rgba(45,180,232,0) 70%) 5% 10%/58% 70% no-repeat,
             radial-gradient(closest-side,rgba(142,124,248,.15),rgba(142,124,248,0) 72%) 95% 25%/55% 62% no-repeat;
  animation:esDriftA 32s ease-in-out infinite alternate;}
[data-fx~="pearl"]::after{left:-30%;bottom:-35%;width:160%;height:85%;
  background:radial-gradient(closest-side,rgba(23,191,163,.12),rgba(23,191,163,0) 72%) 15% 85%/60% 70% no-repeat,
             radial-gradient(closest-side,rgba(10,99,181,.11),rgba(10,99,181,0) 70%) 90% 70%/52% 62% no-repeat,
             radial-gradient(closest-side,rgba(255,206,170,.16),rgba(255,206,170,0) 70%) 55% 100%/50% 50% no-repeat;
  animation:esDriftB 38s ease-in-out infinite alternate;}
[data-theme="night"] [data-fx~="pearl"]::before{
  background:radial-gradient(closest-side,rgba(76,203,247,.16),rgba(76,203,247,0) 70%) 5% 10%/58% 70% no-repeat,
             radial-gradient(closest-side,rgba(169,156,255,.14),rgba(169,156,255,0) 72%) 95% 25%/55% 62% no-repeat;}
[data-theme="night"] [data-fx~="pearl"]::after{
  background:radial-gradient(closest-side,rgba(60,211,160,.08),rgba(60,211,160,0) 72%) 15% 85%/60% 70% no-repeat,
             radial-gradient(closest-side,rgba(74,155,255,.14),rgba(74,155,255,0) 70%) 90% 70%/52% 62% no-repeat;}
@keyframes esDriftA{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(6%,5%,0) scale(1.05)}100%{transform:translate3d(11%,-3%,0) scale(1.02)}}
@keyframes esDriftB{0%{transform:translate3d(0,0,0)}50%{transform:translate3d(-7%,-4%,0) scale(1.07)}100%{transform:translate3d(5%,-7%,0)}}

/* the enamel: navy fills, a blue that runs like light over a tooth, and a moving sheen */
[data-fx~="dye-navy"]{background-image:linear-gradient(140deg,#16306F 0%,#0B1A3A 100%);}
[data-fx~="dye-blue"]{background-image:linear-gradient(120deg,#0A63B5 0%,#2DB4E8 100%);}
[data-fx~="dye-pearl"]{background-image:linear-gradient(125deg,#EAF6FD 0%,#F1EDFF 38%,#E6F8F2 70%,#FFF4EA 100%);}
[data-theme="night"] [data-fx~="dye-pearl"]{background-image:linear-gradient(125deg,#10224A 0%,#17204A 40%,#0F2A3A 75%,#1A1F3A 100%);}
[data-fx~="dye-ice"]{background-image:linear-gradient(160deg,var(--es-ice) 0%,rgba(255,255,255,0) 100%);}
[data-fx~="ink-blue"]{background-image:linear-gradient(100deg,#0A63B5 0%,#2DB4E8 60%,#7FD3F2 100%);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
[data-fx~="ink-pearl"]{background-image:linear-gradient(100deg,#234282 0%,#0A63B5 35%,#2DB4E8 65%,#8E7CF8 100%);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
[data-theme="night"] [data-fx~="ink-pearl"]{background-image:linear-gradient(100deg,#DCE6FF 0%,#7FC9FF 45%,#B7A8FF 100%);}
[data-fx~="glow"]{box-shadow:0 12px 30px -12px rgba(10,99,181,.55),0 0 0 1px rgba(45,180,232,.18);}
[data-fx~="halo"]{box-shadow:0 0 0 6px rgba(45,180,232,.12),0 0 0 14px rgba(45,180,232,.06);}

[data-fx~="sheen"]{overflow:hidden;position:relative;}
[data-fx~="sheen"]::after{content:"";position:absolute;top:-20%;bottom:-20%;width:38%;left:-60%;transform:skewX(-20deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.38),transparent);animation:esSheen 5.5s cubic-bezier(.4,0,.2,1) infinite;pointer-events:none;}
@keyframes esSheen{0%,70%{left:-60%}100%{left:130%}}

[data-fx~="pulse"]{animation:esPulse 1.9s ease-out infinite;}
@keyframes esPulse{0%{box-shadow:0 0 0 0 rgba(18,162,122,.5)}80%,100%{box-shadow:0 0 0 8px rgba(18,162,122,0)}}
[data-fx~="pulse-red"]{animation:esPulseRed 1.4s ease-out infinite;}
@keyframes esPulseRed{0%{box-shadow:0 0 0 0 rgba(226,67,75,.6)}80%,100%{box-shadow:0 0 0 12px rgba(226,67,75,0)}}
[data-fx~="pulse-blue"]{animation:esPulseBlue 2.2s ease-out infinite;}
@keyframes esPulseBlue{0%{box-shadow:0 0 0 0 rgba(45,180,232,.55)}80%,100%{box-shadow:0 0 0 14px rgba(45,180,232,0)}}
[data-fx~="float"]{animation:esFloat 6s ease-in-out infinite;}
@keyframes esFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
[data-fx~="spin"]{animation:esSpin 1.1s linear infinite;}
@keyframes esSpin{to{transform:rotate(360deg)}}
[data-fx~="marquee"]{display:flex;width:max-content;animation:esMarquee 40s linear infinite;}
@keyframes esMarquee{to{transform:translateX(-50%)}}
[dir="rtl"] [data-fx~="marquee"]{animation-direction:reverse;}
[data-fx~="rise"]{animation:esRise .7s cubic-bezier(.2,.9,.25,1.1) both;}
@keyframes esRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
[data-fx~="typing"] span{display:inline-block;animation:esDot 1.2s ease-in-out infinite;}
[data-fx~="typing"] span:nth-child(2){animation-delay:.15s}[data-fx~="typing"] span:nth-child(3){animation-delay:.3s}
@keyframes esDot{0%,60%,100%{opacity:.25;transform:none}30%{opacity:1;transform:translateY(-3px)}}
[data-fx~="breathe"]{animation:esBreathe 4s ease-in-out infinite;}
@keyframes esBreathe{0%,100%{transform:scale(.96);opacity:.85}50%{transform:scale(1.04);opacity:1}}

[data-fx~="lift"]{transition:transform .35s cubic-bezier(.2,.9,.25,1.15),box-shadow .35s ease;}
@media (hover:hover){[data-fx~="lift"]:hover{transform:translateY(-3px);box-shadow:0 18px 36px -18px rgba(11,26,58,.28);}}
[data-fx~="photo"] img{transition:transform 1.2s cubic-bezier(.2,.8,.2,1);}
@media (hover:hover){[data-fx~="lift"]:hover [data-fx~="photo"] img{transform:scale(1.04);}}
[data-fx~="pointer"]{cursor:pointer;}
[data-fx~="grab"]{cursor:grab;touch-action:none;}
[data-fx~="grab"]:active{cursor:grabbing;}
[data-fx~="tabular"]{font-variant-numeric:tabular-nums;}
[data-fx~="balance"]{text-wrap:balance;}
[data-fx~="pretty"]{text-wrap:pretty;}
[data-fx~="nosel"]{user-select:none;-webkit-user-select:none;}
[data-fx~="fade-b"]{-webkit-mask-image:linear-gradient(180deg,#000 60%,transparent);mask-image:linear-gradient(180deg,#000 60%,transparent);}
[data-fx~="fade-x"]{-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);}
[data-fx~="shade"]{background-image:linear-gradient(180deg,rgba(11,26,58,0) 35%,rgba(11,26,58,.82) 100%);}
[data-fx~="xray"] img{filter:grayscale(1) invert(1) contrast(1.35) brightness(.9);}
canvas{display:block;}

@media (prefers-reduced-motion:reduce){
  [data-fx~="pearl"]::before,[data-fx~="pearl"]::after,[data-fx~="sheen"]::after,[data-fx~="float"],[data-fx~="pulse"],[data-fx~="pulse-red"],[data-fx~="pulse-blue"],[data-fx~="marquee"],[data-fx~="breathe"]{animation:none!important;}
  ::view-transition-new(root){animation:none;}
}
`;

let installed = false;

/** Adds the fonts and the stylesheet to the page once. */
export function installWebStyles() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  for (const href of ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']) {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    if (href.includes('gstatic')) link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
  const fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = rtl() ? `${FONTS_URL}${ARABIC_FONTS}` : FONTS_URL;
  document.head.appendChild(fonts);
  const style = document.createElement('style');
  style.id = 'smile-fx';
  style.textContent = CSS;
  document.head.appendChild(style);
}

/** Resolves when the display font is ready (or after a short wait), so the intro never flashes a fallback font. */
export function fontsReady(timeout = 1600): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return Promise.resolve();
  const load = Promise.all([document.fonts.load('700 48px "Sora"'), document.fonts.load('italic 400 24px "Newsreader"'), document.fonts.load('500 16px "Figtree"')]).then(() => undefined);
  return Promise.race([load, new Promise<void>((resolve) => setTimeout(resolve, timeout))]).catch(() => undefined);
}
