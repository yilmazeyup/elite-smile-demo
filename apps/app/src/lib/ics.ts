import { CLINIC, LOCATIONS, type LocationId } from '@smile/shared';
import { Linking, Platform } from 'react-native';

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/**
 * Puts an appointment in the phone's own calendar: an .ics file the calendar app opens. The times are written in UTC
 * from Eindhoven's wall clock (the demo's dates are wall-clock dates), with an alarm the evening before and an hour
 * before.
 */
export function addToCalendar(title: string, start: Date, minutes: number, location: LocationId, note = '') {
  const loc = LOCATIONS[location];
  // The demo's Date reads as Eindhoven time in this browser's zone; write it as floating local time instead of UTC.
  const local = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
  const end = new Date(start.getTime() + minutes * 60000);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Elite Smile//Demo//NL',
    'BEGIN:VEVENT',
    `UID:${start.getTime()}-${Math.random().toString(36).slice(2)}@elitesmile.demo`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART;TZID=Europe/Amsterdam:${local(start)}`,
    `DTEND;TZID=Europe/Amsterdam:${local(end)}`,
    `SUMMARY:${title} · ${CLINIC.name}`,
    `LOCATION:${loc.name}, ${loc.street}, ${loc.postcode} ${loc.city}`,
    `DESCRIPTION:${note.replace(/\n/g, '\\n')}\\nTel. ${CLINIC.phone}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Elite Smile',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'elite-smile-afspraak.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return;
  }
  Linking.openURL(`data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`).catch(() => {});
}

export const callClinic = () => Linking.openURL(`tel:${CLINIC.phoneIntl}`).catch(() => {});
export const whatsappClinic = (text = '') => Linking.openURL(`${CLINIC.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`).catch(() => {});
export const routeTo = (location: LocationId) => Linking.openURL(LOCATIONS[location].maps).catch(() => {});
