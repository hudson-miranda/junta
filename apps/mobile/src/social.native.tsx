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
  useEffect(() => {
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
  return (
    <View style={{ gap: 10 }}>
      {process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID && (
        <Button secondary onPress={() => void google()}>
          Continuar com Google
        </Button>
      )}
      {apple && process.env.EXPO_PUBLIC_APPLE_CLIENT_ID && (
        <Apple.AppleAuthenticationButton
          buttonType={Apple.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={Apple.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={10}
          style={{ height: 50, width: '100%' }}
          onPress={() => void appleLogin()}
        />
      )}
    </View>
  );
}
