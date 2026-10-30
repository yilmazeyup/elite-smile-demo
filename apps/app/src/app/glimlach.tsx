import { addDays, dateShort, doctorById, HISTORY, treatmentById } from '@smile/shared';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { SmileFan } from '../components/SmileFan';
import { SmileStudio, type StudioInfo } from '../components/SmileStudio';
import { SmileTimeline, type ShadePoint } from '../components/SmileTimeline';
import { useToast } from '../components/Toast';
import { Bracket, Button, Card, Chip, DemoNote, IconTile, LiveDot, PopIn, Press, Row, SectionHead, Sheet, Toggle, Txt } from '../components/ui';
import { tr } from '../i18n';
import { fileToDataUrl } from '../lib/smileEngine';
import { shadeHex, shadeSteps } from '../lib/smileShade';
import { useApp } from '../state/app';
import { C, isWeb, R, web } from '../theme';

const STATUS: Record<StudioInfo['status'], { text: string; tone: 'ok' | 'blue' | 'off' | 'alert' }> = {
  loading: { text: 'Foto laden', tone: 'blue' },
  scanning: { text: 'Mond zoeken…', tone: 'blue' },
  found: { text: 'Mond gevonden door MediaPipe', tone: 'ok' },
  measured: { text: 'Mondlijn vooraf gemeten', tone: 'ok' },
  none: { text: 'Geen open glimlach gevonden', tone: 'off' },
  error: { text: 'Foto niet te openen', tone: 'alert' },
};

/**
 * Glimlach-studio: see your own smile (or the clinic's sample photo) at a lighter VITA shade, with a line to drag
 * between before and after, a stronger "facings" impression, and the shades measured at your visits over time.
 * Everything stays on the device.
 */
export default function Glimlach() {
  const { now, today, saved, update } = useApp();
  const toast = useToast();
  const [photo, setPhoto] = useState<string | null>(null);
  const [shade, setShade] = useState('B1');
  const [facings, setFacings] = useState(false);
  const [info, setInfo] = useState<StudioInfo>({ status: 'loading', estimate: null, own: false });
  const [measuring, setMeasuring] = useState(false);
  const [measure, setMeasure] = useState('A3');
  const input = useRef<HTMLInputElement | null>(null);

  const points = useMemo<(ShadePoint & { who: string })[]>(() => {
    const visits = HISTORY.filter((h) => h.who === 'layla' && h.shade).map((h) => ({
      at: addDays(today, -h.daysAgo),
      shade: h.shade!,
      by: treatmentById(h.treatment).name,
      who: doctorById(h.doctor).name,
    }));
    const mine = saved.shades.map((s) => ({ at: new Date(s.at), shade: s.shade, by: 'Zelf gemeten', who: 'in de app' }));
    return [...visits, ...mine].sort((a, b) => a.at.getTime() - b.at.getTime());
  }, [saved.shades, today]);
  const latest = points[points.length - 1]?.shade ?? 'A3';
  const steps = shadeSteps(latest, shade);
  const status = STATUS[info.status];

  const openMeasure = () => {
    setMeasure(info.own && info.estimate ? info.estimate : latest);
    setMeasuring(true);
  };

  return (
    <Screen
      back
      kicker="Glimlach-studio"
      title="Zie je tanden lichter"
      serif="Een indruk, geen belofte. Je tandarts bespreekt wat haalbaar is."
      footer={<Button title="Bespreek bleken" sub="gratis advies" icon="calendar" kind="brand" size="lg" full onPress={() => router.push('/afspraak?behandeling=bleken' as never)} />}
    >
      {isWeb ? (
        <input
          ref={input}
          type="file"
          accept="image/*"
          capture="user"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            try {
              setPhoto(await fileToDataUrl(file, 1600));
            } catch {
              toast(tr('Deze foto kon niet worden geopend'), { icon: 'image' });
            }
          }}
        />
      ) : null}

      {/* ------------------------------------------------------------------------------------------- the studio */}
      <PopIn>
        <SmileStudio photo={photo} shade={shade} before={photo ? null : latest} facings={facings} onInfo={setInfo} style={{ height: 330 }} />
        <Row style={{ justifyContent: 'space-between', marginTop: 12 }} gap={10}>
          <Row gap={8} style={{ flex: 1 }}>
            <LiveDot tone={status.tone} size={7} />
            <Txt v="small" color={C.soft} numberOfLines={1} style={{ flex: 1 }}>
              {status.text}
            </Txt>
          </Row>
          <Row gap={6}>
            <Icon name="lock" size={13} color={C.muted} />
            <Txt v="label" size={9} color={C.muted}>
              Op je toestel
            </Txt>
          </Row>
        </Row>
        {!photo ? (
          <Txt v="small" color={C.muted} style={{ marginTop: 6 }}>
            {`${tr('Voorbeeldfoto van elitesmile.nl.')} ${tr('Links staat de glimlach op jouw laatst gemeten tint')} ${latest}.`}
          </Txt>
        ) : null}
        <Row gap={8} style={{ marginTop: 14 }} wrap>
          <Chip label="Voorbeeldfoto" icon="image" on={!photo} onPress={() => setPhoto(null)} />
          <Chip label={photo ? 'Andere foto' : 'Eigen foto'} icon="camera" on={!!photo} onPress={() => (isWeb ? input.current?.click() : toast(tr('Foto’s kiezen kan in de webversie')))} />
        </Row>
      </PopIn>

      {/* --------------------------------------------------------------------------------------- the shade guide */}
      <PopIn delay={80}>
        <Card pad={18}>
          <Row style={{ justifyContent: 'space-between' }} align="flex-start">
            <View style={{ gap: 4, flex: 1 }}>
              <Bracket>VITA classical</Bracket>
              <Txt v="title">Kies een tint</Txt>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Txt v="label" size={9} color={C.muted}>
                Jouw meting
              </Txt>
              <Row gap={6}>
                <View style={{ width: 14, height: 14, borderRadius: 5, backgroundColor: shadeHex(latest), borderWidth: 1, borderColor: C.line2 }} />
                <Txt v="num" weight="600">
                  {latest}
                </Txt>
              </Row>
            </View>
          </Row>
          <View style={{ marginTop: 6 }}>
            <SmileFan value={shade} onChange={setShade} mine={latest} />
          </View>
          <View style={{ marginTop: 14, padding: 14, borderRadius: R.md, backgroundColor: C.bg2, gap: 4 }}>
            <Txt v="h3">{steps.n === 0 ? `${shade}: je huidige tint` : `${shade}: ${steps.text} dan je meting`}</Txt>
            <Txt v="small" color={C.soft}>
              {steps.n > 6
                ? 'Een grote stap. Soms kan het met bleken, soms zijn facings nodig. Je tandarts kijkt wat bij jouw glazuur past.'
                : steps.n > 0
                  ? 'Bleken maakt je eigen tanden een paar tinten lichter; hoeveel verschilt per persoon.'
                  : 'Donkerder of gelijk: zo zie je hoe tinten verschillen.'}
            </Txt>
          </View>
          <Row gap={14} style={{ marginTop: 16 }}>
            <IconTile name="sparkle" color="#8E7CF8" size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="h3">Facings-impressie</Txt>
              <Txt v="small" color={C.muted}>
                Gelijkmatiger van kleur en glans, zoals facings dat geven.
              </Txt>
            </View>
            <Toggle value={facings} onChange={setFacings} label="Facings-impressie" />
          </Row>
        </Card>
      </PopIn>

      {/* ----------------------------------------------------------------------------------------- honest words */}
      <PopIn delay={120}>
        <Card tone="ice" style={{ borderColor: 'transparent', gap: 12 }}>
          <Row gap={12} align="flex-start">
            <IconTile name="info" color="#0A63B5" size={38} solid />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt v="h3">Een indruk, geen belofte.</Txt>
              <Txt v="small" color={C.soft}>
                Je tandarts bespreekt wat haalbaar is. Licht en camera veranderen kleuren op een foto, en vullingen, kronen en facings bleken niet mee.
              </Txt>
            </View>
          </Row>
          <Row gap={12} align="flex-start">
            <IconTile name="lock" color="#0A63B5" size={38} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt v="h3">Alles blijft op je toestel</Txt>
              <Txt v="small" color={C.soft}>
                Je foto wordt niet verstuurd en niet bewaard. De gezichtsherkenning draait in je eigen browser.
              </Txt>
            </View>
          </Row>
        </Card>
      </PopIn>

      {/* ------------------------------------------------------------------------------------- the colour timeline */}
      <PopIn delay={160}>
        <SectionHead kicker="Kleurtijdlijn" title="Jouw tint door de tijd" serif="Gemeten bij je controles, en door jezelf." />
        <Card pad={16}>
          <SmileTimeline points={points} target={shade} now={now} />
          <View style={{ marginTop: 6 }}>
            {[...points].reverse().map((p, i, all) => (
              <Row key={`${p.at.getTime()}-${i}`} gap={12} style={{ paddingVertical: 11, borderTopWidth: 1, borderColor: C.line }}>
                <View
                  style={[
                    { width: 30, height: 36, borderTopLeftRadius: 11, borderTopRightRadius: 11, borderBottomLeftRadius: 7, borderBottomRightRadius: 7, backgroundColor: shadeHex(p.shade), borderWidth: 1, borderColor: C.line2 },
                    web({ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.8), inset 0 -3px 6px rgba(120,80,30,.12)' }),
                  ]}
                />
                <View style={{ flex: 1, gap: 1 }}>
                  <Txt v="h3">{p.by}</Txt>
                  <Txt v="small" color={C.muted}>
                    {`${dateShort(p.at)} ${p.at.getFullYear()} · ${tr(p.who)}`}
                  </Txt>
                </View>
                <Txt v="num" weight="600" size={15}>
                  {p.shade}
                </Txt>
                {i === 0 && all.length > 1 ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.sky }} /> : null}
              </Row>
            ))}
          </View>
          <Button title="Meet je kleur nu" icon="eye" kind="blue" full onPress={openMeasure} style={{ marginTop: 8 }} />
        </Card>
      </PopIn>

      {/* ------------------------------------------------------------------------------------ whitening or facings */}
      <PopIn delay={200}>
        <SectionHead kicker="Twee wegen" title="Bleken of facings?" />
        <Row gap={10} align="stretch">
          {(['bleken', 'facings'] as const).map((id) => {
            const t = treatmentById(id);
            return (
              <Card key={id} pad={14} style={{ flex: 1, gap: 8 }} onPress={() => router.push(`/afspraak?behandeling=${id}` as never)} label={t.name}>
                <IconTile name={id === 'bleken' ? 'sparkle' : 'layers'} color={id === 'bleken' ? '#2DB4E8' : '#8E7CF8'} size={36} />
                <Txt v="h3">{t.name}</Txt>
                <Txt v="small" size={12.5} color={C.muted}>
                  {t.what}
                </Txt>
                <Txt v="label" size={9} color={C.blue}>
                  {t.visits}
                </Txt>
              </Card>
            );
          })}
        </Row>
      </PopIn>

      <Txt v="small" color={C.muted} align="center" style={{ paddingHorizontal: 12 }}>
        Een indruk, geen belofte. Je tandarts bespreekt wat haalbaar is.
      </Txt>

      {/* ------------------------------------------------------------------------------------------ measure now */}
      <Sheet open={measuring} onClose={() => setMeasuring(false)} title="Meet je kleur nu" tall>
        <Txt v="serif" size={17} color={C.soft}>
          Een eigen meting, tussen twee controles door.
        </Txt>
        <View style={{ gap: 10 }}>
          {[
            { icon: 'sun' as const, text: 'Ga bij daglicht voor een spiegel staan, zonder lippenstift.' },
            { icon: 'smile' as const, text: 'Kijk naar het midden van je voortanden, niet naar de rand.' },
            { icon: 'eye' as const, text: 'Kies het tabje dat er het meest op lijkt. Twijfel je, kies dan de donkerste van de twee.' },
          ].map((s, i) => (
            <Row key={s.text} gap={12} align="flex-start">
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.ice, alignItems: 'center', justifyContent: 'center' }}>
                <Txt v="num" size={12} weight="700" color={C.blue}>
                  {String(i + 1)}
                </Txt>
              </View>
              <Txt v="body" style={{ flex: 1 }}>
                {s.text}
              </Txt>
            </Row>
          ))}
        </View>
        {info.own && info.estimate ? (
          <Press onPress={() => setMeasure(info.estimate!)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: R.md, backgroundColor: C.bg2 }}>
            <Icon name="wand" size={16} color={C.blue} />
            <Txt v="small" color={C.soft} style={{ flex: 1 }}>
              {`${tr('Geschat uit je foto:')} ${info.estimate}. ${tr('Licht en camera beïnvloeden dit.')}`}
            </Txt>
          </Press>
        ) : null}
        <SmileFan value={measure} onChange={setMeasure} mine={latest} compact />
        <Button
          title={`Bewaar meting · ${measure}`}
          icon="check"
          kind="brand"
          full
          onPress={() => {
            update((s) => ({ shades: [...s.shades, { at: Date.now(), shade: measure }] }));
            setMeasuring(false);
            toast(tr('Kleur bewaard'), { text: `${measure} ${tr('staat nu in je kleurtijdlijn.')}`, icon: 'sparkle' });
          }}
        />
        <DemoNote text="Bij je controle meet de tandarts je kleur met de echte kleurenwaaier, bij het juiste licht." />
      </Sheet>
    </Screen>
  );
}
