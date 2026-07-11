// Dynamic Expo config so the Google iOS URL scheme (REVERSED_CLIENT_ID) can be
// injected from .env at build time.
const googleIosUrlScheme =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ||
  'com.googleusercontent.apps.PLACEHOLDER'; // replaced once the real value is in .env

export default {
  expo: {
    name: 'ShipBroker',
    slug: 'shipbroker',
    version: '1.0.1',
    orientation: 'portrait',
    scheme: 'shipbroker',
    userInterfaceStyle: 'light',
    backgroundColor: '#FFFFFF',
    icon: './assets/icon.png',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.khd.shipbroker',
      buildNumber: '5',
      usesAppleSignIn: true,
      // Used by native / EAS builds. Ignored in Expo Go.
      googleServicesFile: './GoogleService-Info.plist',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription:
          'ShipBroker uses your camera so the AI agent can see and identify the item you want to ship.',
        NSPhotoLibraryUsageDescription:
          'ShipBroker lets you attach a photo of your item so the AI agent can identify it and prefill your shipment.',
        // The AI-agent proxy on EC2 is plain HTTP — allow cleartext to that host.
        NSAppTransportSecurity: {
          NSExceptionDomains: {
            '16.16.79.251': {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: false,
            },
          },
        },
      },
    },
    android: {
      package: 'com.khd.shipbroker',
      versionCode: 5,
      googleServicesFile: './google-services.json',
      usesCleartextTraffic: true,
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#00B4C4',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-font',
      'expo-notifications',
      // Splash: a fixed-width centred logo on teal — never clipped (contain).
      [
        'expo-splash-screen',
        {
          image: './assets/icon.png',
          imageWidth: 180,
          resizeMode: 'contain',
          backgroundColor: '#00C2B2',
        },
      ],
      'expo-apple-authentication',
      ['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }],
      [
        'expo-image-picker',
        {
          photosPermission: 'Attach a photo of your item so the AI agent can identify it.',
          cameraPermission: 'Take a photo of your item so the AI agent can identify it.',
        },
      ],
    ],
  },
};
