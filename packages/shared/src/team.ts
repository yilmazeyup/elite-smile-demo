import type { SpecialtyId } from './treatments';

/**
 * The six dentists as elitesmile.nl introduces them ("Meet the Team of Professionals"): first name, specialty and the
 * portrait from the site. Everything else about them here is demo: the rooms, the days, the agenda and the numbers.
 * The assistants, the hygienists and the front desk are fictional.
 */

export type DoctorId = 'omar' | 'buthaina' | 'ayman' | 'najla' | 'mahmoud' | 'ahmad';
export type StaffId = DoctorId | 'sara' | 'lotte' | 'imane' | 'fleur' | 'nadia' | 'ruben';

export type Outfit = {
  /** Top, sleeves and trousers. */
  top: string;
  bottom: string;
  /** Skin, hair (the back of the head in 3D) and anything extra. */
  skin: string;
  hair: string;
  /** A hijab, a tie, a white coat over scrubs. */
  extra?: { hijab?: string; tie?: string; coat?: string; shirt?: string; longHair?: boolean; beard?: string };
};

export type Doctor = {
  id: DoctorId;
  name: string;
  /** As on the site, in Dutch. */
  title: string;
  /** The site's own English line. */
  titleEn: string;
  specialties: SpecialtyId[];
  /** Their treatment room in the Eindhoven clinic (demo). */
  room: RoomId;
  /** The portrait from elitesmile.nl, 800 × 800 in a lavender circle. */
  photo: string;
  /** Where the face sits in that portrait (800 × 800): centre and radius, for the 3D figure's face. */
  face: { x: number; y: number; r: number };
  outfit: Outfit;
  /** Height in metres for the 3D figure. */
  height: number;
  /** A colour that is theirs in the agenda and the 3D clinic. */
  color: string;
};

export type RoomId = 'k1' | 'k2' | 'k3' | 'k4' | 'k5' | 'k6';

export const DOCTORS: Doctor[] = [
  {
    id: 'omar',
    name: 'Dr. Omar',
    title: 'Specialist in tandimplantaten',
    titleEn: 'Dental Implant Specialist',
    specialties: ['prothetiek', 'chirurgie'],
    room: 'k1',
    photo: 'omar',
    face: { x: 404, y: 206, r: 128 },
    outfit: { top: '#1F3D7A', bottom: '#1C3570', skin: '#C9946E', hair: '#C48A66' },
    height: 1.78,
    color: '#C9A15B',
  },
  {
    id: 'buthaina',
    name: 'Dr. Buthaina',
    title: 'Endodontist & cosmetische tandheelkunde',
    titleEn: 'Endodontist & Cosmetic Dentistry',
    specialties: ['endodontie', 'cosmetisch'],
    room: 'k2',
    photo: 'buthaina',
    face: { x: 392, y: 200, r: 122 },
    outfit: { top: '#F3F3F0', bottom: '#2B2F3A', skin: '#D8A585', hair: '#141414', extra: { hijab: '#151515', coat: '#F7F7F4' } },
    height: 1.64,
    color: '#8E7CF8',
  },
  {
    id: 'ayman',
    name: 'Dr. Ayman',
    title: 'Orthodontie',
    titleEn: 'Orthodontics',
    specialties: ['orthodontie'],
    room: 'k3',
    photo: 'ayman',
    face: { x: 410, y: 206, r: 134 },
    outfit: { top: '#213A72', bottom: '#1D2F5C', skin: '#C08D6B', hair: '#17120F', extra: { tie: '#6B2D5C', shirt: '#EEF2FA' } },
    height: 1.8,
    color: '#17BFA3',
  },
  {
    id: 'najla',
    name: 'Dr. Najla',
    title: 'Algemeen tandarts',
    titleEn: 'General Dentist',
    specialties: ['algemeen', 'kinderen'],
    room: 'k4',
    photo: 'najla',
    face: { x: 404, y: 202, r: 120 },
    outfit: { top: '#A9CDEB', bottom: '#9CC2E4', skin: '#D9A88A', hair: '#2A1913', extra: { longHair: true } },
    height: 1.66,
    color: '#2DB4E8',
  },
  {
    id: 'mahmoud',
    name: 'Dr. Mahmoud',
    title: 'Algemeen tandarts',
    titleEn: 'General Dentist',
    specialties: ['algemeen', 'kinderen'],
    room: 'k5',
    photo: 'mahmoud',
    face: { x: 404, y: 226, r: 134 },
    outfit: { top: '#5E9BDB', bottom: '#5690D2', skin: '#D2A07F', hair: '#2B211C', extra: { beard: '#2B211C' } },
    height: 1.76,
    color: '#FFB12E',
  },
  {
    id: 'ahmad',
    name: 'Dr. Ahmad',
    title: 'Algemeen tandarts',
    titleEn: 'General Dentist',
    specialties: ['algemeen', 'cosmetisch'],
    room: 'k6',
    photo: 'ahmad',
    face: { x: 404, y: 210, r: 130 },
    outfit: { top: '#F6F6F4', bottom: '#2E3442', skin: '#C99270', hair: '#4A3022', extra: { beard: '#4A3022' } },
    height: 1.77,
    color: '#FF6F61',
  },
];

export const doctorById = (id: string): Doctor => DOCTORS.find((d) => d.id === id) ?? DOCTORS[3];

export type Staff = { id: Exclude<StaffId, DoctorId>; name: string; role: string; outfit: Outfit; location: 'eindhoven' | 'hoogland' };

/** Fictional: the people around the chairs. */
export const STAFF: Staff[] = [
  { id: 'sara', name: 'Sara', role: 'Tandartsassistent', outfit: { top: '#7FC3E8', bottom: '#6FB3DA', skin: '#E2B394', hair: '#5A3A24' }, location: 'eindhoven' },
  { id: 'lotte', name: 'Lotte', role: 'Tandartsassistent', outfit: { top: '#7FC3E8', bottom: '#6FB3DA', skin: '#F0C7AA', hair: '#C9A26A' }, location: 'eindhoven' },
  { id: 'imane', name: 'Imane', role: 'Tandartsassistent', outfit: { top: '#7FC3E8', bottom: '#6FB3DA', skin: '#C99472', hair: '#1E1512' }, location: 'eindhoven' },
  { id: 'nadia', name: 'Nadia', role: 'Balie & planning', outfit: { top: '#1B2F66', bottom: '#1B2F66', skin: '#D3A080', hair: '#2A1C16' }, location: 'eindhoven' },
  { id: 'ruben', name: 'Ruben', role: 'Sterilisatie & instrumenten', outfit: { top: '#9AA9C9', bottom: '#7F8FB2', skin: '#EBC3A4', hair: '#6B4A2E' }, location: 'eindhoven' },
  { id: 'fleur', name: 'Fleur', role: 'Mondhygiënist', outfit: { top: '#B9E3D6', bottom: '#A6D6C6', skin: '#F2CDB2', hair: '#8A5A33' }, location: 'hoogland' },
];

export type Room = {
  id: RoomId;
  name: string;
  /** What the room is set up for (demo). */
  focus: string;
  doctor: DoctorId;
  assistant: Exclude<StaffId, DoctorId>;
};

/** The Eindhoven clinic's six treatment rooms in the demo; the 3D clinic draws them in this order. */
export const ROOMS: Room[] = [
  { id: 'k1', name: 'Kamer 1', focus: 'Implantologie & chirurgie', doctor: 'omar', assistant: 'sara' },
  { id: 'k2', name: 'Kamer 2', focus: 'Endo & esthetiek', doctor: 'buthaina', assistant: 'lotte' },
  { id: 'k3', name: 'Kamer 3', focus: 'Orthodontie', doctor: 'ayman', assistant: 'imane' },
  { id: 'k4', name: 'Kamer 4', focus: 'Algemeen & kinderen', doctor: 'najla', assistant: 'lotte' },
  { id: 'k5', name: 'Kamer 5', focus: 'Kinderkamer', doctor: 'mahmoud', assistant: 'imane' },
  { id: 'k6', name: 'Kamer 6', focus: 'Algemeen & esthetiek', doctor: 'ahmad', assistant: 'sara' },
];

export const roomById = (id: string): Room => ROOMS.find((r) => r.id === id) ?? ROOMS[0];

/** Their own pages and accounts. Elite Smile's Instagram is real; the dentists' own accounts are not known yet. */
export type Socials = { instagram?: string; linkedin?: string; tiktok?: string; website?: string };

export const DOCTOR_SOCIALS_KEY = 'smile-doctor-socials';

export function readDoctorSocials(): Partial<Record<DoctorId, Socials>> {
  try {
    const raw = globalThis.localStorage?.getItem(DOCTOR_SOCIALS_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<DoctorId, Socials>>) : {};
  } catch {
    return {};
  }
}

export function saveDoctorSocials(id: DoctorId, socials: Socials) {
  try {
    const all = readDoctorSocials();
    all[id] = socials;
    globalThis.localStorage?.setItem(DOCTOR_SOCIALS_KEY, JSON.stringify(all));
  } catch {
    // Storage off: the panel still shows them until it reloads.
  }
}
