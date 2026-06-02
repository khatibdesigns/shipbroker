import React, { useEffect } from 'react';
import { View, BackHandler } from 'react-native';
import { useNav } from './lib/nav';
import { useAuth } from './lib/auth';
import { colors } from './lib/theme';
import { ScreenTransition, EdgeBack } from './components/anim';
import Splash from './components/Splash';

import HomeScreen from './screens/HomeScreen';
import AccountScreen from './screens/AccountScreen';
import AiAgentScreen from './screens/AiAgentScreen';
import { Offers, OfferDetail, Escrow } from './screens/OffersScreens';
import { AvailablePackages, PackageDetail, Shipments, TrackDetail, Carriers, CarrierProfile } from './screens/CarryScreens';
import { Welcome, EmailAuth, CreateAccount, RegisterProvider } from './screens/AuthScreens';
import { ProviderTypes, FreightForwarder, Trucking, Winch, MarineCaptain } from './screens/ProviderScreens';
import { WizardStep1, ServicesGrid, QuickRFQ, ServicesAdd, RFQCart } from './screens/B2BScreens';

// Route name → component. Tab roots (Home/Shipments/Offers/Account) plus every
// pushable screen across the six flows.
const SCREENS: Record<string, React.ComponentType<any>> = {
  // tab roots
  Home: HomeScreen,
  Shipments: Shipments,
  Offers: Offers,
  Account: AccountScreen,
  // AI + offers
  AiAgent: AiAgentScreen,
  OfferDetail,
  Escrow,
  // carry + tracking
  AvailablePackages,
  PackageDetail,
  TrackDetail,
  Carriers,
  CarrierProfile,
  // auth
  Welcome,
  EmailAuth,
  CreateAccount,
  RegisterProvider,
  // provider onboarding
  ProviderTypes,
  FreightForwarder,
  Trucking,
  Winch,
  MarineCaptain,
  // b2b wizard + rfq
  WizardStep1,
  ServicesGrid,
  QuickRFQ,
  ServicesAdd,
  RFQCart,
};

// Screens reachable while signed out (the auth / onboarding flow).
const AUTH_FLOW = new Set([
  'Welcome',
  'EmailAuth',
  'CreateAccount',
  'RegisterProvider',
  'ProviderTypes',
  'FreightForwarder',
  'Trucking',
  'Winch',
  'MarineCaptain',
]);

export default function Shell() {
  const nav = useNav();
  const { ready, cloud, signedIn, isAnonymous, profile } = useAuth();

  // Android hardware back → pop the current stack when possible.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (nav.canGoBack) {
        nav.pop();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [nav.canGoBack, nav.pop]);

  // Wait for the initial auth check before deciding what to show.
  if (cloud && !ready) {
    return <Splash />;
  }

  // Signed out → render the auth flow (Welcome, or whichever onboarding screen is on top).
  if (!signedIn) {
    const name = AUTH_FLOW.has(nav.current.name) ? nav.current.name : 'Welcome';
    const AuthComp = SCREENS[name] ?? Welcome;
    return (
      <EdgeBack enabled={nav.canGoBack} onBack={nav.pop}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <ScreenTransition key={nav.seq} action={nav.action}>
            <AuthComp {...(nav.current.params ?? {})} />
          </ScreenTransition>
        </View>
      </EdgeBack>
    );
  }

  // Signed in with a real account but no profile yet → required onboarding.
  // (Anonymous guests skip this.) profile is hydrated before `ready` flips true,
  // so returning users never flash this screen.
  if (cloud && !isAnonymous && !profile.name) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <CreateAccount onboarding />
      </View>
    );
  }

  const Comp = SCREENS[nav.current.name] ?? HomeScreen;
  return (
    <EdgeBack enabled={nav.canGoBack} onBack={nav.pop}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenTransition key={nav.seq} action={nav.action}>
          <Comp {...(nav.current.params ?? {})} />
        </ScreenTransition>
      </View>
    </EdgeBack>
  );
}
