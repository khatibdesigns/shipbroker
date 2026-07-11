import React, { useRef, useEffect, useState } from 'react';
import { Animated, Easing, StyleProp, ViewStyle, View, PanResponder, Dimensions, AccessibilityInfo } from 'react-native';
import { useI18n } from '../lib/i18n';
import { NavAction } from '../lib/nav';

// Tracks the OS "Reduce Motion" accessibility setting (live). Components use it
// to skip translate/scale animations for users who are motion-sensitive.
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (mounted) setReduce(!!v); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(!!v));
    return () => { mounted = false; sub?.remove?.(); };
  }, []);
  return reduce;
}

// Edge swipe-to-go-back. Left edge in LTR, right edge in RTL → calls onBack.
export function EdgeBack({ enabled, onBack, children }: { enabled: boolean; onBack: () => void; children: React.ReactNode }) {
  const { isRTL } = useI18n();
  const ref = useRef({ enabled, onBack, isRTL });
  ref.current = { enabled, onBack, isRTL };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => {
        const { enabled: en, isRTL: rtl } = ref.current;
        if (!en) return false;
        const W = Dimensions.get('window').width;
        const edge = rtl ? g.x0 >= W - 30 && g.dx < -14 : g.x0 <= 30 && g.dx > 14;
        return edge && Math.abs(g.dy) < 26;
      },
      onPanResponderRelease: (_e, g) => {
        const { enabled: en, isRTL: rtl, onBack: cb } = ref.current;
        if (!en) return;
        if ((!rtl && (g.dx > 70 || g.vx > 0.5)) || (rtl && (g.dx < -70 || g.vx < -0.5))) cb();
      },
    })
  ).current;
  return (
    <View style={{ flex: 1 }} {...pan.panHandlers}>
      {children}
    </View>
  );
}

// Enter animation for a freshly-mounted screen. Keyed by nav `seq` in the Shell
// so each navigation remounts + animates; direction follows the nav action.
export function ScreenTransition({ action, children }: { action: NavAction; children: React.ReactNode }) {
  const { isRTL } = useI18n();
  const reduceMotion = useReduceMotion();
  const p = useRef(new Animated.Value(0)).current; // 0 → 1 progress

  useEffect(() => {
    if (reduceMotion) {
      p.setValue(1); // no movement — snap to final state
      return;
    }
    const anim = Animated.timing(p, {
      toValue: 1,
      duration: action === 'tab' || action === 'replace' ? 240 : 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [reduceMotion]);

  const transform: any[] = [];
  if (reduceMotion) {
    // Motion-sensitive users: no slide/scale, just render in place.
  } else if (action === 'push') {
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
  const reduceMotion = useReduceMotion();
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) {
      p.setValue(1);
      return;
    }
    const a = Animated.timing(p, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [reduceMotion]);
  return (
    <Animated.View style={[{ opacity: p, transform: reduceMotion ? [] : [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}
