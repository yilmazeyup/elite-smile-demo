import { HISTORY, laylaTeeth } from '@smile/shared';

import type { Saved } from '../state/app';
import { sessionsSince, streak } from './brushData';

/**
 * A demo oral-health score out of 100, built from four things a dentist would look at: the check-up rhythm, the gums,
 * brushing (from the sessions saved by the brushing coach) and open treatments. Each factor explains itself and gives
 * one piece of advice. It is an illustration for a pitch, not a diagnosis.
 */

export type Factor = { id: string; title: string; value: number; weight: number; status: string; advice: string; icon: 'calendar' | 'heart' | 'brush' | 'implant'; route?: string };

export function scoreOf(saved: Pick<Saved, 'brushing'>, today: Date) {
  const lastCheck = HISTORY.filter((h) => h.who === 'layla' && (h.treatment === 'controle' || h.treatment === 'reiniging')).sort((a, b) => a.daysAgo - b.daysAgo)[0];
  const months = lastCheck ? Math.round(lastCheck.daysAgo / 30.4) : 12;
  const check = months <= 6 ? 1 : months <= 9 ? 0.8 : months <= 12 ? 0.62 : 0.45;
  const week = sessionsSince(saved.brushing, 7, today);
  const fullOnes = week.filter((s) => s.seconds >= 110).length;
  const brushing = Math.min(1, fullOnes / 14);
  const days = streak(saved.brushing, today);
  const teeth = laylaTeeth();
  const open = teeth.filter((t) => t.status === 'implantaat').length;
  const watch = teeth.filter((t) => t.status === 'aandacht').length;
  const openValue = Math.max(0.4, 1 - open * 0.2 - watch * 0.1);
  const factors: Factor[] = [
    {
      id: 'controle',
      title: 'Controle-ritme',
      value: check,
      weight: 0.25,
      icon: 'calendar',
      status: months <= 6 ? 'Op schema' : `Laatste controle ${months} maanden geleden`,
      advice: months <= 6 ? 'Mooi zo. Elk half jaar een controle en een reiniging houdt kleine dingen klein.' : 'Plan een controle en een reiniging; elk half jaar is het advies voor de meeste mensen.',
      route: '/afspraak',
    },
    {
      id: 'tandvlees',
      title: 'Tandvlees',
      value: 0.82,
      weight: 0.25,
      icon: 'heart',
      status: 'Rustig, twee plekjes bloedden licht',
      advice: 'Gebruik elke avond ragers of floss tussen je kiezen. Licht bloeden wordt meestal minder na een week of twee.',
    },
    {
      id: 'poetsen',
      title: 'Poetsen',
      value: brushing,
      weight: 0.3,
      icon: 'brush',
      status: saved.brushing.length ? `${fullOnes} van 14 volle sessies deze week · ${days} ${days === 1 ? 'dag' : 'dagen'} op rij` : 'Nog geen sessies met de poetscoach',
      advice: brushing >= 0.85 ? 'Twee keer per dag twee minuten: precies goed. Houd het zo vol.' : 'Poets twee keer per dag twee minuten; de poetscoach telt de kwadranten voor je af.',
      route: '/poetsen',
    },
    {
      id: 'open',
      title: 'Open behandelingen',
      value: openValue,
      weight: 0.2,
      icon: 'implant',
      status: `${open} lopend (implantaat 36) · ${watch} om te volgen (17)`,
      advice: 'Volg de nazorg voor je implantaat en kom naar de afspraak om de hechtingen te laten verwijderen.',
      route: '/nazorg',
    },
  ];
  // without any brushing sessions yet, brushing is left out of the total instead of counting as zero
  const counted = saved.brushing.length ? factors : factors.filter((f) => f.id !== 'poetsen');
  const weight = counted.reduce((s, f) => s + f.weight, 0);
  const total = Math.round((counted.reduce((s, f) => s + f.value * f.weight, 0) / weight) * 100);
  const weakest = [...counted].sort((a, b) => a.value - b.value)[0];
  const summary =
    weakest.id === 'controle'
      ? 'Je implantaat geneest goed. Wat nu het meeste oplevert: een controle en een reiniging.'
      : weakest.id === 'poetsen'
        ? 'Je implantaat geneest goed. Wat nu het meeste oplevert: elke dag twee keer poetsen.'
        : weakest.id === 'tandvlees'
          ? 'Wat nu het meeste oplevert: elke avond tussen je tanden schoonmaken.'
          : 'Volg de nazorg van je implantaat; de rest gaat goed.';
  const headline = total >= 85 ? 'Uitstekend' : total >= 72 ? 'Goed op weg' : total >= 58 ? 'Kan beter' : 'Aandacht nodig';
  return { total, headline, factors, summary, counted: counted.length };
}
