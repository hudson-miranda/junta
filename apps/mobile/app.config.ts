import type { ExpoConfig } from 'expo/config';
const projectId = process.env.EAS_PROJECT_ID;
const config: ExpoConfig = {
  name: 'JUNTA',
  slug: 'junta',
  scheme: 'junta',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  splash: { image: './assets/splash.png', backgroundColor: '#2549eb', resizeMode: 'contain' },
  ios: {
    bundleIdentifier: 'br.com.junta.app',
    buildNumber: '1',
    supportsTablet: true,
    usesAppleSignIn: true,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
    privacyManifests: { NSPrivacyAccessedAPITypes: [] },
  },
  android: {
    package: 'br.com.junta.app',
    versionCode: 1,
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#2549eb' },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: 'junta.app', pathPrefix: '/p' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: { bundler: 'metro', output: 'single', favicon: './assets/icon.png' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-notifications',
    'expo-dev-client',
    'expo-apple-authentication',
    ...(process.env.EXPO_PUBLIC_FACEBOOK_APP_ID && process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN
      ? [
          [
            'react-native-fbsdk-next',
            {
              appID: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID,
              clientToken: process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN,
              displayName: 'JUNTA',
              scheme: `fb${process.env.EXPO_PUBLIC_FACEBOOK_APP_ID}`,
              advertiserIDCollectionEnabled: false,
              autoLogAppEventsEnabled: false,
              isAutoInitEnabled: false,
            },
          ] as [string, object],
        ]
      : []),
    ...(process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
      ? [
          [
            '@react-native-google-signin/google-signin',
            { iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME },
          ] as [string, { iosUrlScheme: string }],
        ]
      : []),
  ],
  experiments: { typedRoutes: true },
  extra: {
    ...(projectId ? { eas: { projectId } } : {}),
    privacyUrl: 'https://junta.app/privacy',
    accountDeletionUrl: 'https://junta.app/delete-account',
  },
  runtimeVersion: { policy: 'appVersion' },
  ...(projectId
    ? { updates: { url: `https://u.expo.dev/${projectId}` } }
    : { updates: { enabled: false } }),
};
export default config;
