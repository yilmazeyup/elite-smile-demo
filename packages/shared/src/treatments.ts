import type { DoctorId } from './team';

/**
 * What Elite Smile offers, exactly the seven specialties and the treatments listed on elitesmile.nl, plus teeth
 * whitening from the site's own FAQ. The care texts (before, after, what is normal, when to call) are general dental
 * guidance written for this demo; in a real launch the clinic's dentists check and own every line.
 */

export type SpecialtyId = 'algemeen' | 'kinderen' | 'cosmetisch' | 'orthodontie' | 'chirurgie' | 'endodontie' | 'prothetiek';

export type Specialty = { id: SpecialtyId; name: string; siteName: string; lead: string };

export const SPECIALTIES: Specialty[] = [
  { id: 'algemeen', name: 'Algemene tandheelkunde', siteName: 'General Dentistry', lead: 'Controle, reiniging, foto’s en vullingen.' },
  { id: 'kinderen', name: 'Kindertandheelkunde', siteName: 'Pediatric Dentistry', lead: 'Rustig, speels en op hun tempo.' },
  { id: 'cosmetisch', name: 'Cosmetische tandheelkunde', siteName: 'Cosmetic Dentistry', lead: 'Facings, Hollywood smile, tandvlees en spleetjes.' },
  { id: 'orthodontie', name: 'Orthodontie', siteName: 'Orthodontics', lead: 'Beugels, uitneembare apparaatjes en retainers.' },
  { id: 'chirurgie', name: 'Mondchirurgie', siteName: 'Oral Surgery', lead: 'Trekken, verstandskiezen en botopbouw.' },
  { id: 'endodontie', name: 'Endodontie', siteName: 'Endodontics', lead: 'Wortelkanaalbehandelingen die je tand redden.' },
  { id: 'prothetiek', name: 'Prothetiek & implantaten', siteName: 'Prosthodontics and Dental Implants', lead: 'Kronen, bruggen, prothesen en implantaten.' },
];

export const specialtyById = (id: SpecialtyId) => SPECIALTIES.find((s) => s.id === id) ?? SPECIALTIES[0];

/** The 3D explainers the app can play for a treatment. */
export type ExplainerId = 'implantaat' | 'wortelkanaal' | 'kroon' | 'facing' | 'vulling' | 'beugel';

export type CareKind = 'do' | 'dont' | 'eat' | 'med' | 'check' | 'rest';

/** One moment in the aftercare: minutes after the treatment ended. */
export type AfterStep = { at: number; title: string; text: string; kind: CareKind };

/** One thing to do before: minutes before the appointment starts. */
export type BeforeStep = { at: number; title: string; text: string };

export type EatPhase = { from: number; label: string; foods: string[]; avoid?: string[] };

export type CarePlan = {
  before: BeforeStep[];
  after: AfterStep[];
  normal: string[];
  call: string[];
  urgent: string[];
  eat: EatPhase[];
  /** Minutes until a local anaesthetic usually wears off, when one is used. */
  numbing?: number;
  recovery: string;
};

export type Consent = { why: string; alternatives: string[]; risks: string[] };

export type Treatment = {
  id: string;
  specialty: SpecialtyId;
  name: string;
  /** The English name on elitesmile.nl. */
  siteName: string;
  short: string;
  what: string;
  /** Typical chair time in minutes (demo). */
  minutes: number;
  /** How many visits it usually takes. */
  visits: string;
  doctors: DoctorId[];
  care: CareId;
  consent?: Consent;
  explainer?: ExplainerId;
  /** The site's offer: the check-up is free. */
  free?: boolean;
  kids?: boolean;
};

const D = 24 * 60;

const STANDARD_BEFORE: BeforeStep[] = [
  { at: 3 * D, title: 'Vragenlijst bijwerken', text: 'Geef in de app door welke medicijnen je gebruikt en waar je allergisch voor bent. Is er niets veranderd, dan bevestig je het met één tik.' },
  { at: 45, title: 'Meenemen', text: 'Je identiteitsbewijs en je zorgpas. Kom tien minuten eerder.' },
  { at: 30, title: 'Even poetsen', text: 'Poets je tanden thuis, dan kan de tandarts alles goed zien.' },
];

const NUMB_EAT: EatPhase = { from: 0, label: 'Zolang je verdoofd bent', foods: ['Niets eten', 'Alleen lauw of koud drinken'], avoid: ['Heet drinken', 'Kauwen'] };

const SURGERY_URGENT = [
  'Zwelling waardoor slikken of ademen moeilijk wordt',
  'Hevig bloeden dat niet stopt',
  'Benauwdheid of een zware allergische reactie',
];

export type CareId =
  | 'controle'
  | 'reiniging'
  | 'rontgen'
  | 'vulling'
  | 'kind-vulling'
  | 'pulpa-kind'
  | 'fluoride'
  | 'ruimtebehouder'
  | 'facings'
  | 'gingiva'
  | 'bonding'
  | 'beugel'
  | 'uitneembaar'
  | 'retainer'
  | 'extractie'
  | 'implantaat'
  | 'bot'
  | 'wortelkanaal'
  | 'kroon'
  | 'prothese'
  | 'bleken';

const EXTRACTION_AFTER: AfterStep[] = [
  { at: 0, title: 'Bijt op het gaasje', text: 'Bijt 30 minuten stevig door. Bloedt het daarna nog, neem een schoon gaasje en bijt nog 30 minuten.', kind: 'do' },
  { at: 5, title: 'Koelen', text: 'Koel je wang van buiten met een koud kompres: 10 minuten erop, 10 minuten eraf, de eerste uren.', kind: 'do' },
  { at: 30, title: 'Niet spoelen', text: 'De eerste 24 uur niet spoelen, niet hard spugen en niet door een rietje drinken. Het bloedstolsel moet blijven zitten.', kind: 'dont' },
  { at: 60, title: 'Niet roken', text: 'Rook minstens 72 uur niet. Roken vertraagt de genezing en geeft kans op een droge kom.', kind: 'dont' },
  { at: 180, title: 'Gevoel terug? Eten mag', text: 'Eet pas als de verdoving is uitgewerkt. Kies lauw, zacht eten en kauw aan de andere kant.', kind: 'eat' },
  { at: 240, title: 'Pijnstilling', text: 'Neem de pijnstiller die je tandarts adviseerde, volgens het voorschrift of de bijsluiter.', kind: 'med' },
  { at: 600, title: 'Slapen', text: 'Leg je hoofd de eerste nacht wat hoger, met een extra kussen.', kind: 'rest' },
  { at: D, title: 'Zout water', text: 'Spoel vanaf vandaag na het eten voorzichtig met lauw zout water: een halve theelepel zout in een glas.', kind: 'do' },
  { at: D + 30, title: 'Gewoon poetsen', text: 'Poets je tanden zoals altijd, maar voorzichtig rond de wond.', kind: 'do' },
  { at: 3 * D, title: 'Dag 3: hoe gaat het?', text: 'Zwelling en pijn horen nu af te nemen. Wordt de pijn juist erger, bel dan de kliniek.', kind: 'check' },
];

const EXTRACTION_EAT: EatPhase[] = [
  NUMB_EAT,
  { from: 180, label: 'Eerste dag', foods: ['Koele yoghurt', 'Vla', 'Smoothie met een lepel', 'Lauwe soep'], avoid: ['Rietje', 'Heet', 'Alcohol'] },
  { from: D, label: 'Dag 2 en 3', foods: ['Havermout', 'Puree', 'Omelet', 'Zachte pasta', 'Banaan'], avoid: ['Nootjes', 'Chips', 'Harde korsten', 'Pittig'] },
  { from: 3 * D, label: 'Vanaf dag 4', foods: ['Gewoon eten', 'Kauw nog even aan de andere kant'] },
];

export const CARE: Record<CareId, CarePlan> = {
  controle: {
    before: STANDARD_BEFORE,
    after: [
      { at: 0, title: 'Klaar', text: 'Je ziet de bevindingen van de tandarts in de app, met je gebit in 3D.', kind: 'check' },
      { at: 60, title: 'Volgende controle', text: 'Elite Smile raadt een controle en reiniging elke zes maanden aan. De app herinnert je eraan.', kind: 'check' },
    ],
    normal: [],
    call: ['Je hebt ergens pijn die er bij de controle nog niet was'],
    urgent: [],
    eat: [],
    recovery: 'Geen herstel nodig.',
  },
  reiniging: {
    before: STANDARD_BEFORE,
    after: [
      { at: 0, title: 'Gevoelig is normaal', text: 'Je tandvlees kan wat bloeden en je tanden kunnen gevoelig zijn voor koud. Dat trekt in een paar dagen weg.', kind: 'check' },
      { at: 120, title: 'Blijf ragen', text: 'Gebruik elke dag ragers of floss. Bloedend tandvlees wordt daar juist beter van.', kind: 'do' },
    ],
    normal: ['Een beetje bloedend tandvlees', 'Gevoelig voor koud, een paar dagen'],
    call: ['Het tandvlees blijft na een week nog bloeden of is erg pijnlijk'],
    urgent: [],
    eat: [],
    recovery: 'Meteen weer alles doen.',
  },
  rontgen: {
    before: [{ at: 3 * D, title: 'Zwanger?', text: 'Ben je zwanger of denk je het te zijn, zeg het dan vooraf. Dan kijken we of de foto kan wachten.' }, ...STANDARD_BEFORE.slice(1)],
    after: [{ at: 0, title: 'Je foto’s', text: 'Zodra de tandarts ze heeft bekeken, staan ze met uitleg in Mijn gebit.', kind: 'check' }],
    normal: [],
    call: [],
    urgent: [],
    eat: [],
    recovery: 'Geen nazorg.',
  },
  vulling: {
    before: [...STANDARD_BEFORE, { at: 90, title: 'Eet vooraf iets', text: 'Na de behandeling ben je een paar uur verdoofd. Eet daarom vooraf rustig iets.' }],
    after: [
      { at: 0, title: 'Pas op met eten', text: 'Eet niets en drink niets heets zolang je verdoofd bent. Je kunt op je lip of wang bijten zonder het te voelen.', kind: 'dont' },
      { at: 150, title: 'Eten mag weer', text: 'Een witte vulling is meteen hard. Je mag eten zodra het gevoel terug is.', kind: 'eat' },
      { at: D, title: 'Gevoelig voor koud', text: 'Wat gevoeligheid voor koud of zoet is normaal en zakt binnen een paar weken.', kind: 'check' },
    ],
    normal: ['Gevoelig voor koud of zoet, een paar weken', 'Een vreemd gevoel met je tong, de eerste dagen'],
    call: ['Je beet voelt te hoog', 'Er zit een scherp randje', 'Pijn die niet minder wordt'],
    urgent: [],
    eat: [NUMB_EAT, { from: 150, label: 'Daarna', foods: ['Gewoon eten'] }],
    numbing: 150,
    recovery: 'Dezelfde dag.',
  },
  'kind-vulling': {
    before: [
      { at: 2 * D, title: 'Vertel het goed', text: 'Zeg dat de tandarts een gaatje gaat “schoonmaken en dichtmaken”. Vermijd woorden als prik en pijn.' },
      { at: D, title: 'Lees het verhaal', text: 'Lees samen het verhaal van de eerste afspraak in de Kinderhoek van de app.' },
      { at: 60, title: 'Lievelingsknuffel mee', text: 'Een knuffel mag mee in de stoel. Eet vooraf iets.' },
      ...STANDARD_BEFORE.slice(1, 2),
    ],
    after: [
      { at: 0, title: 'Let op de lip', text: 'Kinderen bijten soms op hun verdoofde lip of wang zonder het te merken. Houd je kind in de gaten tot het gevoel terug is.', kind: 'dont' },
      { at: 150, title: 'Eten mag weer', text: 'Zodra het gevoel terug is, mag je kind gewoon eten.', kind: 'eat' },
      { at: 160, title: 'Sticker verdiend', text: 'Je kind krijgt een sticker in de Kinderhoek. Goed gedaan!', kind: 'check' },
    ],
    normal: ['Een dikke, vreemde lip, een paar uur', 'Wat gevoeligheid voor koud'],
    call: ['Je kind heeft op de lip gebeten en die is gezwollen', 'Pijn die niet minder wordt'],
    urgent: [],
    eat: [NUMB_EAT, { from: 150, label: 'Daarna', foods: ['Gewoon eten'] }],
    numbing: 150,
    recovery: 'Dezelfde dag.',
  },
  'pulpa-kind': {
    before: [
      { at: 2 * D, title: 'Vertel het goed', text: 'Zeg dat de tandarts de tand “van binnen schoonmaakt”. Vermijd woorden als prik en pijn.' },
      { at: 60, title: 'Eet vooraf', text: 'Je kind is na de behandeling een paar uur verdoofd. Laat het vooraf iets eten.' },
      ...STANDARD_BEFORE.slice(1, 2),
    ],
    after: [
      { at: 0, title: 'Let op de lip', text: 'Houd je kind in de gaten tot het gevoel terug is: niet op de lip of wang bijten.', kind: 'dont' },
      { at: 180, title: 'Zacht eten', text: 'Vandaag zacht eten en niet op de behandelde tand bijten.', kind: 'eat' },
      { at: D, title: 'Een beetje gevoelig', text: 'De tand kan een dag of twee gevoelig zijn. Geef zo nodig paracetamol voor kinderen volgens de bijsluiter.', kind: 'med' },
    ],
    normal: ['Gevoelig bij bijten, een of twee dagen'],
    call: ['Zwelling bij de tand of in het gezicht', 'Koorts', 'Het kroontje of de vulling is eruit'],
    urgent: SURGERY_URGENT.slice(0, 1),
    eat: [NUMB_EAT, { from: 180, label: 'Vandaag', foods: ['Pap', 'Yoghurt', 'Pasta', 'Banaan'] }],
    numbing: 180,
    recovery: 'Een of twee dagen.',
  },
  fluoride: {
    before: STANDARD_BEFORE.slice(1),
    after: [
      { at: 0, title: 'Half uur niets', text: 'Het eerste half uur niet eten en niet drinken.', kind: 'dont' },
      { at: 30, title: 'Zacht eten', text: 'De rest van de dag zacht eten, geen harde of kleverige dingen.', kind: 'eat' },
      { at: 12 * 60, title: 'Morgen weer poetsen', text: 'Poets pas morgenochtend weer, dan werkt de fluoride het langst.', kind: 'do' },
    ],
    normal: ['Tanden voelen even ruw of geel aan'],
    call: [],
    urgent: [],
    eat: [{ from: 0, label: 'Eerste half uur', foods: ['Niets'] }, { from: 30, label: 'Rest van de dag', foods: ['Zacht eten', 'Lauw drinken'], avoid: ['Hard', 'Kleverig'] }],
    recovery: 'Meteen.',
  },
  ruimtebehouder: {
    before: STANDARD_BEFORE.slice(1),
    after: [
      { at: 0, title: 'Even wennen', text: 'De ruimtebehouder voelt de eerste dagen vreemd. Dat went snel.', kind: 'check' },
      { at: 60, title: 'Geen kleverig snoep', text: 'Toffees, kauwgom en drop kunnen hem lostrekken.', kind: 'dont' },
      { at: 12 * 60, title: 'Goed poetsen', text: 'Poets er elke avond goed omheen, ook aan de binnenkant.', kind: 'do' },
    ],
    normal: ['Een vreemd gevoel, de eerste dagen'],
    call: ['Hij zit los of is verbogen', 'Het tandvlees eronder is rood of pijnlijk'],
    urgent: [],
    eat: [{ from: 0, label: 'Altijd', foods: ['Gewoon eten'], avoid: ['Toffees', 'Kauwgom', 'Harde snoepjes'] }],
    recovery: 'Meteen.',
  },
  facings: {
    before: [
      { at: 21 * D, title: 'Eerst bleken?', text: 'Facings verkleuren niet mee. Wil je je eigen tanden lichter, laat ze dan eerst bleken en kies daarna de kleur.' },
      { at: 7 * D, title: 'Proefglimlach', text: 'Je ziet vooraf een proefversie in je mond en kiest samen de vorm en de kleur.' },
      ...STANDARD_BEFORE,
    ],
    after: [
      { at: 0, title: 'Gevoelig', text: 'Je tanden kunnen een paar dagen gevoelig zijn voor koud en warm.', kind: 'check' },
      { at: 60, title: 'Niet op harde dingen bijten', text: 'Bijt niet op nagels, pennen of ijs en open geen verpakkingen met je tanden.', kind: 'dont' },
      { at: D, title: 'Gewoon poetsen', text: 'Poets en raag zoals altijd. Een niet-schurende tandpasta houdt de glans langer.', kind: 'do' },
      { at: 14 * D, title: 'Controle', text: 'Na twee weken kijkt de tandarts of alles goed past en je beet klopt.', kind: 'check' },
    ],
    normal: ['Gevoelig voor koud en warm, een paar dagen', 'Even wennen aan de nieuwe vorm'],
    call: ['Een facing zit los of er is een stukje af', 'Je beet voelt niet goed'],
    urgent: [],
    eat: [{ from: 0, label: 'Voortaan', foods: ['Gewoon eten', 'Snij harde dingen in stukjes'], avoid: ['Afbijten van harde dingen met je voortanden'] }],
    numbing: 150,
    recovery: 'Meteen, met een paar dagen gevoeligheid.',
  },
  gingiva: {
    before: STANDARD_BEFORE,
    after: [
      { at: 0, title: 'Gevoelig tandvlees', text: 'Je tandvlees kan een paar dagen gevoelig zijn. Neem zo nodig de pijnstiller die je tandarts adviseerde.', kind: 'med' },
      { at: 180, title: 'Zacht en lauw', text: 'Eet twee dagen zacht en lauw, en niets pittigs of zuurs.', kind: 'eat' },
      { at: D, title: 'Zacht poetsen', text: 'Poets met een zachte borstel en ga rustig langs de tandvleesrand.', kind: 'do' },
    ],
    normal: ['Gevoelig of wat gezwollen tandvlees, een paar dagen'],
    call: ['Het blijft bloeden', 'Pijn die na drie dagen erger wordt'],
    urgent: [],
    eat: [NUMB_EAT, { from: 180, label: 'Twee dagen', foods: ['Pasta', 'Rijst', 'Yoghurt', 'Soep'], avoid: ['Pittig', 'Zuur', 'Heet'] }],
    numbing: 150,
    recovery: 'Een paar dagen.',
  },
  bonding: {
    before: STANDARD_BEFORE,
    after: [
      { at: 0, title: 'Meteen hard', text: 'Het composiet is meteen hard; je mag gewoon eten.', kind: 'eat' },
      { at: 60, title: 'Niet op harde dingen bijten', text: 'Bijt niet op nagels, pennen of ijs; composiet kan dan afschilferen.', kind: 'dont' },
      { at: D, title: 'Kleur houden', text: 'Spoel na koffie, thee of rode wijn even met water; zo blijft het composiet langer mooi.', kind: 'do' },
    ],
    normal: ['Even wennen met je tong'],
    call: ['Er is een stukje af', 'Een scherp randje'],
    urgent: [],
    eat: [{ from: 0, label: 'Voortaan', foods: ['Gewoon eten'], avoid: ['Afbijten van harde dingen'] }],
    recovery: 'Meteen.',
  },
  beugel: {
    before: [
      { at: 14 * D, title: 'Gebitsreiniging', text: 'Een schoon gebit voor de beugel erop gaat: plan een reiniging als die langer dan een half jaar geleden is.' },
      { at: 3 * D, title: 'Spullen in huis', text: 'Een beugeltandenborstel, ragers en orthodontische wax.' },
      ...STANDARD_BEFORE.slice(1),
    ],
    after: [
      { at: 0, title: 'Gevoelig is normaal', text: 'De eerste 3 tot 5 dagen zijn je tanden gevoelig. Zacht eten helpt.', kind: 'check' },
      { at: 30, title: 'Wax', text: 'Schuurt een slotje? Druk er een bolletje wax op.', kind: 'do' },
      { at: 180, title: 'Na elke maaltijd poetsen', text: 'Poets na elke maaltijd, ook tussen draad en tand, met een rager.', kind: 'do' },
      { at: 240, title: 'Wat niet mag', text: 'Geen kauwgom, toffees, harde snoepjes of nootjes. Snij appels en stokbrood in kleine stukjes.', kind: 'dont' },
    ],
    normal: ['Gevoelige tanden, 3 tot 5 dagen na elke controle', 'Schuren aan de binnenkant van je wangen'],
    call: ['Een slotje zit los', 'Een draad prikt: dek hem af met wax tot je afspraak'],
    urgent: [],
    eat: [
      { from: 0, label: 'Eerste dagen', foods: ['Pasta', 'Soep', 'Yoghurt', 'Gekookte groente'] },
      { from: 5 * D, label: 'Voortaan', foods: ['Bijna alles, in kleine stukjes'], avoid: ['Kauwgom', 'Toffees', 'Harde snoepjes', 'Nootjes', 'Hele appels'] },
    ],
    recovery: 'Een paar dagen wennen.',
  },
  uitneembaar: {
    before: STANDARD_BEFORE.slice(1),
    after: [
      { at: 0, title: 'Draagtijd', text: 'Draag hem zo veel uur per dag als je tandarts zei. De app telt mee.', kind: 'do' },
      { at: 60, title: 'Uit bij het eten', text: 'Haal hem uit om te eten, tenzij je tandarts iets anders zegt, en leg hem altijd in zijn doosje.', kind: 'do' },
      { at: 12 * 60, title: 'Schoonmaken', text: 'Maak hem elke dag schoon met een tandenborstel en koud of lauw water. Nooit heet water.', kind: 'do' },
    ],
    normal: ['Praten voelt de eerste dagen anders', 'Een strak gevoel na het indoen'],
    call: ['Hij past niet meer of is gebroken', 'Hij drukt pijnlijk op het tandvlees'],
    urgent: [],
    eat: [{ from: 0, label: 'Altijd', foods: ['Gewoon eten, zonder apparaatje'] }],
    recovery: 'Een paar dagen wennen.',
  },
  retainer: {
    before: STANDARD_BEFORE.slice(1),
    after: [
      { at: 0, title: 'Elke nacht', text: 'Zonder retainer schuiven tanden langzaam terug. Draag hem zoals je tandarts zei, meestal elke nacht.', kind: 'do' },
      { at: 12 * 60, title: 'Vaste retainer', text: 'Een vaste draad achter je tanden? Raag er elke dag onderdoor.', kind: 'do' },
    ],
    normal: ['Een strak gevoel als je hem een nacht vergat'],
    call: ['De vaste draad zit los', 'De uitneembare retainer past niet meer'],
    urgent: [],
    eat: [],
    recovery: 'Meteen.',
  },
  extractie: {
    before: [
      { at: 7 * D, title: 'Bloedverdunners?', text: 'Gebruik je bloedverdunners, geef het door in de vragenlijst. Stop er nooit zelf mee: de tandarts overlegt wat nodig is.' },
      { at: D, title: 'Thuis klaarzetten', text: 'De pijnstiller die je tandarts adviseert, een koud kompres en zacht eten zoals yoghurt, soep en havermout.' },
      { at: D, title: 'Geen alcohol', text: 'Drink 24 uur vooraf geen alcohol en rook liever niet.' },
      { at: 120, title: 'Eet iets lichts', text: 'Je bent na afloop een paar uur verdoofd. Eet daarom vooraf rustig iets.' },
      ...STANDARD_BEFORE.slice(1, 2),
    ],
    after: EXTRACTION_AFTER,
    normal: ['Een beetje bloed in je speeksel, de eerste dag', 'Zwelling die op dag 2 tot 3 het grootst is', 'Een stijve kaak en pijn die elke dag minder wordt', 'Een blauwe plek op je wang'],
    call: [
      'Het blijft bloeden na twee keer 30 minuten op een gaasje bijten',
      'De pijn wordt na dag 3 erger in plaats van minder',
      'Koorts boven 38,5 °C',
      'De zwelling neemt na dag 3 nog toe',
      'Een vieze smaak of pus',
      'Je lip of tong is de volgende dag nog gevoelloos',
    ],
    urgent: SURGERY_URGENT,
    eat: EXTRACTION_EAT,
    numbing: 180,
    recovery: 'De meeste mensen werken de volgende dag weer; de wond is in 1 tot 2 weken dicht.',
  },
  implantaat: {
    before: [
      { at: 14 * D, title: 'Stop zo mogelijk met roken', text: 'Roken vergroot de kans dat een implantaat niet vastgroeit. Stop liefst twee weken vooraf en de weken erna.' },
      { at: 7 * D, title: 'Bloedverdunners?', text: 'Gebruik je bloedverdunners of medicijnen voor je botten, geef het door. Stop er nooit zelf mee.' },
      { at: D, title: 'Antibiotica?', text: 'Heeft je tandarts antibiotica voorgeschreven, neem ze precies zoals afgesproken.' },
      { at: D, title: 'Plan rust', text: 'Plan een rustige dag na de ingreep, geen zware sport voor 48 uur, en zet zacht eten en een koud kompres klaar.' },
      { at: 120, title: 'Eet iets lichts', text: 'Je bent na afloop een paar uur verdoofd. Eet vooraf rustig iets en neem je gewone medicijnen, tenzij anders afgesproken.' },
      ...STANDARD_BEFORE.slice(1, 2),
    ],
    after: [
      ...EXTRACTION_AFTER.slice(0, 2),
      { at: 15, title: 'Niet aankomen', text: 'Raak de plek niet aan met je tong of vingers en kauw er niet op.', kind: 'dont' },
      ...EXTRACTION_AFTER.slice(2, 8),
      { at: D + 60, title: 'Spoelmiddel', text: 'Heeft je tandarts chloorhexidine voorgeschreven: spoel twee keer per dag één minuut, vanaf vandaag.', kind: 'med' },
      { at: 2 * D, title: 'Geen zware sport', text: 'De eerste 48 uur geen zware inspanning; daarna rustig opbouwen.', kind: 'rest' },
      EXTRACTION_AFTER[9],
      { at: 7 * D, title: 'Hechtingen', text: 'Na 7 tot 14 dagen worden de hechtingen verwijderd en kijkt de tandarts hoe het geneest.', kind: 'check' },
    ],
    normal: ['Zwelling en een blauwe plek, het grootst op dag 2 tot 3', 'Een beetje bloed in je speeksel, de eerste dag', 'Pijn die elke dag minder wordt', 'Een hechtdraadje dat je met je tong voelt'],
    call: [
      'Het blijft bloeden na twee keer 30 minuten op een gaasje bijten',
      'De pijn wordt na dag 3 erger in plaats van minder',
      'Koorts boven 38,5 °C',
      'Het implantaat of het schroefje erop voelt los',
      'Je lip of kin blijft de volgende dag gevoelloos of tintelt',
    ],
    urgent: SURGERY_URGENT,
    eat: [...EXTRACTION_EAT.slice(0, 3), { from: 7 * D, label: 'Vanaf week 2', foods: ['Gewoon eten', 'Kauw niet op het implantaat tot de kroon erop zit'] }],
    numbing: 180,
    recovery: 'De wond is in 1 tot 2 weken dicht. Het implantaat groeit in 3 tot 6 maanden vast in het bot; daarna komt de kroon.',
  },
  bot: {
    before: [
      { at: 14 * D, title: 'Stop zo mogelijk met roken', text: 'Roken maakt de kans kleiner dat het nieuwe bot goed ingroeit.' },
      { at: 7 * D, title: 'Bloedverdunners?', text: 'Gebruik je bloedverdunners of medicijnen voor je botten, geef het door. Stop er nooit zelf mee.' },
      { at: D, title: 'Plan rust', text: 'Plan een rustige dag en zet zacht eten en een koud kompres klaar.' },
      { at: 120, title: 'Eet iets lichts', text: 'Je bent na afloop een paar uur verdoofd. Eet vooraf rustig iets.' },
      ...STANDARD_BEFORE.slice(1, 2),
    ],
    after: [
      ...EXTRACTION_AFTER.slice(0, 8),
      { at: D + 60, title: 'Korreltjes', text: 'Een paar kleine korreltjes in je mond de eerste dagen is normaal.', kind: 'check' },
      { at: D + 90, title: 'Bovenkaak?', text: 'Was het in de bovenkaak: snuit je neus een week niet hard en nies met je mond open.', kind: 'dont' },
      EXTRACTION_AFTER[9],
      { at: 10 * D, title: 'Hechtingen', text: 'Na 10 tot 14 dagen kijkt de tandarts hoe het geneest en haalt de hechtingen weg.', kind: 'check' },
    ],
    normal: ['Zwelling en een blauwe plek, het grootst op dag 2 tot 3', 'Kleine korreltjes in je mond', 'Pijn die elke dag minder wordt'],
    call: ['Het blijft bloeden na twee keer 30 minuten op een gaasje bijten', 'De pijn wordt na dag 3 erger', 'Koorts boven 38,5 °C', 'Er komen veel korreltjes uit of de wond gaat open'],
    urgent: SURGERY_URGENT,
    eat: EXTRACTION_EAT,
    numbing: 180,
    recovery: 'De wond is in 2 weken dicht; het bot heeft enkele maanden nodig.',
  },
  wortelkanaal: {
    before: [
      { at: D, title: 'Neem de tijd', text: 'Een behandeling duurt 60 tot 90 minuten. Soms zijn er twee afspraken nodig.' },
      { at: 120, title: 'Eet vooraf', text: 'Je bent na afloop een paar uur verdoofd. Eet vooraf iets.' },
      ...STANDARD_BEFORE.slice(1),
    ],
    after: [
      { at: 0, title: 'Verdoofd', text: 'Eet en drink niets heets zolang je verdoofd bent.', kind: 'dont' },
      { at: 180, title: 'Voorzichtig kauwen', text: 'Eet als het gevoel terug is, maar kauw niet hard op de behandelde tand.', kind: 'eat' },
      { at: 240, title: 'Gevoelig bij bijten', text: 'De tand kan een paar dagen gevoelig zijn bij bijten. Dat is normaal; neem zo nodig de pijnstiller die je tandarts adviseerde.', kind: 'med' },
      { at: D, title: 'Tijdelijke vulling', text: 'Vermijd kauwgom, toffees en harde dingen tot de definitieve vulling of kroon erin zit.', kind: 'dont' },
      { at: 14 * D, title: 'Kroon plannen', text: 'Een tand na een wortelkanaalbehandeling is brozer. Vaak is een kroon nodig: plan die op tijd.', kind: 'check' },
    ],
    normal: ['Gevoelig bij bijten, een paar dagen', 'Een doffe pijn die snel afneemt'],
    call: ['Zwelling in je gezicht of je tandvlees', 'Pijn die na 3 dagen erger wordt', 'De tijdelijke vulling is eruit', 'Je beet voelt te hoog'],
    urgent: SURGERY_URGENT.slice(0, 1),
    eat: [NUMB_EAT, { from: 180, label: 'Tot de kroon of vulling', foods: ['Kauw aan de andere kant'], avoid: ['Kauwgom', 'Toffees', 'Nootjes', 'Harde korsten'] }],
    numbing: 180,
    recovery: 'Een paar dagen gevoelig; daarna een vulling of kroon.',
  },
  kroon: {
    before: [
      { at: 7 * D, title: 'Twee afspraken', text: 'Eerst wordt de tand geslepen en gescand; de kroon komt meestal bij een tweede afspraak.' },
      ...STANDARD_BEFORE,
    ],
    after: [
      { at: 0, title: 'Tijdelijke kroon', text: 'Geen kauwgom of toffees. Floss voorzichtig en trek de draad er zijwaarts uit, niet omhoog.', kind: 'dont' },
      { at: 180, title: 'Eten mag weer', text: 'Eet als het gevoel terug is, en kauw rustig.', kind: 'eat' },
      { at: D, title: 'Even wennen', text: 'Een nieuwe kroon kan een paar dagen gevoelig zijn en vreemd aanvoelen.', kind: 'check' },
    ],
    normal: ['Gevoelig voor koud, een paar dagen', 'Even wennen met je tong'],
    call: ['De (tijdelijke) kroon zit los of is eraf', 'Je beet voelt te hoog'],
    urgent: [],
    eat: [NUMB_EAT, { from: 180, label: 'Met een tijdelijke kroon', foods: ['Gewoon eten, rustig kauwen'], avoid: ['Kauwgom', 'Toffees', 'Harde snoepjes'] }],
    numbing: 180,
    recovery: 'Dezelfde dag.',
  },
  prothese: {
    before: [
      { at: 7 * D, title: 'Meerdere afspraken', text: 'Een prothese wordt in een paar stappen gemaakt: afdrukken, beet, passen en plaatsen.' },
      ...STANDARD_BEFORE.slice(0, 2),
    ],
    after: [
      { at: 0, title: 'Wennen', text: 'Praten en eten gaan de eerste weken anders. Begin met zacht eten in kleine stukjes.', kind: 'eat' },
      { at: D, title: 'Drukplekken', text: 'Een pijnlijke plek? Bel de kliniek, dan passen we de prothese aan.', kind: 'check' },
      { at: D + 60, title: 'Elke dag schoonmaken', text: 'Met een protheseborstel en water of milde zeep, niet met tandpasta.', kind: 'do' },
      { at: D + 600, title: '’s Nachts', text: 'Haal hem ’s nachts uit, tenzij je tandarts iets anders zegt, en bewaar hem in een bakje water.', kind: 'rest' },
    ],
    normal: ['Meer speeksel de eerste dagen', 'Praten klinkt even anders', 'Wat drukplekjes in de eerste weken'],
    call: ['Een drukplek die niet overgaat', 'De prothese zit los of is gebroken'],
    urgent: [],
    eat: [{ from: 0, label: 'Eerste weken', foods: ['Zacht eten in kleine stukjes', 'Kauw aan twee kanten tegelijk'], avoid: ['Taai vlees', 'Kleverig snoep'] }],
    recovery: 'Een paar weken wennen.',
  },
  bleken: {
    before: [
      { at: 14 * D, title: 'Eerst controle en reiniging', text: 'Bleken werkt het best op een schoon, gezond gebit.' },
      { at: 7 * D, title: 'Zwanger of borstvoeding?', text: 'Dan bleken we niet. Geef het door in de vragenlijst.' },
      { at: 7 * D, title: 'Vullingen bleken niet mee', text: 'Witte vullingen, kronen en facings houden hun kleur. De tandarts bespreekt wat dat voor jou betekent.' },
      ...STANDARD_BEFORE.slice(1),
    ],
    after: [
      { at: 0, title: 'Gevoelig is normaal', text: 'Gevoelige tanden de eerste 24 tot 48 uur zijn normaal. Een tandpasta voor gevoelige tanden helpt.', kind: 'check' },
      { at: 5, title: 'Wit dieet, 48 uur', text: 'Geen koffie, thee, rode wijn, cola, curry of tomatensaus, en niet roken.', kind: 'dont' },
      { at: 2 * D, title: 'Kleur meten', text: 'Na twee dagen is de kleur stabiel. Leg hem vast in de Glimlach-studio.', kind: 'check' },
    ],
    normal: ['Gevoelig voor koud, 24 tot 48 uur', 'Kleine witte vlekjes die binnen een dag wegtrekken'],
    call: ['Gevoeligheid die na drie dagen niet minder wordt', 'Wit of pijnlijk tandvlees'],
    urgent: [],
    eat: [{ from: 0, label: 'Wit dieet, 48 uur', foods: ['Kip', 'Rijst', 'Pasta met witte saus', 'Witte vis', 'Melk', 'Water'], avoid: ['Koffie', 'Thee', 'Rode wijn', 'Cola', 'Curry', 'Tomatensaus', 'Bessen'] }],
    recovery: 'Meteen, met een of twee dagen gevoeligheid.',
  },
};

const ALL_GENERAL: DoctorId[] = ['najla', 'mahmoud', 'ahmad'];

export const TREATMENTS: Treatment[] = [
  // ------------------------------------------------------------------------------------------ algemeen
  { id: 'controle', specialty: 'algemeen', name: 'Mondonderzoek & diagnose', siteName: 'Dental Examination and Diagnosis', short: 'Gratis controle voor nieuwe patiënten', what: 'De tandarts kijkt je hele mond na: tanden, tandvlees, kaak en slijmvliezen, en bespreekt wat hij of zij ziet.', minutes: 30, visits: 'Eén afspraak, elk half jaar', doctors: ALL_GENERAL, care: 'controle', free: true },
  { id: 'reiniging', specialty: 'algemeen', name: 'Professionele gebitsreiniging', siteName: 'Professional Dental Cleaning (Scaling and Calculus Removal)', short: 'Tandsteen en plak weg', what: 'Tandsteen en plak worden boven en onder het tandvlees verwijderd. Goed tegen tandvleesontsteking en een frisse adem.', minutes: 40, visits: 'Elk half jaar', doctors: ALL_GENERAL, care: 'reiniging' },
  { id: 'polijsten', specialty: 'algemeen', name: 'Polijsten', siteName: 'Dental Polishing', short: 'Glad en glanzend', what: 'Na de reiniging worden je tanden glad gepolijst, zodat aanslag minder kans krijgt.', minutes: 15, visits: 'Met de reiniging', doctors: ALL_GENERAL, care: 'reiniging' },
  { id: 'rontgen', specialty: 'algemeen', name: 'Röntgenfoto’s', siteName: 'Dental Radiography (X-rays)', short: 'Wat je met het oog niet ziet', what: 'Kleine foto’s laten gaatjes tussen de tanden en het bot zien; een overzichtsfoto toont je hele gebit en kaak.', minutes: 10, visits: 'Wanneer nodig', doctors: ALL_GENERAL, care: 'rontgen' },
  { id: 'vulling', specialty: 'algemeen', name: 'Gaatjes vullen', siteName: 'Dental Caries Treatment (Restorative Fillings)', short: 'Een witte vulling', what: 'Het aangetaste deel wordt verwijderd en de tand wordt hersteld met een witte vulling in de kleur van je tand.', minutes: 40, visits: 'Eén afspraak', doctors: ALL_GENERAL, care: 'vulling', explainer: 'vulling' },
  // ------------------------------------------------------------------------------------------ kinderen
  { id: 'kind-controle', specialty: 'kinderen', name: 'Kindercontrole', siteName: 'Pediatric Dental Examination', short: 'Spelenderwijs kijken', what: 'Een rustige controle op het tempo van je kind, met uitleg voor jou en een sticker voor je kind.', minutes: 20, visits: 'Elk half jaar', doctors: ['najla', 'mahmoud'], care: 'controle', kids: true },
  { id: 'kind-vulling', specialty: 'kinderen', name: 'Vullingen bij kinderen', siteName: 'Pediatric Dental Fillings', short: 'Klein gaatje, snel dicht', what: 'Een gaatje in een melktand of blijvende tand wordt schoongemaakt en gevuld, rustig en met uitleg.', minutes: 30, visits: 'Eén afspraak', doctors: ['najla', 'mahmoud'], care: 'kind-vulling', kids: true, explainer: 'vulling' },
  { id: 'pulpa-kind', specialty: 'kinderen', name: 'Zenuwbehandeling bij kinderen', siteName: 'Pediatric Pulp Therapy (Root Canal Treatment for Children)', short: 'Een melktand redden', what: 'Is de zenuw van een melktand ontstoken, dan wordt het zieke deel weggehaald zodat de tand kan blijven tot hij vanzelf wisselt.', minutes: 45, visits: 'Eén of twee afspraken', doctors: ['mahmoud', 'buthaina'], care: 'pulpa-kind', kids: true, consent: { why: 'De zenuw van de melktand is ontstoken; zonder behandeling kan de tand pijn doen of gaan ontsteken.', alternatives: ['De tand trekken en een ruimtebehouder plaatsen', 'Afwachten en controleren (alleen als er geen klachten zijn)'], risks: ['De tand kan later toch ontsteken', 'Gevoeligheid de eerste dagen'] } },
  { id: 'fluoride', specialty: 'kinderen', name: 'Fluoride', siteName: 'Fluoride Application', short: 'Sterker glazuur', what: 'Een laagje fluoride maakt het glazuur sterker en helpt gaatjes te voorkomen.', minutes: 10, visits: 'Op advies, vaak twee keer per jaar', doctors: ['najla', 'mahmoud'], care: 'fluoride', kids: true },
  { id: 'ruimtebehouder', specialty: 'kinderen', name: 'Ruimtebehouder', siteName: 'Space Maintainers', short: 'Plek houden voor de blijvende tand', what: 'Gaat een melktand te vroeg verloren, dan houdt een klein apparaatje de ruimte open voor de blijvende tand.', minutes: 30, visits: 'Twee afspraken', doctors: ['mahmoud', 'ayman'], care: 'ruimtebehouder', kids: true },
  // ------------------------------------------------------------------------------------------ cosmetisch
  { id: 'facings', specialty: 'cosmetisch', name: 'Facings', siteName: 'Veneers', short: 'Dunne schilfers voor een nieuwe voorkant', what: 'Dunne schilfers van porselein of composiet worden op de voorkant van je tanden gezet: andere kleur, vorm of stand.', minutes: 90, visits: 'Twee of drie afspraken', doctors: ['buthaina', 'ahmad'], care: 'facings', explainer: 'facing', consent: { why: 'Je wilt de kleur, vorm of stand van je voortanden verbeteren.', alternatives: ['Bleken', 'Composiet opbouwen (bonding)', 'Een beugel voor de stand'], risks: ['Er wordt meestal een dun laagje glazuur weggehaald; dat is niet terug te draaien', 'Gevoeligheid de eerste dagen', 'Een facing kan afbreken of loslaten', 'Na jaren kan vervanging nodig zijn'] } },
  { id: 'hollywood', specialty: 'cosmetisch', name: 'Hollywood smile', siteName: 'Hollywood Smile Makeover', short: 'Je hele glimlach opnieuw ontworpen', what: 'Facings op alle zichtbare tanden, vaak samen met bleken en tandvleescorrectie, op basis van een glimlachontwerp.', minutes: 120, visits: 'Drie of meer afspraken', doctors: ['buthaina'], care: 'facings', explainer: 'facing', consent: { why: 'Je wilt je hele glimlach in kleur, vorm en lijn veranderen.', alternatives: ['Alleen bleken', 'Facings op enkele tanden', 'Orthodontie gevolgd door bonding'], risks: ['Er wordt glazuur weggehaald; dat is niet terug te draaien', 'Gevoeligheid', 'Afbreken of loslaten van een facing', 'Na jaren kan vervanging nodig zijn'] } },
  { id: 'gingiva', specialty: 'cosmetisch', name: 'Tandvleescorrectie', siteName: 'Gingival Aesthetic Treatment (Gum Contouring)', short: 'Een mooie lijn van het tandvlees', what: 'Teveel of ongelijk tandvlees wordt bijgewerkt, zodat je tanden in verhouding zijn en je glimlach rustiger oogt.', minutes: 60, visits: 'Eén afspraak', doctors: ['buthaina'], care: 'gingiva', consent: { why: 'Het tandvlees bedekt een deel van je tanden of loopt ongelijk.', alternatives: ['Niets doen', 'Facings of bonding die de tanden langer maken'], risks: ['Gevoelig tandvlees een paar dagen', 'Het tandvlees kan iets terugkomen'] } },
  { id: 'diastema', specialty: 'cosmetisch', name: 'Spleetjes dichten', siteName: 'Diastema Closure (Closing Gaps Between Teeth)', short: 'Diasteem sluiten', what: 'Een spleetje tussen je tanden wordt gesloten, meestal met composiet in de kleur van je tand, zonder te slijpen.', minutes: 60, visits: 'Eén afspraak', doctors: ['buthaina', 'ahmad'], care: 'bonding', explainer: 'facing', consent: { why: 'Je wilt een spleetje tussen je tanden kwijt.', alternatives: ['Een beugel', 'Facings', 'Niets doen'], risks: ['Composiet kan afschilferen of verkleuren', 'De tanden worden iets breder'] } },
  { id: 'bleken', specialty: 'cosmetisch', name: 'Tanden bleken', siteName: 'Teeth Whitening (FAQ)', short: '30 tot 60 minuten in de stoel', what: 'Een bleekmiddel maakt je eigen tanden lichter; de tandarts beschermt je tandvlees. Soms zijn meer sessies nodig.', minutes: 60, visits: 'Eén of meer sessies', doctors: ['buthaina', 'ahmad'], care: 'bleken', consent: { why: 'Je wilt lichtere tanden.', alternatives: ['Gebitsreiniging en polijsten', 'Facings'], risks: ['Gevoelige tanden, 24 tot 48 uur', 'Vullingen en kronen bleken niet mee', 'De kleur zakt na verloop van tijd iets terug'] } },
  // ------------------------------------------------------------------------------------------ orthodontie
  { id: 'beugel', specialty: 'orthodontie', name: 'Vaste metalen beugel', siteName: 'Fixed Metal Braces', short: 'Slotjes en een draad', what: 'Slotjes op je tanden en een draad zetten je tanden in een paar jaar stap voor stap recht.', minutes: 90, visits: 'Elke 6 tot 8 weken een controle', doctors: ['ayman'], care: 'beugel', explainer: 'beugel', consent: { why: 'Je tanden staan scheef of je beet klopt niet.', alternatives: ['Een uitneembare beugel (bij kinderen)', 'Niets doen'], risks: ['Witte vlekjes als je niet goed poetst', 'Gevoelige tanden na elke controle', 'Zonder retainer schuiven tanden terug', 'Zelden: kortere wortels'] } },
  { id: 'uitneembaar', specialty: 'orthodontie', name: 'Uitneembare beugel', siteName: 'Removable Orthodontic Appliances', short: 'Een plaatje dat je zelf in- en uitdoet', what: 'Een uitneembaar apparaatje stuurt de groei van de kaak of verplaatst tanden, vooral bij kinderen.', minutes: 30, visits: 'Elke 6 tot 8 weken een controle', doctors: ['ayman'], care: 'uitneembaar', kids: true },
  { id: 'retainer', specialty: 'orthodontie', name: 'Retainers', siteName: 'Orthodontic Retainers', short: 'Je rechte tanden houden', what: 'Een vaste draad achter je tanden of een uitneembare retainer houdt het resultaat van je beugel vast.', minutes: 20, visits: 'Eén afspraak, daarna controles', doctors: ['ayman'], care: 'retainer' },
  // ------------------------------------------------------------------------------------------ chirurgie
  { id: 'extractie', specialty: 'chirurgie', name: 'Tand trekken', siteName: 'Tooth Extraction', short: 'Verdoofd en rustig', what: 'Een tand die niet te redden is wordt onder plaatselijke verdoving verwijderd.', minutes: 30, visits: 'Eén afspraak', doctors: ['omar', 'najla', 'mahmoud', 'ahmad'], care: 'extractie', consent: { why: 'De tand is niet meer te redden of zit in de weg.', alternatives: ['Een wortelkanaalbehandeling en een kroon, als dat kan', 'Afwachten (met kans op pijn of ontsteking)'], risks: ['Nabloeden', 'Een droge kom: pijn rond dag 3', 'Zwelling en een blauwe plek', 'Zelden: een gevoelloze lip of tong'] } },
  { id: 'verstandskies', specialty: 'chirurgie', name: 'Verstandskies trekken (niet-chirurgisch)', siteName: 'Non-Surgical Wisdom Tooth Extraction', short: 'Een doorgebroken verstandskies', what: 'Een verstandskies die helemaal is doorgebroken wordt verwijderd zonder het tandvlees open te maken.', minutes: 40, visits: 'Eén afspraak', doctors: ['omar', 'mahmoud'], care: 'extractie', consent: { why: 'De verstandskies geeft klachten of is moeilijk schoon te houden.', alternatives: ['Afwachten en goed schoonhouden', 'Verwijzing naar een kaakchirurg bij een ingesloten kies'], risks: ['Nabloeden en zwelling', 'Een droge kom', 'Zelden: een gevoelloze lip of tong'] } },
  { id: 'bot', specialty: 'chirurgie', name: 'Botopbouw', siteName: 'Bone Grafting', short: 'Genoeg bot voor een implantaat', what: 'Waar te weinig kaakbot is, wordt bot of botvervanger aangebracht, zodat er later een implantaat kan staan.', minutes: 60, visits: 'Eén afspraak, maanden genezing', doctors: ['omar'], care: 'bot', consent: { why: 'Er is te weinig bot voor een implantaat.', alternatives: ['Een kort of smal implantaat, als dat kan', 'Een brug of prothese zonder implantaat'], risks: ['Zwelling en een blauwe plek', 'Het bot groeit niet goed in', 'Ontsteking'] } },
  // ------------------------------------------------------------------------------------------ endodontie
  { id: 'wortelkanaal', specialty: 'endodontie', name: 'Wortelkanaalbehandeling', siteName: 'Root Canal Therapy', short: 'De tand redden', what: 'De ontstoken of afgestorven zenuw wordt verwijderd, de kanalen worden gereinigd en afgesloten. Zo blijft je eigen tand staan.', minutes: 75, visits: 'Eén of twee afspraken', doctors: ['buthaina'], care: 'wortelkanaal', explainer: 'wortelkanaal', consent: { why: 'De zenuw van de tand is ontstoken of afgestorven.', alternatives: ['De tand trekken', 'Afwachten (met kans op pijn en ontsteking)'], risks: ['Gevoelig bij bijten, een paar dagen', 'De ontsteking kan terugkomen', 'De tand wordt brozer; vaak is een kroon nodig', 'Zelden: een afgebroken vijltje in het kanaal'] } },
  { id: 'herbehandeling', specialty: 'endodontie', name: 'Herbehandeling wortelkanaal', siteName: 'Root Canal Retreatment', short: 'Een tweede kans', what: 'Is een eerdere wortelkanaalbehandeling opnieuw ontstoken, dan wordt de oude vulling verwijderd en het kanaal opnieuw gereinigd.', minutes: 90, visits: 'Twee afspraken', doctors: ['buthaina'], care: 'wortelkanaal', explainer: 'wortelkanaal', consent: { why: 'Een eerder behandelde tand is opnieuw ontstoken.', alternatives: ['Een kleine operatie aan de wortelpunt', 'De tand trekken'], risks: ['De ontsteking kan blijven', 'De tand kan breken', 'Gevoelig bij bijten'] } },
  // ------------------------------------------------------------------------------------------ prothetiek
  { id: 'kroon', specialty: 'prothetiek', name: 'Kroon', siteName: 'Dental Crowns', short: 'Een nieuwe buitenkant', what: 'Een kroon omsluit een zwakke of beschadigde tand helemaal en geeft hem zijn vorm en kracht terug.', minutes: 60, visits: 'Twee afspraken', doctors: ['omar', 'ahmad'], care: 'kroon', explainer: 'kroon', consent: { why: 'De tand is te zwak of te beschadigd voor een vulling.', alternatives: ['Een grote vulling', 'Een onlay', 'De tand trekken'], risks: ['De tand wordt geslepen; dat is niet terug te draaien', 'Gevoeligheid', 'Na jaren kan de zenuw afsterven'] } },
  { id: 'brug', specialty: 'prothetiek', name: 'Brug', siteName: 'Dental Bridges', short: 'Een gat overbruggen', what: 'Een brug vult een ontbrekende tand op met een nieuwe tand die vastzit aan de buurtanden.', minutes: 75, visits: 'Twee afspraken', doctors: ['omar'], care: 'kroon', explainer: 'kroon', consent: { why: 'Er ontbreekt een tand.', alternatives: ['Een implantaat', 'Een gedeeltelijke prothese', 'Niets doen'], risks: ['De buurtanden worden geslepen', 'Moeilijker schoon te houden onder de brug'] } },
  { id: 'prothese', specialty: 'prothetiek', name: 'Gedeeltelijke of volledige prothese', siteName: 'Partial and Complete Dentures', short: 'Uitneembare tanden', what: 'Een uitneembare prothese vervangt een paar of alle tanden. Op maat gemaakt in een paar afspraken.', minutes: 45, visits: 'Vier of vijf afspraken', doctors: ['omar', 'ahmad'], care: 'prothese', consent: { why: 'Er ontbreken meerdere of alle tanden.', alternatives: ['Implantaten', 'Een brug (bij enkele tanden)', 'Een klikgebit op implantaten'], risks: ['Drukplekken in de eerste weken', 'Na jaren kan aanpassing nodig zijn'] } },
  { id: 'implantaat', specialty: 'prothetiek', name: 'Implantaat', siteName: 'Dental Implants', short: 'Een nieuwe wortel', what: 'Een titanium schroef in de kaak neemt de plaats in van de wortel. Als hij is vastgegroeid, komt er een kroon op.', minutes: 75, visits: 'Drie of vier afspraken in 3 tot 6 maanden', doctors: ['omar'], care: 'implantaat', explainer: 'implantaat', consent: { why: 'Er ontbreekt een tand en je wilt een vaste vervanging zonder de buurtanden te slijpen.', alternatives: ['Een brug', 'Een gedeeltelijke prothese', 'Niets doen'], risks: ['Zwelling, een blauwe plek en pijn de eerste dagen', 'Het implantaat groeit niet vast (vaker bij roken en diabetes)', 'Ontsteking rond het implantaat', 'Zelden: een gevoelloze lip of kin in de onderkaak'] } },
];

export const treatmentById = (id: string): Treatment => TREATMENTS.find((t) => t.id === id) ?? TREATMENTS[0];

export const careOf = (t: Treatment): CarePlan => CARE[t.care];

/** The six questions on elitesmile.nl, with the site's answers in Dutch. */
export const FAQ: { q: string; a: string }[] = [
  { q: 'Hoe vaak moet ik op controle?', a: 'Voor een gezond gebit raden we elke zes maanden een controle en een reiniging aan. Zo voorkom je problemen voordat ze groot worden. Bij sommige aandoeningen is vaker nodig.' },
  { q: 'Wat levert een professionele reiniging op?', a: 'Plak en tandsteen verdwijnen, tandvleesziekte wordt voorkomen, je adem is frisser en je glimlach helderder. En de tandarts ziet problemen vroeg.' },
  { q: 'Is tanden bleken veilig?', a: 'Ja. Ons bleken is veilig en wordt gedaan door professionals, voor je comfort en het beste resultaat.' },
  { q: 'Is bleken bij de tandarts beter dan een thuisset?', a: 'Meestal effectiever en veiliger: de tandarts gebruikt een sterker middel en beschermt je tandvlees, dus het resultaat is sneller en beter zichtbaar.' },
  { q: 'Wat doe ik bij een noodgeval?', a: 'Bij hevige pijn, een uitgevallen tand of een gebroken vulling: bel de kliniek meteen.' },
  { q: 'Hoe lang duurt een bleeksessie?', a: '30 tot 60 minuten in de stoel. Afhankelijk van je wens en je eigen kleur zijn soms meer sessies nodig.' },
];

/** Health questions the dentist needs before treating, and what each answer means for the chair. */
export type HealthFlag =
  | 'bloedverdunner'
  | 'botmedicijn'
  | 'hartklep'
  | 'diabetes'
  | 'zwanger'
  | 'allergie-penicilline'
  | 'allergie-latex'
  | 'allergie-verdoving'
  | 'allergie-ibuprofen'
  | 'roken'
  | 'bestraling'
  | 'epilepsie'
  | 'astma'
  | 'angst';

export const HEALTH_FLAGS: { id: HealthFlag; question: string; label: string; why: string; severity: 'info' | 'let-op' | 'hoog' }[] = [
  { id: 'bloedverdunner', question: 'Gebruik je bloedverdunners?', label: 'Bloedverdunner', why: 'Belangrijk bij trekken en implantaten. Stop er nooit zelf mee: de tandarts overlegt.', severity: 'hoog' },
  { id: 'botmedicijn', question: 'Gebruik je (of gebruikte je) medicijnen voor je botten, zoals bisfosfonaten?', label: 'Botmedicijn', why: 'Kan de genezing van het kaakbot beïnvloeden na trekken of een implantaat.', severity: 'hoog' },
  { id: 'hartklep', question: 'Heb je een kunsthartklep of ooit een ontsteking van het hart (endocarditis) gehad?', label: 'Hartklep', why: 'Soms zijn vooraf antibiotica nodig.', severity: 'hoog' },
  { id: 'diabetes', question: 'Heb je diabetes?', label: 'Diabetes', why: 'Kan de genezing en het tandvlees beïnvloeden.', severity: 'let-op' },
  { id: 'zwanger', question: 'Ben je zwanger of geef je borstvoeding?', label: 'Zwanger', why: 'Röntgenfoto’s waar mogelijk uitstellen; niet bleken.', severity: 'let-op' },
  { id: 'allergie-penicilline', question: 'Ben je allergisch voor penicilline of andere antibiotica?', label: 'Allergie penicilline', why: 'Een ander antibioticum kiezen.', severity: 'hoog' },
  { id: 'allergie-latex', question: 'Ben je allergisch voor latex?', label: 'Allergie latex', why: 'Latexvrije handschoenen en materialen.', severity: 'hoog' },
  { id: 'allergie-verdoving', question: 'Heb je ooit slecht gereageerd op een verdoving bij de tandarts?', label: 'Reactie op verdoving', why: 'Een ander middel of een andere aanpak.', severity: 'hoog' },
  { id: 'allergie-ibuprofen', question: 'Kun je niet tegen ibuprofen of andere ontstekingsremmers?', label: 'Geen ibuprofen', why: 'Een andere pijnstiller adviseren.', severity: 'let-op' },
  { id: 'roken', question: 'Rook je?', label: 'Roker', why: 'Vertraagt de genezing en vergroot de kans dat een implantaat niet vastgroeit.', severity: 'let-op' },
  { id: 'bestraling', question: 'Ben je bestraald in het hoofd-halsgebied?', label: 'Bestraling hoofd-hals', why: 'Trekken en implantaten vragen dan extra voorzorg.', severity: 'hoog' },
  { id: 'epilepsie', question: 'Heb je epilepsie?', label: 'Epilepsie', why: 'Het team weet wat te doen en houdt er rekening mee.', severity: 'let-op' },
  { id: 'astma', question: 'Heb je astma of COPD?', label: 'Astma', why: 'Neem je inhaler mee naar de afspraak.', severity: 'info' },
  { id: 'angst', question: 'Vind je de tandarts spannend?', label: 'Spannend', why: 'Het team neemt extra tijd en spreekt een stopteken af.', severity: 'info' },
];

export const healthFlagById = (id: HealthFlag) => HEALTH_FLAGS.find((f) => f.id === id)!;
