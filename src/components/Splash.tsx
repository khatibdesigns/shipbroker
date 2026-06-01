import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, fonts } from '../lib/theme';
import { Icon } from './Icon';

// Branded launch screen shown while fonts + the initial auth check load.
export default function Splash() {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(p, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <LinearGradient colors={gradients.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: '#7DFFE0', opacity: 0.3, top: -70, right: -70 }} />
      <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#00D9A3', opacity: 0.25, bottom: 40, left: -60 }} />
      <Animated.View style={{ alignItems: 'center', opacity: p, transform: [{ translateY }] }}>
        <View style={{ width: 76, height: 76, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Icon name="box" size={40} color="#fff" sw={1.8} />
        </View>
        <Text style={{ fontFamily: fonts.extrabold, fontSize: 32, color: '#fff', letterSpacing: -0.6 }}>ShipBroker</Text>
        <Text style={{ fontFamily: fonts.medium, fontSize: 14.5, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>Send anything across the GCC</Text>
      </Animated.View>
      <ActivityIndicator color="#fff" style={{ position: 'absolute', bottom: 64 }} />
    </LinearGradient>
  );
}
