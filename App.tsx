import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from '@expo-google-fonts/plus-jakarta-sans/useFonts';
// Per-weight subpath imports so Metro bundles only the 9 weights we load,
// not every italic/extra weight in the package barrel (~1MB of dead .ttf).
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { IBMPlexSansArabic_400Regular } from '@expo-google-fonts/ibm-plex-sans-arabic/400Regular';
import { IBMPlexSansArabic_500Medium } from '@expo-google-fonts/ibm-plex-sans-arabic/500Medium';
import { IBMPlexSansArabic_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold';
import { IBMPlexSansArabic_700Bold } from '@expo-google-fonts/ibm-plex-sans-arabic/700Bold';

import { I18nProvider } from './src/lib/i18n';
import { NavProvider } from './src/lib/nav';
import { AuthProvider } from './src/lib/auth';
import { ShipmentsProvider } from './src/lib/shipments';
import { CatalogProvider } from './src/lib/catalog';
import { RfqProvider } from './src/lib/rfq';
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
              <RfqProvider>
                <AiChatProvider>
                  <NavProvider>
                    <StatusBar style="auto" />
                    <Shell />
                  </NavProvider>
                </AiChatProvider>
              </RfqProvider>
            </CatalogProvider>
          </ShipmentsProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
