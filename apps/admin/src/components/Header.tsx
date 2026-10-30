import { clock as hhmm, dayLong, getLocale, LOCALE_NAMES, LOCALES, LOCATION_LIST, sunsetMinute, tr, type Locale, type LocationId, type ThemeChoice, type ThemeMode } from '@smile/shared';

import type { ClinicClockState } from '../clock';
import { chooseLocale } from '../i18n/install';
import { Icon } from './Icon';

export const TABS = [
  { id: 'kliniek', label: 'Kliniek', icon: 'cube' },
  { id: 'team', label: 'Team', icon: 'users' },
  { id: 'agenda', label: 'Vandaag', icon: 'columns' },
  { id: 'nazorg', label: 'Nazorg', icon: 'bandage' },
  { id: 'sterilisatie', label: 'Sterilisatie', icon: 'flask' },
  { id: 'cijfers', label: 'Cijfers', icon: 'chart' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

type Props = {
  loc: LocationId;
  onLoc: (loc: LocationId) => void;
  clock: ClinicClockState;
  theme: { choice: ThemeChoice; mode: ThemeMode; choose: (c: ThemeChoice) => void };
  onReset: () => void;
  tab: TabId;
  onTab: (tab: TabId) => void;
  badges: Partial<Record<TabId, number>>;
};

const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = { day: 'night', night: 'auto', auto: 'day' };
const THEME_LABEL: Record<ThemeChoice, string> = { day: 'Dag', night: 'Nacht', auto: 'Automatisch (zonsondergang)' };

/** The bar on top: logo, location, the clinic clock (live or a replay), language, look and a fresh start. */
export function Header({ loc, onLoc, clock, theme, onReset, tab, onTab, badges }: Props) {
  const now = clock.now;
  const sunset = sunsetMinute(now);
  const status =
    clock.reason === 'live' ? null : clock.reason === 'play' ? 'DEMO · dag afspelen' : clock.reason === 'set' ? 'DEMO · ingestelde tijd' : `DEMO · herhaling van ${dayLong(now)}`;
  return (
    <>
      <header className="top glass">
        <div className="brand">
          <img className="logo light" src={`${import.meta.env.BASE_URL}brand/logo-light.png`} alt="Elite Smile" width={133} height={29} />
          <img className="logo dark" src={`${import.meta.env.BASE_URL}brand/logo-dark.png`} alt="" aria-hidden width={133} height={29} />
          <span className="brand-sub">Praktijk</span>
        </div>
        <div className="seg loc" role="radiogroup" aria-label="Locatie">
          {LOCATION_LIST.map((l) => (
            <button key={l.id} role="radio" aria-checked={loc === l.id} className={loc === l.id ? 'on' : ''} onClick={() => onLoc(l.id)} title={`${l.street}, ${l.city}`}>
              <Icon name="pin" size={14} />
              {l.short}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <div className={`clock${clock.demo ? ' demo' : ' live'}`}>
          <span className="time" translate="no">
            {hhmm(now)}
            <small>:{String(now.getSeconds()).padStart(2, '0')}</small>
          </span>
          <span className="clock-meta">
            {status ? (
              <span className="status demo">
                <i />
                {status}
              </span>
            ) : (
              <span className="status live">
                <i />
                LIVE · {dayLong(now)}
              </span>
            )}
            {clock.playing ? (
              <span className="progress" aria-hidden>
                <i style={{ width: `${clock.progress * 100}%` }} />
              </span>
            ) : null}
          </span>
          <button className="icon-btn play" onClick={clock.playing ? clock.stop : clock.play} title={clock.playing ? 'Terug naar nu' : 'Speel de dag af'} aria-label={clock.playing ? 'Terug naar nu' : 'Speel de dag af'}>
            <Icon name={clock.playing ? 'stop' : 'play'} size={14} />
          </button>
        </div>
        <label className="lang">
          <Icon name="lang" size={16} />
          <select value={getLocale()} onChange={(e) => chooseLocale(e.target.value as Locale)} aria-label="Taal" translate="no">
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_NAMES[l]}
              </option>
            ))}
          </select>
        </label>
        <button
          className="icon-btn"
          onClick={() => theme.choose(NEXT_THEME[theme.choice])}
          title={theme.choice === 'auto' ? `${tr(THEME_LABEL.auto)} · ${String(Math.floor(sunset / 60)).padStart(2, '0')}:${String(Math.round(sunset % 60)).padStart(2, '0')}` : THEME_LABEL[theme.choice]}
          aria-label={THEME_LABEL[theme.choice]}
        >
          <Icon name={theme.choice === 'auto' ? 'auto' : theme.choice === 'night' ? 'moon' : 'sun'} size={17} />
        </button>
        <button className="btn ghost reset" onClick={onReset} title="Wist alles wat de app en het paneel deden">
          <Icon name="reset" size={15} />
          <span>Demo opnieuw</span>
        </button>
      </header>
      <nav className="tabs glass" aria-label="Weergaven">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => onTab(t.id)}>
            <Icon name={t.icon} size={16} />
            <span>{t.label}</span>
            {badges[t.id] ? <b className="badge">{badges[t.id]}</b> : null}
          </button>
        ))}
      </nav>
    </>
  );
}
