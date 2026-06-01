import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';

import { I18nProvider } from './src/lib/i18n';
import { NavProvider } from './src/lib/nav';
import { AuthProvider } from './src/lib/auth';
import { ShipmentsProvider } from './src/lib/shipments';
import { CatalogProvider } from './src/lib/catalog';
import { AiChatProvider } from './src/lib/aichat';
import { colors } from './src/lib/theme';
import Splash from './src/components/Splash';
import Shell from './src/Shell';

export default function App() {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  if (!loaded) {
    return (
      <SafeAreaProvider>
        <Splash />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <ShipmentsProvider>
            <CatalogProvider>
              <AiChatProvider>
                <NavProvider>
                  <StatusBar style="auto" />
                  <Shell />
                </NavProvider>
              </AiChatProvider>
            </CatalogProvider>
          </ShipmentsProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
