import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { tr } from '../i18n';
import type { StoryPage } from '../lib/kidsCorner';
import { C, FONT, isWeb, R, shadow, web } from '../theme';
import { Icon } from './Icon';
import { Flip, Press, Txt } from './ui';

const SUN = '#FFB12E';
const SUN2 = '#FFD27A';
const SKY = '#2DB4E8';
const SKY2 = '#BFE8FA';
const NAVY = '#1B2F66';
const MINT = '#17BFA3';
const SKIN = '#F2C9A5';

/** A milk tooth, 40 × 42, drawn round and friendly. */
const TOOTH = 'M8 2C13 2 15 4 20 4S27 2 32 2C38 2 40 7 40 13C40 20 36 24 35 30C34 37 33 42 30 42C26 42 27 32 22 32H18C13 32 14 42 10 42C7 42 6 37 5 30C4 24 0 20 0 13C0 7 2 2 8 2Z';

function Bg({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <>
      <Defs>
        <LinearGradient id={`${id}-bg`} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
        <RadialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${id}-tooth`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#EEF2F8" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={320} height={190} fill={`url(#${id}-bg)`} />
    </>
  );
}

const Sparkle = ({ x, y, s = 1, c = '#FFFFFF' }: { x: number; y: number; s?: number; c?: string }) => (
  <Path d={`M${x} ${y - 7 * s}L${x + 2 * s} ${y - 2 * s}L${x + 7 * s} ${y}L${x + 2 * s} ${y + 2 * s}L${x} ${y + 7 * s}L${x - 2 * s} ${y + 2 * s}L${x - 7 * s} ${y}L${x - 2 * s} ${y - 2 * s}Z`} fill={c} />
);

/** One illustrated scene of the first visit. */
export function KidsScene({ id, uid }: { id: StoryPage['id']; uid: string }) {
  const k = `${uid}-${id}`;
  switch (id) {
    case 'wachtkamer':
      return (
        <G>
          <Bg id={k} from="#FFF3DF" to="#FFE6CC" />
          {/* window with the sun */}
          <Rect x={196} y={24} width={96} height={74} rx={12} fill={SKY2} stroke="#FFFFFF" strokeWidth={5} />
          <Circle cx={262} cy={50} r={21} fill="#FFF3C4" opacity={0.7} />
          <Circle cx={262} cy={50} r={13} fill={SUN} />
          <Path d="M210 80c4-8 14-8 18-2 4-6 14-4 15 3z" fill="#FFFFFF" />
          <Line x1={244} y1={26} x2={244} y2={96} stroke="#FFFFFF" strokeWidth={3} />
          {/* clock */}
          <Circle cx={64} cy={42} r={17} fill="#FFFFFF" stroke={NAVY} strokeWidth={2.5} />
          <Line x1={64} y1={42} x2={64} y2={31} stroke={NAVY} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1={64} y1={42} x2={72} y2={46} stroke={SUN} strokeWidth={2.5} strokeLinecap="round" />
          {/* floor */}
          <Rect x={0} y={150} width={320} height={40} fill="#F6D8B2" />
          <Rect x={0} y={150} width={320} height={3} fill="#EFC895" />
          {/* bench */}
          <Rect x={26} y={88} width={128} height={34} rx={14} fill="#8FD8F4" />
          <Rect x={22} y={116} width={136} height={16} rx={8} fill={SKY} />
          <Line x1={40} y1={132} x2={40} y2={150} stroke={NAVY} strokeWidth={4} strokeLinecap="round" />
          <Line x1={140} y1={132} x2={140} y2={150} stroke={NAVY} strokeWidth={4} strokeLinecap="round" />
          {/* the child, waiting */}
          <Rect x={70} y={92} width={34} height={32} rx={14} fill={SUN} />
          <Circle cx={87} cy={78} r={15} fill={SKIN} />
          <Path d="M72 75c2-11 26-13 30 0-6-4-22-5-30 0z" fill={NAVY} />
          <Path d="M81 82c3 3 9 3 12 0" stroke={NAVY} strokeWidth={2} strokeLinecap="round" fill="none" />
          <Circle cx={82} cy={77} r={1.6} fill={NAVY} />
          <Circle cx={92} cy={77} r={1.6} fill={NAVY} />
          {/* plant */}
          <Path d="M172 128h26l-4 22h-18z" fill="#FF8F7A" />
          <Ellipse cx={178} cy={112} rx={7} ry={16} fill={MINT} transform="rotate(-24 178 112)" />
          <Ellipse cx={192} cy={110} rx={7} ry={17} fill="#4FD3B4" transform="rotate(20 192 110)" />
          <Ellipse cx={185} cy={104} rx={6} ry={18} fill={MINT} />
          {/* books */}
          <Rect x={214} y={134} width={74} height={6} rx={3} fill="#C9A15B" />
          <Rect x={222} y={122} width={30} height={12} rx={2} fill="#8E7CF8" />
          <Rect x={226} y={112} width={26} height={10} rx={2} fill="#FF7AA8" />
          <Rect x={258} y={118} width={22} height={16} rx={2} fill={SKY} />
        </G>
      );
    case 'stoel':
      return (
        <G>
          <Bg id={k} from="#E6F6FD" to="#FFF3E2" />
          {/* lamp, a small sun */}
          <Path d="M320 6C280 6 250 14 232 36" stroke="#9FB3D9" strokeWidth={6} strokeLinecap="round" fill="none" />
          <Ellipse cx={214} cy={50} rx={60} ry={34} fill={`url(#${k}-glow)`} opacity={0.9} />
          <Ellipse cx={220} cy={44} rx={26} ry={12} fill="#FFFFFF" stroke={NAVY} strokeWidth={2.5} />
          <Ellipse cx={220} cy={47} rx={16} ry={5} fill={SUN2} />
          {/* chair */}
          <Rect x={118} y={164} width={74} height={10} rx={5} fill={NAVY} />
          <Rect x={146} y={128} width={18} height={38} rx={6} fill="#9FB3D9" />
          <Path d="M54 74L100 118H208L230 142" stroke={SKY} strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Path d="M54 74L100 118H208L230 142" stroke="#7FD3F2" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.6} />
          {/* the child lying back */}
          <Path d="M82 96L118 108H178" stroke={SUN} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Path d="M178 108L214 120" stroke={NAVY} strokeWidth={13} strokeLinecap="round" fill="none" />
          <Circle cx={66} cy={70} r={15} fill={SKIN} />
          <Path d="M52 64c4-12 26-12 30 2-8-4-22-6-30-2z" fill={NAVY} />
          <Path d="M61 76c3 3 8 3 11 0" stroke={NAVY} strokeWidth={2} strokeLinecap="round" fill="none" />
          {/* up it goes */}
          {[0, 1, 2].map((i) => (
            <Path key={i} d={`M272 ${120 - i * 22}l12-12 12 12`} stroke={i === 0 ? SUN : SKY} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={1 - i * 0.25} />
          ))}
        </G>
      );
    case 'spiegel':
      return (
        <G>
          <Bg id={k} from="#F0EDFF" to="#FFF3E6" />
          <Ellipse cx={104} cy={160} rx={56} ry={8} fill="#1B2F66" opacity={0.08} />
          <Path d={TOOTH} transform="translate(56 36) scale(2.4)" fill={`url(#${k}-tooth)`} stroke="#DCE4F0" strokeWidth={0.8} />
          <Circle cx={92} cy={78} r={3.5} fill={NAVY} />
          <Circle cx={118} cy={78} r={3.5} fill={NAVY} />
          <Path d="M96 92c5 5 13 5 18 0" stroke={NAVY} strokeWidth={3} strokeLinecap="round" fill="none" />
          <Circle cx={84} cy={88} r={5} fill="#FF9DB8" opacity={0.5} />
          <Circle cx={126} cy={88} r={5} fill="#FF9DB8" opacity={0.5} />
          {/* the little mirror on its handle */}
          <Line x1={300} y1={176} x2={214} y2={98} stroke="#AEBBD3" strokeWidth={8} strokeLinecap="round" />
          <Line x1={300} y1={176} x2={214} y2={98} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
          <Circle cx={198} cy={80} r={32} fill="#9FB3D9" />
          <Circle cx={198} cy={80} r={27} fill={SKY2} />
          <Ellipse cx={190} cy={70} rx={12} ry={7} fill="#FFFFFF" opacity={0.7} transform="rotate(-30 190 70)" />
          <Path d={TOOTH} transform="translate(186 74) scale(0.6)" fill="#FFFFFF" />
          <Sparkle x={248} y={40} c={SUN} />
          <Sparkle x={150} y={30} s={0.7} c="#8E7CF8" />
        </G>
      );
    case 'tellen': {
      const teeth = Array.from({ length: 10 }, (_, i) => {
        const a = Math.PI * (1.08 + (i / 9) * 0.84);
        return { x: 160 + Math.cos(a) * 118, y: 168 + Math.sin(a) * 112 };
      });
      return (
        <G>
          <Bg id={k} from="#E3F8F2" to="#FFF6E6" />
          <Path d="M36 150C60 70 260 70 284 150" stroke="#FF9DB8" strokeWidth={26} strokeLinecap="round" fill="none" opacity={0.55} />
          {teeth.map((t, i) => (
            <G key={i}>
              <Path d={TOOTH} transform={`translate(${t.x - 11} ${t.y - 12}) scale(0.55)`} fill={`url(#${k}-tooth)`} stroke="#DCE4F0" strokeWidth={1} />
              {i < 7 ? (
                <G>
                  <Circle cx={t.x} cy={t.y - 24} r={9} fill={i === 6 ? SUN : '#FFFFFF'} stroke={i === 6 ? SUN : '#DCE4F0'} strokeWidth={1.2} />
                  <SvgText x={t.x} y={t.y - 20.5} fontSize={10} fontWeight="700" fontFamily={FONT.display} fill={i === 6 ? '#FFFFFF' : NAVY} textAnchor="middle">
                    {String(i + 1)}
                  </SvgText>
                </G>
              ) : null}
            </G>
          ))}
          <Sparkle x={160} y={120} c={SUN} s={1.3} />
        </G>
      );
    }
    case 'kietel':
      return (
        <G>
          <Bg id={k} from="#FFEAF1" to="#FFF6E6" />
          <Ellipse cx={110} cy={162} rx={54} ry={8} fill="#1B2F66" opacity={0.08} />
          <Path d={TOOTH} transform="translate(62 40) scale(2.3)" fill={`url(#${k}-tooth)`} stroke="#DCE4F0" strokeWidth={0.8} />
          <Path d="M98 82c4-4 9-4 13 0M122 82c4-4 9-4 13 0" stroke={NAVY} strokeWidth={3} strokeLinecap="round" fill="none" />
          <Path d="M104 96c7 8 20 8 27 0" stroke={NAVY} strokeWidth={3} strokeLinecap="round" fill="none" />
          {/* the polishing handpiece with its soft cup */}
          <Path d="M310 120L214 92" stroke="#AEBBD3" strokeWidth={14} strokeLinecap="round" />
          <Path d="M310 120L214 92" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.6} />
          <Rect x={196} y={74} width={22} height={20} rx={8} fill={SKY} transform="rotate(16 207 84)" />
          <Path d="M188 70c-6 4-8 12-4 18M182 64c-9 6-12 18-6 28" stroke={SKY} strokeWidth={2.5} strokeLinecap="round" fill="none" opacity={0.7} />
          {[
            [176, 50, 7],
            [196, 40, 4],
            [160, 36, 5],
            [214, 56, 3.5],
            [168, 124, 4],
          ].map(([x, y, r], i) => (
            <Circle key={i} cx={x} cy={y} r={r} fill="#FFFFFF" stroke={SKY} strokeWidth={1.5} opacity={0.9} />
          ))}
        </G>
      );
    case 'sticker':
      return (
        <G>
          <Bg id={k} from="#FFF1D2" to="#FFF8EE" />
          <Rect x={40} y={40} width={150} height={124} rx={16} fill="#FFFFFF" stroke="#F1E3C6" strokeWidth={2} />
          {[
            [76, 76, SKY],
            [150, 76, MINT],
            [76, 130, '#8E7CF8'],
          ].map(([x, y, c], i) => (
            <G key={i}>
              <Circle cx={x as number} cy={y as number} r={20} fill="#FFFFFF" stroke="#EADFC8" strokeWidth={1.5} strokeDasharray="3 3" />
              <Circle cx={x as number} cy={y as number} r={15} fill={c as string} />
            </G>
          ))}
          <Circle cx={150} cy={130} r={20} fill="none" stroke="#EADFC8" strokeWidth={1.5} strokeDasharray="3 3" />
          {/* the big star, peeling off */}
          <G transform="rotate(-12 236 96)">
            <Circle cx={236} cy={96} r={50} fill="#FFFFFF" />
            <Circle cx={236} cy={96} r={44} fill={SUN} />
            <Path d="M236 66l9 18 20 3-14 14 3 20-18-9-18 9 3-20-14-14 20-3z" fill="#FFFFFF" />
            <Path d="M268 128c8-2 14 2 16 8-8-4-14-4-16-8z" fill="#F1E3C6" />
          </G>
          {[
            [40, 24, SKY, 20],
            [292, 30, '#FF7AA8', -30],
            [300, 160, MINT, 40],
            [206, 172, '#8E7CF8', 10],
            [18, 120, SUN, -20],
          ].map(([x, y, c, r], i) => (
            <Rect key={i} x={x as number} y={y as number} width={10} height={5} rx={2} fill={c as string} transform={`rotate(${r} ${x} ${y})`} />
          ))}
          <Sparkle x={290} y={70} c={SUN} />
        </G>
      );
  }
}

let seq = 0;

/** Mijn eerste bezoek: six illustrated pages to swipe through, with a button that reads each page aloud. */
export function KidsStory({ pages, tint = SUN }: { pages: StoryPage[]; tint?: string }) {
  const uid = useRef(`ks-${++seq}`).current;
  const [w, setW] = useState(0);
  const [page, setPage] = useState(0);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const speech = isWeb && typeof window !== 'undefined' && 'speechSynthesis' in window;

  const go = (i: number) => {
    const n = Math.max(0, Math.min(pages.length - 1, i));
    scroller.current?.scrollTo({ x: n * (w + 12), animated: true });
    setPage(n);
  };

  const read = (p: StoryPage) => {
    if (!speech) return;
    const u = new SpeechSynthesisUtterance(`${tr(p.title)}. ${tr(p.text)}`);
    u.lang = document.documentElement.lang || 'nl-NL';
    u.rate = 0.92;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? (
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={w + 12}
          decelerationRate="fast"
          disableIntervalMomentum
          onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (w + 12)))}
          scrollEventThrottle={32}
          style={[{ marginHorizontal: -20, overflow: 'visible' }, web({ scrollSnapType: 'x mandatory' })]}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 18, paddingTop: 2 }}
        >
          {pages.map((p, i) => (
            <View key={p.id} style={[{ width: w, borderRadius: R.lg, backgroundColor: C.paper, overflow: 'hidden', borderWidth: 1, borderColor: C.line }, shadow(1), web({ scrollSnapAlign: 'start' })]}>
              <Svg width={w} height={(w * 190) / 320} viewBox="0 0 320 190">
                <KidsScene id={p.id} uid={uid} />
              </Svg>
              <View style={{ padding: 18, gap: 6, minHeight: 150 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Txt v="label" color={tint === SUN ? '#B97A0E' : C.blue}>
                    {`${i + 1} / ${pages.length}`}
                  </Txt>
                  {speech ? (
                    <Press onPress={() => read(p)} accessibilityLabel={tr('Lees voor')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 12, marginVertical: -10, borderRadius: 22 }}>
                      <Icon name="sound" size={16} color={C.soft} />
                      <Txt v="small" weight="600" color={C.soft}>
                        Lees voor
                      </Txt>
                    </Press>
                  ) : null}
                </View>
                <Txt v="title">{p.title}</Txt>
                <Txt v="serif" size={17.5} color={C.soft}>
                  {p.text}
                </Txt>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={{ height: 340 }} />
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Press onPress={() => go(page - 1)} disabled={page === 0} accessibilityLabel={tr('Vorige')} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2, backgroundColor: C.paper }}>
          <Flip>
            <Icon name="back" size={18} color={C.ink} />
          </Flip>
        </Press>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {pages.map((p, i) => (
            <View key={p.id} style={[{ width: i === page ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i === page ? tint : C.line2 }, web({ transition: 'width .35s cubic-bezier(.2,.9,.25,1), background-color .35s ease' })]} />
          ))}
        </View>
        <Press onPress={() => go(page + 1)} disabled={page === pages.length - 1} accessibilityLabel={tr('Volgende')} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.navy }}>
          <Flip>
            <Icon name="arrow" size={18} color="#FFFFFF" />
          </Flip>
        </Press>
      </View>
    </View>
  );
}
