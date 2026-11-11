// Keep email login usable in builds made before Facebook credentials are provisioned.
const facebookConfigured = Boolean(
  process.env.EXPO_PUBLIC_FACEBOOK_APP_ID && process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN,
);
module.exports = {
  dependencies: facebookConfigured
    ? {}
    : { 'react-native-fbsdk-next': { platforms: { android: null, ios: null } } },
};
