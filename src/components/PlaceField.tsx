import React, { useRef, useState } from 'react';
import { View, TextInput, Pressable, Image } from 'react-native';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import { colors, radius, fonts } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { Icon, IconName } from './Icon';
import { Txt, Field, MapRoute } from './ui';
import { autocomplete, placeLatLng, staticMapUrl, placesEnabled, Prediction, LatLng } from '../lib/places';

// Place autocomplete field. Falls back to a plain text Field when no Maps key.
export function PlaceField({
  label,
  ph,
  icon,
  value,
  onChangeText,
  onSelect,
}: {
  label?: string;
  ph?: string;
  icon?: IconName;
  value?: string;
  onChangeText: (v: string) => void;
  onSelect: (sel: { description: string; coords: LatLng | null }) => void;
}) {
  const { isRTL } = useI18n();
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [focused, setFocused] = useState(false);
  const timer = useRef<any>(null);
  const ctrl = useRef<AbortController | null>(null);

  if (!placesEnabled) {
    // Graceful fallback: manual text entry.
    return <Field label={label} ph={ph} icon={icon} value={value} onChangeText={onChangeText} />;
  }

  const onType = (v: string) => {
    onChangeText(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setPreds([]);
      return;
    }
    timer.current = setTimeout(async () => {
      ctrl.current?.abort();
      ctrl.current = new AbortController();
      const r = await autocomplete(v, ctrl.current.signal);
      setPreds(r);
    }, 250);
  };

  const choose = async (p: Prediction) => {
    onChangeText(p.description);
    setPreds([]);
    setFocused(false);
    const coords = await placeLatLng(p.placeId);
    onSelect({ description: p.description, coords });
  };

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Txt size={13} weight="semibold" color={colors.textSecondary} style={{ marginBottom: 7, marginHorizontal: 2 }}>
          {label}
        </Txt>
      )}
      <View
        style={{
          minHeight: 50,
          borderWidth: 1.5,
          borderColor: focused ? colors.brandTeal : colors.border,
          borderRadius: radius.input,
          backgroundColor: colors.surfaceMuted,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {icon && <Icon name={icon} size={18} color={colors.textTertiary} />}
        <TextInput
          value={value}
          onChangeText={onType}
          onFocus={() => setFocused(true)}
          placeholder={ph}
          placeholderTextColor={colors.textTertiary}
          style={{ flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left', paddingVertical: 12 }}
        />
      </View>
      {focused && preds.length > 0 && (
        <View style={{ marginTop: 6, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, backgroundColor: '#fff', overflow: 'hidden' }}>
          {preds.map((p, i) => (
            <Pressable key={p.placeId} onPress={() => choose(p)} style={{ paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="pin" size={16} color={colors.textTertiary} />
              <Txt size={14} weight="medium" numberOfLines={1} style={{ flex: 1 }}>
                {p.description}
              </Txt>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// Maps Static API is enabled on the key's project → use real Google map tiles.
// (If it ever 403s, RouteMap falls back to the SVG route.)
const STATIC_TILES = true;

// Route map between two coords. Renders the real geographic path; upgrades to
// Google Static Maps tiles when STATIC_TILES is on. Placeholder when no coords.
export function RouteMap({ from, to, height = 168, style }: { from?: LatLng | null; to?: LatLng | null; height?: number; style?: any }) {
  const [failed, setFailed] = useState(false);
  if (!from || !to) return <MapRoute height={height} style={style} />;

  if (STATIC_TILES && !failed) {
    const url = staticMapUrl(from, to);
    if (url) {
      return (
        <Image
          source={{ uri: url }}
          onError={() => setFailed(true)}
          style={[{ height, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted }, style]}
          resizeMode="cover"
        />
      );
    }
  }
  return <SvgRoute from={from} to={to} height={height} style={style} />;
}

// Equirectangular projection of the two endpoints into a tidy panel with a
// bowed dashed route + pins — shows the genuine geographic direction.
function SvgRoute({ from, to, height, style }: { from: LatLng; to: LatLng; height: number; style?: any }) {
  const W = 320;
  const H = 168;
  const padX = 44;
  const padY = 36;
  const minLat = Math.min(from.lat, to.lat);
  const maxLat = Math.max(from.lat, to.lat);
  const minLng = Math.min(from.lng, to.lng);
  const maxLng = Math.max(from.lng, to.lng);
  const spanLat = Math.max(maxLat - minLat, 2);
  const spanLng = Math.max(maxLng - minLng, 2);
  const px = (lng: number) => padX + ((lng - (minLng + maxLng) / 2) / spanLng + 0.5) * (W - 2 * padX);
  const py = (lat: number) => padY + (0.5 - (lat - (minLat + maxLat) / 2) / spanLat) * (H - 2 * padY);
  const x1 = px(from.lng), y1 = py(from.lat), x2 = px(to.lng), y2 = py(to.lat);
  // control point bowed perpendicular to the line for a great-circle feel
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * 26, cy = my + (dx / len) * 26;

  return (
    <View style={[{ height, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: '#eef2f5' }, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Rect x={0} y={0} width={W} height={H} fill="#eef2f5" />
        {[0.25, 0.5, 0.75].map((g) => (
          <Line key={`v${g}`} x1={W * g} y1={0} x2={W * g} y2={H} stroke="#e1e7ec" strokeWidth={1} />
        ))}
        {[0.33, 0.66].map((g) => (
          <Line key={`h${g}`} x1={0} y1={H * g} x2={W} y2={H * g} stroke="#e1e7ec" strokeWidth={1} />
        ))}
        <Path d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} stroke={colors.brandTeal} strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" fill="none" />
        <Circle cx={x1} cy={y1} r={7} fill="#fff" stroke={colors.sendInk} strokeWidth={4} />
        <Circle cx={x2} cy={y2} r={7} fill={colors.error} stroke="#fff" strokeWidth={2} />
      </Svg>
    </View>
  );
}
