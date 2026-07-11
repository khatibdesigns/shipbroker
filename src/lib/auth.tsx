import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  OAuthProvider,
  GoogleAuthProvider,
  signOut as fbSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, firestore, isConfigured } from './firebase';

// ShipBroker auth. Three real providers (Email, Google, Apple) layered on an
// anonymous baseline so the app still works as a guest. Google/Apple are native
// modules — they run in a dev build / standalone, not plain Expo Go — so they're
// lazy-required (try/catch) and the bundle loads regardless.
export type Persona = 'sender' | 'provider';

export type Profile = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  gender?: string;
  dob?: string;
  avatar?: string; // data URI of profile photo
  persona?: Persona;
  company?: { name?: string; address?: string; phone?: string };
  providerType?: string;
  // Provider-onboarding capture (freight forwarder / trucking / winch / marine).
  services?: string[];
  coverage?: string;
  country?: string;
  license?: string; // license type key, or a data URI of an uploaded document
  maxBoatLength?: string;
  maxGt?: string;
  // Push: native device token (FCM/APNs) + platform, for marketplace pushes.
  pushToken?: string;
  pushPlatform?: string;
  createdAt?: number;
};

function getApple() {
  try { return require('expo-apple-authentication'); } catch { return null; }
}
function getCrypto() {
  try { return require('expo-crypto'); } catch { return null; }
}
function getGoogle() {
  try { return require('@react-native-google-signin/google-signin'); } catch { return null; }
}

const GOOGLE_WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let googleConfigured = false;
function configureGoogle() {
  const G = getGoogle();
  if (!G || googleConfigured || !GOOGLE_WEB) return G;
  G.GoogleSignin.configure({ webClientId: GOOGLE_WEB, iosClientId: GOOGLE_IOS });
  googleConfigured = true;
  return G;
}

type AuthState = {
  ready: boolean; // initial auth check done
  cloud: boolean; // Firebase configured
  uid: string | null;
  email: string | null; // signed-in user's email (from the auth provider)
  signedIn: boolean;
  isAnonymous: boolean;
  profile: Profile;
  appleAvailable: boolean;
  googleAvailable: boolean;
  /** Anonymous "guest" session; returns the uid (or null when offline). */
  ensureSignedIn: () => Promise<string | null>;
  saveProfile: (p: Partial<Profile>) => Promise<void>;
  signInEmail: (email: string, pw: string) => Promise<void>;
  signUpEmail: (email: string, pw: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInApple: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);
const PROFILE_KEY = 'shipbroker.profile.v1';
const SIGNED_KEY = 'shipbroker.signedIn.v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [localSignedIn, setLocalSignedIn] = useState(false);
  const [profile, setProfile] = useState<Profile>({});
  const [appleAvailable, setAppleAvailable] = useState(false);
  const profileRef = useRef<Profile>({});
  profileRef.current = profile;

  const persistProfile = useCallback((p: Profile) => {
    setProfile(p);
    AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p)).catch(() => {});
  }, []);

  // Load cached profile + local guest flag immediately.
  useEffect(() => {
    (async () => {
      try {
        const [p, s] = await Promise.all([AsyncStorage.getItem(PROFILE_KEY), AsyncStorage.getItem(SIGNED_KEY)]);
        if (p) setProfile(JSON.parse(p));
        if (s === '1') setLocalSignedIn(true);
      } catch {}
      if (!isConfigured || !auth) setReady(true);
    })();
  }, []);

  // Cloud: track auth state + hydrate / seed the profile. No auto-anonymous —
  // guest sessions are created explicitly via ensureSignedIn().
  useEffect(() => {
    if (!isConfigured || !auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        setIsAnonymous(user.isAnonymous);
        setUserEmail(user.email || null);
        if (firestore) {
          try {
            const snap = await getDoc(doc(firestore, 'users', user.uid));
            if (snap.exists()) {
              const data = snap.data() as Profile;
              persistProfile(data);
            } else if (!user.isAnonymous && (user.displayName || user.email)) {
              // First sign-in with a real provider — seed name/email from the credential.
              const seeded: Profile = {
                ...profileRef.current,
                name: profileRef.current.name || user.displayName || undefined,
                email: profileRef.current.email || user.email || undefined,
                createdAt: profileRef.current.createdAt ?? Date.now(),
              };
              persistProfile(seeded);
              try { await setDoc(doc(firestore, 'users', user.uid), seeded, { merge: true }); } catch {}
            }
          } catch {}
        }
      } else {
        setUid(null);
        setIsAnonymous(false);
        setUserEmail(null);
      }
      setReady(true);
    });
    return unsub;
  }, [persistProfile]);

  // Apple sign-in is iOS-only and device-dependent.
  useEffect(() => {
    const A = getApple();
    if (Platform.OS === 'ios' && A?.isAvailableAsync) {
      A.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
    }
  }, []);

  const ensureSignedIn = useCallback(async () => {
    // Local-only mode (no Firebase): the local flag is the sole signal.
    if (!isConfigured || !auth) {
      setLocalSignedIn(true);
      AsyncStorage.setItem(SIGNED_KEY, '1').catch(() => {});
      return null;
    }
    // Cloud mode: rely on a real (anonymous) Firebase user. Let failures throw so
    // the caller can surface them (e.g. Anonymous sign-in not enabled in Firebase).
    if (auth.currentUser) return auth.currentUser.uid;
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  }, []);

  const saveProfile = useCallback(
    async (p: Partial<Profile>) => {
      const merged: Profile = { ...profileRef.current, ...p, createdAt: profileRef.current.createdAt ?? Date.now() };
      persistProfile(merged);
      const id = (await ensureSignedIn()) ?? uid;
      if (firestore && id) {
        try { await setDoc(doc(firestore, 'users', id), merged, { merge: true }); } catch {}
      }
    },
    [uid, ensureSignedIn, persistProfile]
  );

  const signInEmail = useCallback(async (email: string, pw: string) => {
    if (!auth) throw new Error('Cloud auth is not configured');
    await signInWithEmailAndPassword(auth, email.trim(), pw);
  }, []);

  const signUpEmail = useCallback(async (email: string, pw: string) => {
    if (!auth) throw new Error('Cloud auth is not configured');
    await createUserWithEmailAndPassword(auth, email.trim(), pw);
  }, []);

  const signInGoogle = useCallback(async () => {
    if (!auth) throw new Error('Cloud auth is not configured');
    const G = configureGoogle();
    if (!G) throw new Error('Google sign-in needs a dev build (not available in Expo Go)');
    if (!GOOGLE_WEB) throw new Error('Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
    await G.GoogleSignin.hasPlayServices();
    const res = await G.GoogleSignin.signIn();
    const idToken = res?.idToken || res?.data?.idToken;
    if (!idToken) throw new Error('No ID token from Google');
    await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  }, []);

  const signInApple = useCallback(async () => {
    if (!auth) throw new Error('Cloud auth is not configured');
    const A = getApple();
    const C = getCrypto();
    if (!A || !C) throw new Error('Apple sign-in needs a dev build (not available in Expo Go)');
    // Firebase requires a SHA256-hashed nonce; the raw nonce verifies the token.
    const bytes: Uint8Array = C.getRandomValues(new Uint8Array(16));
    let rawNonce = '';
    for (let i = 0; i < bytes.length; i++) rawNonce += bytes[i].toString(16).padStart(2, '0');
    const hashedNonce = await C.digestStringAsync(C.CryptoDigestAlgorithm.SHA256, rawNonce);
    const credential = await A.signInAsync({
      requestedScopes: [A.AppleAuthenticationScope.FULL_NAME, A.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) throw new Error('No identity token from Apple');
    // Apple returns the full name only on first authorization — capture it now.
    if (credential.fullName?.givenName) {
      const nm = [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ');
      if (nm) persistProfile({ ...profileRef.current, name: profileRef.current.name || nm });
    }
    const provider = new OAuthProvider('apple.com');
    await signInWithCredential(auth, provider.credential({ idToken: credential.identityToken, rawNonce }));
  }, [persistProfile]);

  const signOut = useCallback(async () => {
    setLocalSignedIn(false);
    setProfile({});
    AsyncStorage.multiRemove([SIGNED_KEY, PROFILE_KEY]).catch(() => {});
    // Only touch the native Google module if we actually signed in with Google.
    // (Requiring it in Expo Go throws "RNGoogleSignin could not be found".)
    if (googleConfigured) {
      try {
        const G = getGoogle();
        await G?.GoogleSignin?.signOut();
      } catch {}
    }
    if (isConfigured && auth) {
      try { await fbSignOut(auth); } catch {}
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      cloud: isConfigured,
      uid,
      email: userEmail,
      // In cloud mode, "signed in" means a real Firebase user exists (anon or
      // provider). The local flag only gates the no-Firebase fallback.
      signedIn: isConfigured ? !!uid : localSignedIn,
      isAnonymous,
      profile,
      appleAvailable,
      googleAvailable: !!GOOGLE_WEB,
      ensureSignedIn,
      saveProfile,
      signInEmail,
      signUpEmail,
      signInGoogle,
      signInApple,
      signOut,
    }),
    [ready, uid, userEmail, localSignedIn, isAnonymous, profile, appleAvailable, ensureSignedIn, saveProfile, signInEmail, signUpEmail, signInGoogle, signInApple, signOut]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
