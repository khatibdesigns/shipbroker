// Dynamic Expo config so the Google iOS URL scheme (REVERSED_CLIENT_ID) can be
// injected from .env at build time.
const googleIosUrlScheme =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ||
  'com.googleusercontent.apps.PLACEHOLDER'; // replaced once the real value is in .env

export default {
  expo: {
    name: 'ShipBroker',
    slug: 'shipbroker',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'shipbroker',
    userInterfaceStyle: 'light',
    backgroundColor: '#FFFFFF',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.khd.shipbroker',
      buildNumber: '1',
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
      googleServicesFile: './google-services.json',
      usesCleartextTraffic: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-font',
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
