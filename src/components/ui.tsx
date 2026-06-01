import React from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardTypeOptions,
  Pressable,
  ScrollView,
  TextStyle,
  ViewStyle,
  StyleProp,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontFor, radius, shadow, gradients, modeColor, ModeKey } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useNav, TabKey } from '../lib/nav';
import { Icon, IconName, Star, StatusGlyphs } from './Icon';

/* ---------------- typography ---------------- */

type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';
const familyFor: Record<Weight, string> = {
  regular: fonts.regular,
  medium: fonts.medium,
  semibold: fonts.semibold,
  bold: fonts.bold,
  extrabold: fonts.extrabold,
};

export function Txt({
  children,
  size = 15,
  weight = 'regular',
  color = colors.textPrimary,
  align,
  style,
  numberOfLines,
  tabular,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: Weight;
  color?: string;
  align?: 'left' | 'center' | 'right' | 'auto';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  tabular?: boolean;
}) {
  const { isRTL } = useI18n();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: fontFor(familyFor[weight], isRTL),
          fontSize: size,
          color,
          textAlign: align ?? (isRTL ? 'right' : 'left'),
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* ---------------- layout ---------------- */

// Direction-aware horizontal row. align/justify map to RN props.
export function Row({
  children,
  style,
  gap,
  align = 'center',
  justify,
  reverse,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  reverse?: boolean;
}) {
  const { isRTL } = useI18n();
  const dir = (isRTL ? 'row-reverse' : 'row') as ViewStyle['flexDirection'];
  return (
    <View
      style={[
        { flexDirection: reverse ? (isRTL ? 'row' : 'row-reverse') : dir, alignItems: align, justifyContent: justify, gap },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ---------------- screen scaffolding ---------------- */

// Full-screen surface with safe-area padding. `dark` flips the status bar text.
export function Screen({
  children,
  bg = colors.bg,
  edges = true,
  style,
}: {
  children: React.ReactNode;
  bg?: string;
  edges?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, backgroundColor: bg, paddingTop: edges ? insets.top : 0 }, style]}>
      {children}
    </View>
  );
}

// Scrollable body region with the standard 20px horizontal padding.
export function Body({
  children,
  pad = true,
  style,
  contentStyle,
}: {
  children: React.ReactNode;
  pad?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      style={[{ flex: 1 }, style]}
      contentContainerStyle={[{ paddingHorizontal: pad ? 20 : 0, paddingBottom: 28 }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      {children}
    </ScrollView>
  );
}

/* ---------------- language toggle ---------------- */

export function LangToggle({ dark }: { dark?: boolean }) {
  const { lang, toggle } = useI18n();
  const base = dark ? 'rgba(255,255,255,0.7)' : colors.textSecondary;
  const on = dark ? '#fff' : colors.textPrimary;
  return (
    <Pressable onPress={toggle} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: lang === 'en' ? on : base }}>English</Text>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: dark ? 'rgba(255,255,255,0.3)' : colors.border, marginHorizontal: 6 }}>|</Text>
      <Text style={{ fontFamily: fonts.arSemibold, fontSize: 13, color: lang === 'ar' ? on : base }}>عربي</Text>
    </Pressable>
  );
}

/* ---------------- icon button ---------------- */

export function IconButton({
  name,
  size = 20,
  onPress,
  d = 38,
  bare,
  bg = '#fff',
  color = colors.textPrimary,
  flip,
}: {
  name: IconName;
  size?: number;
  onPress?: () => void;
  d?: number;
  bare?: boolean;
  bg?: string;
  color?: string;
  flip?: boolean;
}) {
  const { isRTL } = useI18n();
  const doFlip = flip && isRTL;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        width: d,
        height: d,
        borderRadius: d / 2,
        backgroundColor: bg,
        borderWidth: bare ? 0 : 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={doFlip ? { transform: [{ scaleX: -1 }] } : undefined}>
        <Icon name={name} size={size} color={color} />
      </View>
    </Pressable>
  );
}

/* ---------------- top app bar ---------------- */

export function AppBar({
  title,
  onlyLang,
  right,
  onBack,
}: {
  title?: string;
  onlyLang?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const nav = useNav();
  const back = onBack ?? (nav.canGoBack ? nav.pop : undefined);
  return (
    <Row style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 }} gap={12}>
      {!onlyLang && back && <IconButton name="back" flip onPress={back} />}
      {title ? (
        <Txt size={18} weight="bold" align="center" style={{ flex: 1 }}>
          {title}
        </Txt>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right ?? <LangToggle />}
    </Row>
  );
}

/* ---------------- buttons ---------------- */

type BtnVariant = 'brand' | 'secondary' | 'ghost' | 'dark' | 'send' | 'carry' | 'white';

export function Button({
  label,
  onPress,
  variant = 'brand',
  size = 'md',
  icon,
  iconColor,
  full = true,
  style,
  textColor,
  bg,
  disabled,
  height,
}: {
  label: string;
  onPress?: () => void;
  variant?: BtnVariant;
  size?: 'md' | 'lg' | 'sm';
  icon?: IconName;
  iconColor?: string;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
  bg?: string;
  disabled?: boolean;
  height?: number;
}) {
  const h = height ?? (size === 'lg' ? 56 : size === 'sm' ? 38 : 52);
  const fontSize = size === 'lg' ? 16 : size === 'sm' ? 13 : 15;

  const isGradient = variant === 'brand' || variant === 'send' || variant === 'carry';
  const grad = variant === 'send' ? gradients.send : variant === 'carry' ? gradients.carry : gradients.brand;

  let fg = textColor ?? '#fff';
  let solidBg: string | undefined;
  if (variant === 'secondary') {
    solidBg = '#fff';
    fg = textColor ?? colors.textPrimary;
  } else if (variant === 'ghost') {
    solidBg = colors.surfaceMuted;
    fg = textColor ?? colors.textPrimary;
  } else if (variant === 'dark') {
    solidBg = colors.textPrimary;
  } else if (variant === 'white') {
    solidBg = '#fff';
    fg = textColor ?? colors.sendInk;
  }
  if (bg) solidBg = bg;

  // Fill layer (gradient or solid) spans the full pill; padding + height live here
  // so a custom `height` never gets clipped by the outer shell.
  const fillStyle: ViewStyle = {
    height: h,
    borderRadius: radius.pill,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    borderWidth: variant === 'secondary' ? 1.5 : 0,
    borderColor: colors.border,
  };

  const content = (
    <>
      {icon && <Icon name={icon} size={fontSize + 3} sw={2} color={iconColor ?? fg} />}
      <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize, color: fg, letterSpacing: 0.2 }}>
        {label}
      </Text>
    </>
  );

  // Shell carries width + shadow + caller style; NO overflow:hidden so the glow shows.
  const shellStyle: StyleProp<ViewStyle> = [
    { borderRadius: radius.pill, width: full ? '100%' : undefined, opacity: disabled ? 0.45 : 1 },
    isGradient
      ? {
          ...shadow.card,
          shadowColor: variant === 'send' ? '#4453C9' : variant === 'carry' ? '#00B07A' : colors.brandTeal,
          shadowOpacity: 0.28,
          shadowRadius: 16,
        }
      : null,
    style,
  ];

  return (
    <Pressable onPress={disabled ? undefined : onPress} style={({ pressed }) => [{ transform: [{ translateY: pressed ? 1 : 0 }] }, shellStyle]}>
      {isGradient ? (
        <LinearGradient colors={grad as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={fillStyle}>
          {content}
        </LinearGradient>
      ) : (
        <View style={[fillStyle, { backgroundColor: solidBg }]}>{content}</View>
      )}
    </Pressable>
  );
}

// Underlined text link.
export function Link({
  label,
  onPress,
  brand,
  color,
  style,
  icon,
}: {
  label: string;
  onPress?: () => void;
  brand?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
  icon?: IconName;
}) {
  const c = color ?? (brand ? colors.brandTeal : colors.textSecondary);
  return (
    <Pressable onPress={onPress} hitSlop={8} style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 6, gap: 4 }, style]}>
      {icon && <Icon name={icon} size={14} sw={2.4} color={c} />}
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: c, textDecorationLine: 'underline' }}>{label}</Text>
    </Pressable>
  );
}

/* ---------------- card ---------------- */

export function Card({
  children,
  style,
  muted,
  flat,
  borderColor,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  muted?: boolean;
  flat?: boolean;
  borderColor?: string;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: muted ? colors.surfaceMuted : colors.surface,
          borderWidth: muted ? 0 : 1,
          borderColor: borderColor ?? colors.border,
          borderRadius: radius.card,
        },
        flat || muted ? null : shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ---------------- field ---------------- */

export function Field({
  label,
  ph,
  value,
  icon,
  select,
  area,
  trailing,
  style,
  onChangeText,
  editable,
  keyboardType,
  secureTextEntry,
}: {
  label?: string;
  ph?: string;
  value?: string;
  icon?: IconName;
  select?: boolean;
  area?: boolean;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  // When onChangeText is supplied the field becomes a real text input.
  onChangeText?: (v: string) => void;
  editable?: boolean;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
}) {
  const { isRTL } = useI18n();
  const filled = !!value;
  const interactive = !!onChangeText && editable !== false && !select;
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {label && (
        <Txt size={13} weight="semibold" color={colors.textSecondary} style={{ marginBottom: 7, marginHorizontal: 2 }}>
          {label}
        </Txt>
      )}
      <Row
        gap={10}
        align={area ? 'flex-start' : 'center'}
        style={{
          minHeight: area ? 84 : 50,
          borderWidth: 1.5,
          borderColor: colors.border,
          borderRadius: radius.input,
          backgroundColor: colors.surfaceMuted,
          paddingHorizontal: 16,
          paddingVertical: area ? 13 : 0,
        }}
      >
        {icon && <Icon name={icon} size={18} color={colors.textTertiary} />}
        {interactive ? (
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={ph}
            placeholderTextColor={colors.textTertiary}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            multiline={area}
            style={{
              flex: 1,
              fontFamily: fontFor(fonts.medium, isRTL),
              fontSize: 15,
              color: colors.textPrimary,
              textAlign: isRTL ? 'right' : 'left',
              paddingVertical: 0,
              minHeight: area ? 58 : undefined,
            }}
          />
        ) : (
          <Txt size={15} weight="medium" color={filled ? colors.textPrimary : colors.textTertiary} style={{ flex: 1 }}>
            {value || ph}
          </Txt>
        )}
        {trailing}
        {select && <Icon name="chevD" size={16} color={colors.textTertiary} />}
      </Row>
    </View>
  );
}

/* ---------------- segmented control ---------------- */

export function Seg({
  options,
  value,
  onChange,
  brand,
  dark,
  style,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange?: (k: string) => void;
  brand?: boolean;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const PAD = 4;
  const GAP = 4;
  const n = options.length;
  const idx = Math.max(0, options.findIndex((o) => o.key === value));
  const [w, setW] = React.useState(0);
  const cell = w > 0 ? (w - PAD * 2 - GAP * (n - 1)) / n : 0;
  const x = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (cell <= 0) return;
    Animated.spring(x, { toValue: idx * (cell + GAP), useNativeDriver: true, friction: 11, tension: 90 }).start();
  }, [idx, cell]);

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ flexDirection: 'row', backgroundColor: dark ? 'rgba(255,255,255,0.16)' : colors.surfaceMuted, borderRadius: radius.pill, padding: PAD, gap: GAP }, style]}
    >
      {/* sliding thumb */}
      {cell > 0 &&
        (brand ? (
          <Animated.View style={{ position: 'absolute', left: PAD, top: PAD, bottom: PAD, width: cell, borderRadius: radius.pill, overflow: 'hidden', transform: [{ translateX: x }] }}>
            <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
          </Animated.View>
        ) : (
          <Animated.View style={{ position: 'absolute', left: PAD, top: PAD, bottom: PAD, width: cell, borderRadius: radius.pill, backgroundColor: '#fff', transform: [{ translateX: x }], ...shadow.card }} />
        ))}
      {options.map((o) => {
        const active = o.key === value;
        const color = active ? (brand ? '#fff' : dark ? colors.sendInk : colors.textPrimary) : dark ? '#fff' : colors.textSecondary;
        return (
          <Pressable key={o.key} onPress={() => onChange?.(o.key)} style={{ flex: 1, height: 42, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------- stepper ---------------- */

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = Infinity,
  unit,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  label?: string;
}) {
  const round = (v: number) => Math.round(v * 100) / 100;
  const dec = () => onChange(round(Math.max(min, value - step)));
  const inc = () => onChange(round(Math.min(max, value + step)));
  const Btn = ({ sym, onPress, disabled }: { sym: string; onPress: () => void; disabled: boolean }) => (
    <Pressable onPress={disabled ? undefined : onPress} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary, lineHeight: 22 }}>{sym}</Text>
    </Pressable>
  );
  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Txt size={13} weight="semibold" color={colors.textSecondary} style={{ marginBottom: 7, marginHorizontal: 2 }}>
          {label}
        </Txt>
      )}
      <Row justify="space-between" style={{ height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.input, backgroundColor: colors.surfaceMuted, paddingHorizontal: 6 }}>
        <Btn sym="−" onPress={dec} disabled={value <= min} />
        <Txt size={16} weight="bold" tabular>
          {value}{unit ? ` ${unit}` : ''}
        </Txt>
        <Btn sym="+" onPress={inc} disabled={value >= max} />
      </Row>
    </View>
  );
}

/* ---------------- chip ---------------- */

export function Chip({
  label,
  on,
  brand,
  sm,
  icon,
  onPress,
  style,
}: {
  label: string;
  on?: boolean;
  brand?: boolean;
  sm?: boolean;
  icon?: IconName;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const padV = sm ? 6 : 9;
  const padH = sm ? 12 : 15;
  const fg = on ? '#fff' : colors.textPrimary;
  const content = (
    <Row gap={6} style={{ paddingVertical: padV, paddingHorizontal: padH }}>
      {icon && <Icon name={icon} size={sm ? 13 : 15} sw={2} color={fg} />}
      <Text style={{ fontFamily: fonts.semibold, fontSize: sm ? 12.5 : 13.5, color: fg }}>{label}</Text>
    </Row>
  );
  if (on && brand) {
    return (
      <Pressable onPress={onPress} style={[{ borderRadius: radius.pill, overflow: 'hidden' }, style]}>
        <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.pill }}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: on ? colors.textPrimary : colors.border,
          backgroundColor: on ? colors.textPrimary : '#fff',
        },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

/* ---------------- mode badge ---------------- */

const modeIconName: Record<ModeKey, IconName> = { air: 'plane', road: 'truck', sea: 'ship' };

export function ModeBadge({
  mode,
  label,
  soft,
  color,
  bg,
  style,
  small,
}: {
  mode?: ModeKey;
  label?: string;
  soft?: boolean;
  color?: string;
  bg?: string;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const background = bg ?? (soft ? colors.surfaceMuted : mode ? modeColor[mode] : colors.surfaceMuted);
  const fg = color ?? (soft ? colors.textSecondary : '#fff');
  return (
    <Row gap={5} style={[{ backgroundColor: background, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: small ? 7 : 10 }, style]}>
      {mode && <Icon name={modeIconName[mode]} size={12} sw={2.2} color={fg} />}
      {label && (
        <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: fg, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</Text>
      )}
    </Row>
  );
}

/* ---------------- rating ---------------- */

export function Rating({ value, count, size = 13 }: { value: string; count?: string; size?: number }) {
  return (
    <Row gap={4}>
      <Star size={size + 1} />
      <Text style={{ fontFamily: fonts.bold, fontSize: size, color: colors.textPrimary }}>{value}</Text>
      {count != null && <Text style={{ fontFamily: fonts.semibold, fontSize: size - 1, color: colors.textTertiary }}>({count})</Text>}
    </Row>
  );
}

/* ---------------- avatar ---------------- */

export function Avatar({
  initials,
  icon,
  size = 44,
  rounded = size / 2,
  bg = colors.surfaceMuted,
  color = colors.textSecondary,
  iconColor,
}: {
  initials?: string;
  icon?: IconName;
  size?: number;
  rounded?: number;
  bg?: string;
  color?: string;
  iconColor?: string;
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: rounded, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {icon ? (
        <Icon name={icon} size={size * 0.52} color={iconColor ?? colors.brandTeal} />
      ) : (
        <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.34, color }}>{initials}</Text>
      )}
    </View>
  );
}

/* ---------------- badge (secure-payments style) ---------------- */

export function Badge({
  label,
  icon,
  onDark,
  style,
  color,
  bg,
}: {
  label: string;
  icon?: IconName;
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
  color?: string;
  bg?: string;
}) {
  const fg = color ?? (onDark ? '#fff' : '#00997a');
  const background = bg ?? (onDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,200,150,0.12)');
  return (
    <Row gap={6} style={[{ backgroundColor: background, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 }, style]}>
      {icon && <Icon name={icon} size={13} sw={2} color={fg} />}
      <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: fg }}>{label}</Text>
    </Row>
  );
}

export function PillCount({ n }: { n: number }) {
  return (
    <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: '#fff' }}>{n}</Text>
    </View>
  );
}

/* ---------------- divider / progress ---------------- */

export function Hr({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: colors.border }, style]} />;
}

export function Progress({ step, total }: { step: number; total: number }) {
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }}>
      <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${(step / total) * 100}%`, borderRadius: 3 }} />
    </View>
  );
}

/* ---------------- hero ---------------- */

export function Hero({
  variant,
  children,
  blobs,
  style,
  minHeight,
}: {
  variant: 'send' | 'carry';
  children: React.ReactNode;
  blobs: [string, string, string];
  style?: StyleProp<ViewStyle>;
  minHeight?: number;
}) {
  const grad = variant === 'send' ? gradients.send : gradients.carry;
  return (
    <LinearGradient
      colors={grad as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[{ borderRadius: 24, overflow: 'hidden', padding: 24, minHeight }, style]}
    >
      <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, top: -70, right: -40, backgroundColor: blobs[0], opacity: 0.5 }} />
      <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, bottom: -60, left: -30, backgroundColor: blobs[1], opacity: 0.5 }} />
      <View style={{ position: 'absolute', width: 90, height: 90, borderRadius: 45, top: 40, left: 30, backgroundColor: blobs[2], opacity: 0.35 }} />
      {children}
    </LinearGradient>
  );
}

/* ---------------- bottom nav ---------------- */

export function BottomNav() {
  const { t } = useI18n();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const items: { key: TabKey; icon: IconName; label: string }[] = [
    { key: 'home', icon: 'home', label: t('Home', 'الرئيسية') },
    { key: 'shipments', icon: 'list', label: t('Shipments', 'الشحنات') },
    { key: 'offers', icon: 'offers', label: t('Offers', 'العروض') },
    { key: 'account', icon: 'user', label: t('Account', 'حسابي') },
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: '#fff',
        paddingTop: 11,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      {items.map((it) => {
        const active = nav.tab === it.key;
        const c = active ? colors.brandTeal : colors.textTertiary;
        return (
          <Pressable key={it.key} onPress={() => nav.selectTab(it.key)} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
            <Icon name={it.icon} size={23} sw={active ? 2.2 : 1.8} color={c} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: c }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------- bottom sheet ---------------- */

export function Sheet({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#fff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 22),
          ...shadow.sheet,
        },
        style,
      ]}
    >
      <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: 6, marginBottom: 14 }} />
      {children}
    </View>
  );
}

/* ---------------- upload control ---------------- */

export function Upload({ label }: { label: string }) {
  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: colors.border,
        borderStyle: 'dashed',
        borderRadius: radius.input,
        backgroundColor: colors.surfaceMuted,
        padding: 22,
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Icon name="doc" size={26} sw={1.6} color={colors.textTertiary} />
      <Txt size={14} weight="semibold" color={colors.textTertiary} align="center">
        {label}
      </Txt>
    </View>
  );
}

/* ---------------- striped map placeholder + route ---------------- */

export function MapRoute({ height = 168, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  // Diagonal stripe texture approximated with offset bars; route is an SVG dashed curve.
  return (
    <View style={[{ height, borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: '#eef1f4' }, style]}>
      <Stripes />
      <RouteSvg />
      <View style={{ position: 'absolute', left: 38, bottom: 28, width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', borderWidth: 4, borderColor: colors.brandTeal }} />
      <View style={{ position: 'absolute', right: 36, top: 24 }}>
        <Icon name="pin" size={26} color={colors.error} fill={colors.error} />
      </View>
    </View>
  );
}

function Stripes() {
  const bars = [];
  for (let i = -20; i < 60; i++) {
    bars.push(
      <View
        key={i}
        style={{ position: 'absolute', left: i * 24 - 400, top: -200, width: 12, height: 1000, backgroundColor: '#e6eaee', transform: [{ rotate: '45deg' }] }}
      />
    );
  }
  return <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>{bars}</View>;
}

function RouteSvg() {
  // Imported lazily to keep this file's import list tidy.
  const Svg = require('react-native-svg').default;
  const { Path } = require('react-native-svg');
  return (
    <Svg style={{ position: 'absolute', width: '100%', height: '100%' }} viewBox="0 0 320 168" preserveAspectRatio="none">
      <Path d="M50 130 C 120 110, 150 60, 270 40" fill="none" stroke="#00B4C4" strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" />
    </Svg>
  );
}

/* ---------------- chat bubble + composer ---------------- */

export function Bubble({ from, children }: { from: 'bot' | 'me'; children: React.ReactNode }) {
  const { isRTL } = useI18n();
  const me = from === 'me';
  const content =
    typeof children === 'string' ? (
      <Text style={{ fontFamily: fontFor(me ? fonts.medium : fonts.medium, isRTL), fontSize: 14.5, lineHeight: 21, color: me ? '#fff' : colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }}>
        {children}
      </Text>
    ) : (
      children
    );
  const radii = me
    ? { borderRadius: 18, borderBottomRightRadius: isRTL ? 18 : 6, borderBottomLeftRadius: isRTL ? 6 : 18 }
    : { borderRadius: 18, borderBottomLeftRadius: isRTL ? 18 : 6, borderBottomRightRadius: isRTL ? 6 : 18 };
  if (me) {
    return (
      <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ maxWidth: '78%', alignSelf: 'flex-end', paddingVertical: 12, paddingHorizontal: 15 }, radii]}>
        {content}
      </LinearGradient>
    );
  }
  return <View style={[{ maxWidth: '78%', alignSelf: 'flex-start', backgroundColor: colors.surfaceMuted, paddingVertical: 12, paddingHorizontal: 15 }, radii]}>{content}</View>;
}

export function Composer({ chips }: { chips?: React.ReactNode }) {
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <View>
      {chips}
      <Row
        gap={10}
        style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#fff' }}
      >
        <IconButton name="plus" bare bg={colors.surfaceMuted} />
        <View style={{ flex: 1, height: 46, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, justifyContent: 'center', paddingHorizontal: 16 }}>
          <Txt size={14} color={colors.textTertiary}>
            {t('Type a message…', 'اكتب رسالة…')}
          </Txt>
        </View>
        <IconButton name="mic" bare bg={colors.surfaceMuted} size={19} />
        <View style={{ borderRadius: 19, overflow: 'hidden' }}>
          <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
            <View style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}>
              <Icon name="send" size={18} color="#fff" fill="#fff" />
            </View>
          </LinearGradient>
        </View>
      </Row>
    </View>
  );
}

/* ---------------- skeleton shimmer ---------------- */

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const op = React.useRef(new Animated.Value(0.5)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return <Animated.View style={[{ backgroundColor: '#e3e8ed', borderRadius: 10, opacity: op }, style]} />;
}

/* ---------------- attribute cell (reused in summary/detail cards) ---------------- */

export function Att({ label, val }: { label: string; val: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.textTertiary, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</Text>
      <Txt size={14} weight="bold" style={{ marginTop: 3 }} tabular>
        {val}
      </Txt>
    </View>
  );
}

/* ---------------- route arrow (RTL-aware) ---------------- */

export function RouteArrow({ size = 14, color = colors.textSecondary }: { size?: number; color?: string }) {
  const { isRTL } = useI18n();
  return (
    <View style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Icon name="arrowR" size={size} color={color} />
    </View>
  );
}
