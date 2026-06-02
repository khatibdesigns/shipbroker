import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

// Line-glyph icon set, ported 1:1 from the design handoff (base.jsx ICONS).
export const ICONS = {
  back: 'M15 5l-7 7 7 7',
  chevR: 'M9 5l7 7-7 7',
  chevD: 'M5 9l7 7 7-7',
  search: 'M11 4a7 7 0 105.3 11.9L21 21M11 4a7 7 0 010 14',
  plus: 'M12 5v14M5 12h14',
  send: 'M4 12l16-8-6 16-3-7-7-1z',
  mic: 'M12 3a3 3 0 013 3v5a3 3 0 01-6 0V6a3 3 0 013-3zM6 11a6 6 0 0012 0M12 17v4',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L4.5 9.7l5.9-.9z',
  check: 'M5 12.5l4.5 4.5L19 7',
  pin: 'M12 21s7-6.3 7-11A7 7 0 005 10c0 4.7 7 11 7 11zM12 10.5a2 2 0 100-4 2 2 0 000 4z',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z',
  camera: 'M4 8h3l2-2.5h6L17 8h3v11H4zM12 16a3 3 0 100-6 3 3 0 000 6z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14.5 5.5l4 4',
  box: 'M12 3l8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10',
  truck:
    'M3 6h11v9H3zM14 9h4l3 3v3h-7zM7 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  plane: 'M4 13l16-6-5 13-3-5-5-1z M12.5 9.5L9 12',
  ship: 'M5 16l1.5-5h11L19 16M12 6v5M4 16h16l-2 4H6zM9 8h6',
  ware: 'M3 10l9-5 9 5v9H3zM7 19v-6h10v6',
  car: 'M5 14l1.5-5h11L19 14v4H5zM5 18h2M17 18h2M4 14h16',
  boat: 'M4 15l1-4h14l-1 4M12 4v7M5 15h14l-2 4H7z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5',
  doc: 'M7 3h7l4 4v14H7zM14 3v4h4',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3.5 2',
  filter: 'M4 6h16M7 12h10M10 18h4',
  close: 'M6 6l12 12M18 6L6 18',
  location: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 100 8 4 4 0 000-8z',
  bolt: 'M13 3L5 13h5l-1 8 8-10h-5z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  cart: 'M3 4h2.2l1.8 11.2a1 1 0 001 .85h8.4a1 1 0 001-.8L20 7.5H6.2M9.5 20.5a1 1 0 100-2 1 1 0 000 2zM16.5 20.5a1 1 0 100-2 1 1 0 000 2z',
  offers: 'M4 7h16v10H4zM4 11h16M8 15h3',
  lock: 'M7 11V8a5 5 0 0110 0v3M5 11h14v9H5z',
  cube: 'M12 3l8 4v10l-8 4-8-4V7zM4 7l8 4 8-4',
  sparkle:
    'M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6zM18 4l.7 1.8L20.5 6.5 18.7 7.2 18 9l-.7-1.8L15.5 6.5l1.8-.7z',
  arrowR: 'M5 12h14M13 6l6 6-6 6',
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 22,
  sw = 1.9,
  color = '#14181F',
  fill = 'none',
}: {
  name: IconName;
  size?: number;
  sw?: number;
  color?: string;
  fill?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <Path
        d={ICONS[name]}
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={fill}
      />
    </Svg>
  );
}

// Solid gold star for rating chips.
export function Star({ size = 14, color = '#FFB400' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={ICONS.star} fill={color} />
    </Svg>
  );
}

// iOS-style signal / wifi / battery cluster for the status bar.
export function StatusGlyphs({ color = '#14181F' }: { color?: string }) {
  return (
    <Svg width={64} height={13} viewBox="0 0 64 13" fill="none">
      {/* signal */}
      <Rect x={0} y={7} width={3} height={5} rx={1} fill={color} />
      <Rect x={5} y={4} width={3} height={8} rx={1} fill={color} />
      <Rect x={10} y={1.5} width={3} height={10.5} rx={1} fill={color} />
      <Rect x={15} y={0} width={3} height={12} rx={1} fill={color} opacity={0.4} />
      {/* wifi */}
      <Path
        d="M23 5.5a10 10 0 0115 0M25.5 8a6.5 6.5 0 0110 0M28 10.3a3 3 0 015 0"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      {/* battery */}
      <Rect x={45} y={1} width={15} height={11} rx={3} stroke={color} strokeWidth={1.2} opacity={0.5} />
      <Rect x={47} y={3} width={11} height={7} rx={1.5} fill={color} />
      <Rect x={61.5} y={4} width={1.8} height={5} rx={1} fill={color} opacity={0.5} />
    </Svg>
  );
}
