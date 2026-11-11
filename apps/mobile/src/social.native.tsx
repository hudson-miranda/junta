import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import * as Apple from 'expo-apple-authentication';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import type { Session } from '@junta/api-client';
import { api } from './session';
import { Button } from './ui';
export function SocialLogin({
  accept,
  onError,
}: {
  accept: (session: Session) => void;
  onError: (message: string) => void;
}) {
  const [apple, setApple] = useState(false);
  const [providers, setProviders] = useState({ google: false, apple: false, facebook: false });
  const facebookId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
  const facebookClientToken = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN;
  useEffect(() => {
    void api
      .request<typeof providers>('/auth/providers')
      .then(setProviders)
      .catch(() => {});
    if (Platform.OS === 'ios') void Apple.isAvailableAsync().then(setApple);
    if (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID)
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      });
  }, []);
  async function google() {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response) && response.data.idToken)
        accept(await api.oauth('google', response.data.idToken));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Não foi possível entrar com Google');
    }
  }
  async function appleLogin() {
    try {
      const response = await Apple.signInAsync({
        requestedScopes: [
          Apple.AppleAuthenticationScope.EMAIL,
          Apple.AppleAuthenticationScope.FULL_NAME,
        ],
      });
      if (response.identityToken) accept(await api.oauth('apple', response.identityToken));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Não foi possível entrar com Apple');
    }
  }
  async function facebookLogin() {
    try {
      if (!facebookId || !facebookClientToken) return;
      const { AccessToken, AuthenticationToken, LoginManager, Settings } =
        await import('react-native-fbsdk-next');
      Settings.setAppID(facebookId);
      Settings.setClientToken(facebookClientToken);
      Settings.initializeSDK();
      const challenge =
        Platform.OS === 'ios'
          ? await api.request<{ nonce: string }>('/auth/oauth/facebook/challenge', 'POST', {})
          : undefined;
      const response = await LoginManager.logInWithPermissions(
        ['public_profile', 'email'],
        'limited',
        challenge?.nonce,
      );
      if (response.isCancelled) return;
      const token =
        Platform.OS === 'ios'
          ? (await AuthenticationToken.getAuthenticationTokenIOS())?.authenticationToken
          : (await AccessToken.getCurrentAccessToken())?.accessToken;
      if (!token) throw new Error('Não foi possível confirmar sua conta Facebook.');
      accept(await api.oauth('facebook', token, challenge?.nonce));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Não foi possível entrar com Facebook');
    }
  }
  const googleAvailable = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID && providers.google);
  const appleAvailable = Boolean(
    apple && process.env.EXPO_PUBLIC_APPLE_CLIENT_ID && providers.apple,
  );
  const facebookAvailable = Boolean(facebookId && facebookClientToken && providers.facebook);
  return (
    <View style={{ gap: 10 }}>
      <Button secondary disabled={!googleAvailable} onPress={() => void google()}>
        Continuar com Google{!googleAvailable ? ' · Em breve' : ''}
      </Button>
      {appleAvailable ? (
        <Apple.AppleAuthenticationButton
          buttonType={Apple.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={Apple.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={10}
          style={{ height: 50, width: '100%' }}
          onPress={() => void appleLogin()}
        />
      ) : (
        <Button secondary disabled onPress={() => {}}>
          Continuar com Apple · {Platform.OS === 'ios' ? 'Em breve' : 'Disponível no iOS'}
        </Button>
      )}
      <Button secondary disabled={!facebookAvailable} onPress={() => void facebookLogin()}>
        Continuar com Facebook{!facebookAvailable ? ' · Em breve' : ''}
      </Button>
    </View>
  );
}
