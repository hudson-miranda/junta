'use client';
import { useRef } from 'react';
import Script from 'next/script';
import type { Session } from '@junta/api-client';
import { api } from './index';
type IdentityWindow = Window & {
  google?: {
    accounts: {
      id: {
        initialize: (o: {
          client_id: string;
          callback: (response: { credential: string }) => void;
        }) => void;
        renderButton: (element: HTMLElement, o: object) => void;
      };
    };
  };
  AppleID?: {
    auth: {
      init: (o: object) => void;
      signIn: () => Promise<{ authorization: { id_token: string } }>;
    };
  };
};
export function SocialLogin({
  accept,
  onError,
}: {
  accept: (session: Session) => void;
  onError: (message: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    google = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    apple = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
  const failure = (e: unknown) =>
    onError(e instanceof Error ? e.message : 'Não foi possível entrar com este provedor.');
  function initGoogle() {
    const sdk = (window as IdentityWindow).google;
    if (!google || !sdk || !ref.current) return;
    sdk.accounts.id.initialize({
      client_id: google,
      callback: (result) => void api.oauth('google', result.credential).then(accept).catch(failure),
    });
    sdk.accounts.id.renderButton(ref.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      locale: 'pt-BR',
    });
  }
  async function signApple() {
    try {
      const sdk = (window as IdentityWindow).AppleID;
      if (!sdk) throw new Error('Aguarde o carregamento do login Apple.');
      sdk.auth.init({
        clientId: apple,
        scope: 'name email',
        redirectURI: process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ?? window.location.origin,
        usePopup: true,
      });
      const response = await sdk.auth.signIn();
      accept(await api.oauth('apple', response.authorization.id_token));
    } catch (e) {
      failure(e);
    }
  }
  return (
    <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
      {google && (
        <>
          <Script src="https://accounts.google.com/gsi/client" onReady={initGoogle} />
          <div ref={ref} />
        </>
      )}
      {apple && (
        <>
          <Script src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js" />
          <button className="button secondary" onClick={() => void signApple()}>
            Continuar com Apple
          </button>
        </>
      )}
    </div>
  );
}
