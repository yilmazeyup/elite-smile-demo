import type { IconName } from '../components/Icon';
import type { Saved } from '../state/app';

/**
 * The Kinderhoek's own data: the stickers, the story of a first visit, and the teeth Adam lost after the demo began.
 * The lost teeth live in the app's saved state (an extra field next to the others), so "Demo opnieuw" clears them too.
 */

export type KidsExtra = { kidsLostTeeth?: { tooth: number; at: number }[] };

export const lostTeethOf = (saved: Saved) => (saved as Saved & KidsExtra).kidsLostTeeth ?? [];

/** For `update`: the extra field travels with the rest of the saved state. */
export const withLostTooth = (saved: Saved, tooth: number): Partial<Saved> => ({ kidsLostTeeth: [...lostTeethOf(saved), { tooth, at: Date.now() }] }) as Partial<Saved>;

export type Sticker = { id: string; name: string; icon: IconName; color: string; hint: string };

export const STICKERS: Sticker[] = [
  { id: 'eerste-bezoek', name: 'Eerste bezoek', icon: 'starFill', color: '#FFB12E', hint: 'Je eerste keer bij de tandarts' },
  { id: 'dapper', name: 'Dapper!', icon: 'shield', color: '#2DB4E8', hint: 'Heel stil gelegen in de stoel' },
  { id: 'geheime-sleutel', name: 'Geheime sleutel', icon: 'key', color: '#C9A15B', hint: 'Er zweeft ergens een gouden sleutel…' },
  { id: 'kunstenaar', name: 'Kunstenaar', icon: 'paint', color: '#FF7AA8', hint: 'Bewaar een tekening op de krabbeltand' },
  { id: 'tandenfee', name: 'Tandenfee', icon: 'wand', color: '#8E7CF8', hint: 'Een melktand kwijt' },
  { id: 'poetsheld', name: 'Poetsheld', icon: 'brush', color: '#17BFA3', hint: 'Een week lang twee keer per dag poetsen' },
  { id: 'fluor', name: 'Fluor-ster', icon: 'drop', color: '#0A63B5', hint: 'Fluoride gekregen bij de controle' },
  { id: 'ragertje', name: 'Ragertje', icon: 'floss', color: '#17BFA3', hint: 'Tussen je tanden schoongemaakt' },
  { id: 'halfjaar', name: 'Halfjaar-held', icon: 'calendar', color: '#234282', hint: 'Twee controles op rij' },
  { id: 'beugelbaas', name: 'Beugelbaas', icon: 'braces', color: '#2DB4E8', hint: 'Elastiekjes gekozen voor je beugel' },
  { id: 'glimlach', name: 'Glimlach', icon: 'smile', color: '#FFB12E', hint: 'Een foto van je mooiste lach' },
  { id: 'kroon', name: 'Tandenkoning', icon: 'crown', color: '#C9A15B', hint: 'Alle andere stickers verzameld' },
];

export type StoryPage = { id: 'wachtkamer' | 'stoel' | 'spiegel' | 'tellen' | 'kietel' | 'sticker'; title: string; text: string };

export const FIRST_VISIT: StoryPage[] = [
  { id: 'wachtkamer', title: 'De wachtkamer', text: 'Je wacht even met papa of mama. Er liggen boekjes, en je mag rustig rondkijken.' },
  { id: 'stoel', title: 'De stoel gaat omhoog', text: 'Je ligt in een grote, zachte stoel. Hij zoemt omhoog, net een lift! De lamp is een kleine zon.' },
  { id: 'spiegel', title: 'Het spiegeltje', text: 'De tandarts kijkt met een klein rond spiegeltje. Zo ziet ze ook de achterkant van je tanden. Het doet geen pijn.' },
  { id: 'tellen', title: 'Tanden tellen', text: 'Dan telt de tandarts je tanden, één voor één. Een melkgebit heeft er twintig. Hoeveel heb jij er?' },
  { id: 'kietel', title: 'Het kietelborsteltje', text: 'Soms poetst de tandarts je tanden met een zacht borsteltje dat kietelt. Daarna voelen ze glad en schoon.' },
  { id: 'sticker', title: 'Een sticker!', text: 'Klaar! Je was heel dapper. Je mag een sticker kiezen, en hij komt ook in je stickerboek.' },
];

/** The twenty milk teeth by FDI number, as the dentist sees them: upper right to upper left, lower right to lower left. */
export const MILK_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const MILK_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

/** "boven, voor" style names of milk teeth for a child: which tooth went. */
export function milkName(n: number): string {
  const q = Math.floor(n / 10);
  const i = n % 10;
  const jaw = q === 5 || q === 6 ? 'boven' : 'onder';
  const side = q === 5 || q === 8 ? 'rechts' : 'links';
  const kind = i <= 2 ? (i === 1 ? 'voortand' : 'snijtand naast de voortand') : i === 3 ? 'hoektand' : i === 4 ? 'eerste kies' : 'achterste melkkies';
  // Joined with " · " so each part is translated on its own.
  return `${kind} · ${jaw} · ${side}`;
}

/** Brush colours for the doodle tooth. */
export const PAINTS = [
  { id: 'zon', color: '#FFB12E', name: 'Zon' },
  { id: 'roze', color: '#FF7AA8', name: 'Roze' },
  { id: 'lucht', color: '#2DB4E8', name: 'Lucht' },
  { id: 'munt', color: '#17BFA3', name: 'Munt' },
  { id: 'lila', color: '#8E7CF8', name: 'Lila' },
  { id: 'nacht', color: '#234282', name: 'Nacht' },
];
