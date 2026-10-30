import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useRef, type PropsWithChildren, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { localize, rtl, tr } from '../i18n';
import { TEAM_PHOTOS } from '../photos';
import { C, FONT, fx, isWeb, MAX_WIDTH, R, shadow, web } from '../theme';
import { Icon, type IconName } from './Icon';

export const nativeDriver = Platform.OS !== 'web';

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((on) => {
    reduceMotion = on;
  })
  .catch(() => {});
export const prefersReducedMotion = () => reduceMotion;

export function tap(kind: 'light' | 'medium' | 'success' | 'select' | 'warning' = 'light') {
  if (isWeb) {
    // A tiny buzz on Android browsers; iPhones ignore it.
    if (kind !== 'light' && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(kind === 'success' ? [8, 40, 8] : 10);
    return;
  }
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else if (kind === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  else if (kind === 'select') Haptics.selectionAsync().catch(() => {});
  else Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// ---------------------------------------------------------------------------------------------------------- text

export type Variant = 'mega' | 'hero' | 'display' | 'title' | 'serif' | 'h2' | 'h3' | 'body' | 'small' | 'label' | 'num' | 'stat';

const VARIANTS: Record<Variant, TextStyle> = {
  mega: { fontFamily: FONT.display, fontWeight: '600', fontSize: 52, lineHeight: 54, letterSpacing: -2 },
  hero: { fontFamily: FONT.display, fontWeight: '600', fontSize: 38, lineHeight: 41, letterSpacing: -1.3 },
  display: { fontFamily: FONT.display, fontWeight: '600', fontSize: 30, lineHeight: 34, letterSpacing: -0.9 },
  title: { fontFamily: FONT.display, fontWeight: '600', fontSize: 21, lineHeight: 26, letterSpacing: -0.45 },
  serif: { fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: '400', fontSize: 21, lineHeight: 27, letterSpacing: -0.2 },
  h2: { fontFamily: FONT.sans, fontWeight: '700', fontSize: 18, lineHeight: 23, letterSpacing: -0.2 },
  h3: { fontFamily: FONT.sans, fontWeight: '600', fontSize: 15.5, lineHeight: 21, letterSpacing: -0.1 },
  body: { fontFamily: FONT.sans, fontWeight: '400', fontSize: 15, lineHeight: 22.5 },
  small: { fontFamily: FONT.sans, fontWeight: '500', fontSize: 13, lineHeight: 18.5 },
  label: { fontFamily: FONT.mono, fontWeight: '500', fontSize: 10.5, lineHeight: 14, letterSpacing: 1.1, textTransform: 'uppercase' },
  num: { fontFamily: FONT.mono, fontWeight: '500', fontSize: 14, lineHeight: 18 },
  stat: { fontFamily: FONT.display, fontWeight: '600', fontSize: 28, lineHeight: 31, letterSpacing: -1 },
};

type TxtProps = TextProps & {
  v?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
  /** Fills the letters with the logo's blue (or the pearl gradient) on the web. */
  ink?: 'blue' | 'pearl';
  weight?: TextStyle['fontWeight'];
  size?: number;
  /** Shown exactly as written, never translated (names, the Dutch half of the interpreter). */
  raw?: boolean;
};

/** Arabic letters join up; spacing them out would break the script, and it has no capitals. */
const JOINED: TextStyle = { letterSpacing: 0, textTransform: 'none' };

export function Txt({ v = 'body', color = C.ink, align, ink, weight, size, style, raw, children, ...rest }: TxtProps) {
  const base = VARIANTS[v];
  const sized: TextStyle | null = size ? { fontSize: size, lineHeight: Math.round(size * ((base.lineHeight as number) / (base.fontSize as number))) } : null;
  const names = [ink ? `ink-${ink}` : '', v === 'num' || v === 'stat' || v === 'label' ? 'tabular' : '', v === 'hero' || v === 'display' || v === 'title' || v === 'mega' ? 'balance' : v === 'body' ? 'pretty' : ''].filter(Boolean).join(' ');
  return (
    <Text
      {...rest}
      {...fx(names)}
      style={[base, sized, { color: ink && !isWeb ? '#0A63B5' : color }, align ? { textAlign: align } : null, weight ? { fontWeight: weight } : null, style, rtl() ? JOINED : null]}
    >
      {raw ? children : localize(children)}
    </Text>
  );
}

/** "[ Vandaag ]": the bracketed labels from Lama Lama's site, used as section kickers. */
export function Bracket({ children, color = C.muted }: { children: string; color?: string }) {
  return (
    <Txt v="label" color={color}>
      {`[ ${tr(children)} ]`}
    </Txt>
  );
}

// ---------------------------------------------------------------------------------------------------------- press

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  scaleTo?: number;
  haptic?: boolean;
  fxNames?: string;
};

/** Anything tappable: it gives a little under the finger and springs back. */
export function Press({ style, children, scaleTo = 0.97, haptic = true, onPressIn, onPressOut, onPress, fxNames = '', disabled, ...rest }: PressProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: nativeDriver, stiffness: value === 1 ? 320 : 540, damping: value === 1 ? 13 : 32, mass: 0.8 }).start();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      {...fx(`pointer nosel ${fxNames}`)}
      disabled={disabled}
      onPressIn={(e) => {
        if (!reduceMotion) to(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) tap();
        onPress?.(e);
      }}
      style={[style, { transform: [{ scale }] }, disabled ? { opacity: 0.42 } : null]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------------------------------------------------- surfaces

type Tone = 'paper' | 'pearl' | 'navy' | 'ice' | 'glass' | 'flat';

type CardProps = PropsWithChildren<{ style?: StyleProp<ViewStyle>; pad?: number; radius?: number; tone?: Tone; lift?: boolean; onPress?: () => void; label?: string }>;

/** A porcelain card; pearl for what is personal, navy for what matters most, ice for help. */
export function Card({ style, pad = 18, radius = R.lg, tone = 'paper', lift, onPress, label, children }: CardProps) {
  const bg = tone === 'navy' ? C.navy : tone === 'ice' ? C.ice : tone === 'glass' ? C.glass : tone === 'flat' ? C.bg2 : C.paper;
  const names = [tone === 'navy' ? 'dye-navy' : tone === 'pearl' ? 'dye-pearl' : tone === 'glass' ? 'glass' : '', lift || onPress ? 'lift' : ''].filter(Boolean).join(' ');
  const box: StyleProp<ViewStyle> = [
    { borderRadius: radius, padding: pad, borderWidth: tone === 'navy' ? 0 : 1, borderColor: C.line, backgroundColor: bg, overflow: 'hidden' },
    tone === 'paper' || tone === 'pearl' ? shadow(1) : null,
    style,
  ];
  if (onPress)
    return (
      <Press onPress={onPress} accessibilityLabel={label} fxNames={names} style={box}>
        {children}
      </Press>
    );
  return (
    <View {...fx(names)} style={box}>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------------------------------------- buttons

type ButtonProps = {
  title: string;
  onPress?: () => void;
  icon?: IconName;
  after?: IconName;
  kind?: 'brand' | 'blue' | 'line' | 'soft' | 'ghost' | 'alert' | 'white' | 'onDark';
  size?: 'lg' | 'md' | 'sm';
  full?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  label?: string;
  sub?: string;
};

export function Button({ title, onPress, icon, after, kind = 'brand', size = 'md', full, disabled, style, label, sub }: ButtonProps) {
  const h = size === 'lg' ? 58 : size === 'md' ? 50 : 38;
  const color = kind === 'brand' || kind === 'blue' || kind === 'alert' || kind === 'onDark' ? '#FFFFFF' : kind === 'white' ? C.navy : C.ink;
  const bg: ViewStyle =
    kind === 'brand'
      ? { backgroundColor: C.navy }
      : kind === 'blue'
        ? { backgroundColor: '#0A63B5' }
        : kind === 'alert'
          ? { backgroundColor: C.alert }
          : kind === 'white'
            ? { backgroundColor: '#FFFFFF' }
            : kind === 'onDark'
              ? { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' }
            : kind === 'line'
              ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.line2 }
              : kind === 'soft'
                ? { backgroundColor: C.bg2 }
                : { backgroundColor: 'transparent' };
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label ?? tr(title)}
      fxNames={kind === 'brand' ? 'dye-navy sheen' : kind === 'blue' ? 'dye-blue sheen glow' : ''}
      style={[
        { height: h, paddingHorizontal: size === 'sm' ? 14 : 22, borderRadius: R.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: full ? 'stretch' : 'flex-start' },
        bg,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 19} color={color} stroke={2} /> : null}
      <Txt v="h3" color={color} size={size === 'lg' ? 16.5 : size === 'md' ? 15.5 : 13.5} weight="700" numberOfLines={1}>
        {title}
      </Txt>
      {sub ? (
        <Txt v="num" color={color} size={size === 'lg' ? 14 : 12.5} style={{ opacity: 0.8 }}>
          {sub}
        </Txt>
      ) : null}
      {after ? <Icon name={after} size={size === 'sm' ? 15 : 18} color={color} stroke={2} /> : null}
    </Press>
  );
}

/** A round icon button on glass, for headers. */
export function IconButton({ name, onPress, label, size = 44, tint, solid }: { name: IconName; onPress?: () => void; label: string; size?: number; tint?: string; solid?: boolean }) {
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={tr(label)}
      fxNames={solid ? '' : 'glass'}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line, backgroundColor: solid ? C.paper : C.glass }}
    >
      <Icon name={name} size={size * 0.45} color={tint ?? C.ink} />
    </Press>
  );
}

/** A soft coloured square with an icon: the face of every feature. */
export function IconTile({ name, color = '#0A63B5', size = 44, solid }: { name: IconName; color?: string; size?: number; solid?: boolean }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size * 0.32, alignItems: 'center', justifyContent: 'center', backgroundColor: solid ? color : alpha(color, 0.12) }}
    >
      <Icon name={name} size={size * 0.5} color={solid ? '#FFFFFF' : color} stroke={1.9} />
    </View>
  );
}

/** A colour given as #RRGGBB, see-through: `alpha('#0A63B5', 0.12)`. Other colours pass as they are. */
export function alpha(color: string, a: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------------------------------------------------------------------------------------------------------- small parts

export function Chip({ label, on, onPress, icon, small, color }: { label: string; on?: boolean; onPress?: () => void; icon?: IconName; small?: boolean; color?: string }) {
  const tint = color ?? C.navy;
  return (
    <Press
      onPress={onPress}
      scaleTo={0.94}
      accessibilityState={{ selected: !!on }}
      style={{
        height: small ? 32 : 38,
        paddingHorizontal: small ? 12 : 15,
        borderRadius: R.pill,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: on ? tint : C.line2,
        backgroundColor: on ? tint : C.paper,
      }}
    >
      {icon ? <Icon name={icon} size={small ? 13 : 15} color={on ? '#FFFFFF' : C.soft} /> : null}
      <Txt v="small" size={small ? 12.5 : 13.5} weight="600" color={on ? '#FFFFFF' : C.soft}>
        {label}
      </Txt>
    </Press>
  );
}

export function Tag({ label, color = C.soft, bg = C.bg2, icon, style }: { label: string; color?: string; bg?: string; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, backgroundColor: bg }, style]}>
      {icon ? <Icon name={icon} size={11} color={color} stroke={2} /> : null}
      <Txt v="label" color={color} size={9.5} style={{ letterSpacing: 0.8 }}>
        {label}
      </Txt>
    </View>
  );
}

/** A small status light: green while open or live, red for alerts, blue while something runs. */
export function LiveDot({ color, tone = 'ok', size = 8 }: { color?: string; tone?: 'ok' | 'alert' | 'blue' | 'off'; size?: number }) {
  const bg = color ?? (tone === 'alert' ? C.alert : tone === 'blue' ? C.sky : tone === 'off' ? C.muted : C.ok);
  return <View {...fx(tone === 'alert' ? 'pulse-red' : tone === 'blue' ? 'pulse-blue' : tone === 'off' ? '' : 'pulse')} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg }} />;
}

export function SectionHead({ kicker, title, action, onAction, serif }: { kicker?: string; title: string; action?: string; onAction?: () => void; serif?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
      <View style={{ flex: 1, gap: 5 }}>
        {kicker ? <Bracket>{kicker}</Bracket> : null}
        <Txt v="title">{title}</Txt>
        {serif ? (
          <Txt v="serif" size={16.5} color={C.soft}>
            {serif}
          </Txt>
        ) : null}
      </View>
      {action ? (
        <Press onPress={onAction} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 }}>
          <Txt v="small" weight="600" color={C.blue}>
            {action}
          </Txt>
          <View style={rtl() ? { transform: [{ scaleX: -1 }] } : null}>
            <Icon name="arrow" size={15} color={C.blue} />
          </View>
        </Press>
      ) : null}
    </View>
  );
}

export function Row({ children, gap = 10, style, wrap, align = 'center' }: PropsWithChildren<{ gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean; align?: ViewStyle['alignItems'] }>) {
  return <View style={[{ flexDirection: 'row', alignItems: align, gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export const Divider = ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={[{ height: 1, backgroundColor: C.line, marginVertical: 14 }, style]} />;

/** A labelled number. */
export function Stat({ label, value, sub, color = C.ink }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={{ gap: 3, flex: 1 }}>
      <Txt v="label" color={C.muted} size={9.5}>
        {label}
      </Txt>
      <Txt v="stat" size={25} color={color}>
        {value}
      </Txt>
      {sub ? (
        <Txt v="small" size={12} color={C.muted}>
          {sub}
        </Txt>
      ) : null}
    </View>
  );
}

/** A thin bar, filled to `value` (0 to 1). */
export function Bar({ value, height = 6, style, color }: { value: number; height?: number; style?: StyleProp<ViewStyle>; color?: string }) {
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: C.line, overflow: 'hidden' }, style]}>
      <View
        {...fx(color ? '' : 'dye-blue')}
        style={[{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height, borderRadius: height, backgroundColor: color ?? C.blue }, web({ transition: 'width .6s cubic-bezier(.2,.9,.25,1)' })]}
      />
    </View>
  );
}

let ringSeq = 0;

/** A progress ring with the logo's blue running round it; content sits in the middle. */
export function Ring({ value, size = 64, stroke = 6, color, track, children }: PropsWithChildren<{ value: number; size?: number; stroke?: number; color?: string; track?: string }>) {
  const id = useRef(`ring-${++ringSeq}`).current;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color ?? '#0A63B5'} />
            <Stop offset="1" stopColor={color ?? '#2DB4E8'} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? 'rgba(127,140,170,0.18)'} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#${id})`} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} />
      </Svg>
      {children}
    </View>
  );
}

/** Note for anything that would really happen in a live app: here it is only a demo. */
export function DemoNote({ text, icon = 'info' }: { text: string; icon?: IconName }) {
  return (
    <Row gap={8} align="flex-start" style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: R.sm, backgroundColor: C.bg2 }}>
      <Icon name={icon} size={15} color={C.muted} />
      <Txt v="small" color={C.muted} style={{ flex: 1 }}>
        {text}
      </Txt>
    </Row>
  );
}

/** Pops its content in once: it rises a little and settles. */
export function PopIn({ delay = 0, children, style }: PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.spring(progress, { toValue: 1, delay, stiffness: 170, damping: 18, mass: 0.9, useNativeDriver: nativeDriver });
    animation.start();
    return () => animation.stop();
  }, [progress, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** A segmented switch of two to four choices. */
export function Segments<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; icon?: IconName }[]; onChange: (id: T) => void }) {
  return (
    <Row gap={4} style={{ padding: 4, borderRadius: R.pill, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.line }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Press
            key={o.id}
            onPress={() => onChange(o.id)}
            scaleTo={0.96}
            accessibilityState={{ selected: on }}
            style={[{ flex: 1, height: 38, borderRadius: R.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: on ? C.paper : 'transparent' }, on ? shadow(1) : null]}
          >
            {o.icon ? <Icon name={o.icon} size={15} color={on ? C.ink : C.muted} /> : null}
            <Txt v="small" weight="700" color={on ? C.ink : C.muted} numberOfLines={1}>
              {o.label}
            </Txt>
          </Press>
        );
      })}
    </Row>
  );
}

/** A row in a list: an icon tile or a picture, a title, a line under it, and something on the right. */
export function ListItem({
  icon,
  color,
  title,
  sub,
  right,
  onPress,
  left,
  last,
  chevron = !!onPress,
}: {
  icon?: IconName;
  color?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
  onPress?: () => void;
  left?: ReactNode;
  last?: boolean;
  chevron?: boolean;
}) {
  const body = (
    <Row gap={13} style={{ paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderColor: C.line }}>
      {left ?? (icon ? <IconTile name={icon} color={color} size={40} /> : null)}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt v="h3">{title}</Txt>
        {sub ? (
          <Txt v="small" color={C.muted} numberOfLines={2}>
            {sub}
          </Txt>
        ) : null}
      </View>
      {right}
      {chevron ? (
        <View style={rtl() ? { transform: [{ scaleX: -1 }] } : null}>
          <Icon name="chevron" size={17} color={C.muted} />
        </View>
      ) : null}
    </Row>
  );
  return onPress ? (
    <Press onPress={onPress} scaleTo={0.985} accessibilityLabel={tr(title)}>
      {body}
    </Press>
  ) : (
    body
  );
}

/** A dentist's portrait from elitesmile.nl, round. */
export function Avatar({ id, size = 44, ring }: { id: string; size?: number; ring?: string }) {
  const source = TEAM_PHOTOS[id];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#EEEAFB', borderWidth: ring ? 2 : 0, borderColor: ring }}>
      {source ? <Image source={source} style={{ width: '100%', height: '100%' }} contentFit="cover" contentPosition={{ top: '8%' }} transition={200} /> : null}
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        tap('select');
        onChange(v);
      }}
      accessibilityLabel={tr(label)}
      trackColor={{ false: 'rgba(127,140,170,0.35)', true: '#0A63B5' }}
      thumbColor="#FFFFFF"
      {...(isWeb ? ({ activeThumbColor: '#FFFFFF' } as object) : {})}
    />
  );
}

export function Field({ style, ...props }: TextInputProps & { style?: StyleProp<TextStyle> }) {
  return (
    <TextInput
      placeholderTextColor="#7584A3"
      {...props}
      placeholder={props.placeholder ? tr(props.placeholder) : undefined}
      style={[
        { height: 52, borderRadius: R.md, borderWidth: 1, borderColor: C.line2, backgroundColor: C.paper, paddingHorizontal: 16, color: C.ink, fontFamily: FONT.sans, fontSize: 16 },
        web({ outlineStyle: 'none' }),
        style,
      ]}
    />
  );
}

/** A sheet that rises from the bottom over a dimmed screen. */
export function Sheet({ open, onClose, title, children, tall }: PropsWithChildren<{ open: boolean; onClose: () => void; title?: string; tall?: boolean }>) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} accessibilityLabel={tr('Sluiten')} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(6,13,31,0.42)' } as ViewStyle} />
        <View
          style={[
            { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', maxHeight: tall ? '92%' : '80%', borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: C.bg, paddingBottom: insets.bottom + 16 },
            shadow(3),
          ]}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.line2 }} />
          </View>
          {title ? (
            <Row style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 6, justifyContent: 'space-between' }}>
              <Txt v="title" style={{ flex: 1 }}>
                {title}
              </Txt>
              <IconButton name="close" label="Sluiten" size={38} onPress={onClose} solid />
            </Row>
          ) : null}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 10, gap: 14 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** A checkbox row for checklists. */
export function Check({ done, onPress, title, sub, when }: { done: boolean; onPress: () => void; title: string; sub?: string; when?: string }) {
  return (
    <Press onPress={onPress} scaleTo={0.985} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={tr(title)}>
      <Row gap={13} align="flex-start" style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line }}>
        <View
          style={[
            { width: 26, height: 26, borderRadius: 9, borderWidth: 1.6, borderColor: done ? C.ok : C.line2, backgroundColor: done ? C.ok : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
            web({ transition: 'all .25s ease' }),
          ]}
        >
          {done ? <Icon name="check" size={16} color="#FFFFFF" stroke={2.6} /> : null}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Row gap={8} style={{ justifyContent: 'space-between' }}>
            <Txt v="h3" color={done ? C.muted : C.ink} style={[{ flex: 1 }, done ? { textDecorationLine: 'line-through' } : null]}>
              {title}
            </Txt>
            {when ? (
              <Txt v="label" color={C.muted} size={9.5}>
                {when}
              </Txt>
            ) : null}
          </Row>
          {sub ? (
            <Txt v="small" color={C.muted}>
              {sub}
            </Txt>
          ) : null}
        </View>
      </Row>
    </Press>
  );
}

/** Mirrors an arrow-like icon in right-to-left languages. */
export const Flip = ({ children }: PropsWithChildren) => <View style={rtl() ? { transform: [{ scaleX: -1 }] } : null}>{children}</View>;
