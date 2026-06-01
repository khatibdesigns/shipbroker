import React, { useRef, useEffect } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { useI18n } from '../lib/i18n';
import { NavAction } from '../lib/nav';

// Enter animation for a freshly-mounted screen. Keyed by nav `seq` in the Shell
// so each navigation remounts + animates; direction follows the nav action.
export function ScreenTransition({ action, children }: { action: NavAction; children: React.ReactNode }) {
  const { isRTL } = useI18n();
  const p = useRef(new Animated.Value(0)).current; // 0 → 1 progress

  useEffect(() => {
    const anim = Animated.timing(p, {
      toValue: 1,
      duration: action === 'tab' || action === 'replace' ? 240 : 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, []);

  const transform: any[] = [];
  if (action === 'push') {
    const from = isRTL ? -34 : 34;
    transform.push({ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) });
  } else if (action === 'pop') {
    const from = isRTL ? 34 : -34;
    transform.push({ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) });
  } else {
    // tab / replace: a soft rise + slight scale
    transform.push({ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) });
    transform.push({ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) });
  }

  return <Animated.View style={{ flex: 1, opacity: p, transform }}>{children}</Animated.View>;
}

// Generic fade + rise for content blocks / list items. Animates once on mount.
export function Fade({
  children,
  dy = 8,
  duration = 260,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  dy?: number;
  duration?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(p, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, []);
  return (
    <Animated.View style={[{ opacity: p, transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}
