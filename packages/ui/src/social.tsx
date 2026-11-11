'use client';
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import type { Session } from '@junta/api-client';
import { api } from './index';
type IdentityWindow = Window & {
  FB?: {
    init: (o: object) => void;
    login: (
      cb: (result: { authResponse?: { accessToken: string } }) => void,
      options: object,
    ) => void;
  };
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
    apple = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
    facebook = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const [providers, setProviders] = useState({ google: false, apple: false, facebook: false });
  const [appleReady, setAppleReady] = useState(false);
  const [facebookReady, setFacebookReady] = useState(false);
  useEffect(() => {
    void api
      .request<typeof providers>('/auth/providers')
      .then(setProviders)
      .catch(() => {});
  }, []);
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
  function signFacebook() {
    const sdk = (window as IdentityWindow).FB;
    if (!sdk) return;
    sdk.login(
      (response) => {
        if (response.authResponse?.accessToken)
          void api.oauth('facebook', response.authResponse.accessToken).then(accept).catch(failure);
        else onError('Login cancelado. Você pode tentar novamente ou entrar com email.');
      },
      { scope: 'public_profile,email', return_scopes: true },
    );
  }
  return (
    <div className="social-login" aria-label="Outras formas de entrar">
      <div className="auth-divider">
        <span>ou continue com</span>
      </div>
      {google && providers.google ? (
        <>
          <Script
            src="https://accounts.google.com/gsi/client"
            onReady={initGoogle}
            onError={() =>
              onError('Não foi possível carregar o Google. Entre com email ou tente novamente.')
            }
          />
          <div className="google-login" ref={ref} />
        </>
      ) : (
        <button type="button" className="social-button" disabled>
          <ProviderIcon provider="google" />
          Continuar com Google<span>Em breve</span>
        </button>
      )}
      {apple && providers.apple && (
        <Script
          src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
          onReady={() => setAppleReady(true)}
          onError={() =>
            onError('Não foi possível carregar a Apple. Entre com email ou tente novamente.')
          }
        />
      )}
      <button
        type="button"
        className="social-button"
        disabled={!apple || !providers.apple || !appleReady}
        onClick={() => void signApple()}
      >
        <ProviderIcon provider="apple" />
        Continuar com Apple{(!apple || !providers.apple) && <span>Em breve</span>}
      </button>
      {facebook && providers.facebook && (
        <Script
          src="https://connect.facebook.net/pt_BR/sdk.js"
          onReady={() => {
            (window as IdentityWindow).FB?.init({
              appId: facebook,
              version: process.env.NEXT_PUBLIC_FACEBOOK_GRAPH_VERSION ?? 'v25.0',
              xfbml: false,
              autoLogAppEvents: false,
            });
            setFacebookReady(true);
          }}
          onError={() =>
            onError('Não foi possível carregar o Facebook. Entre com email ou tente novamente.')
          }
        />
      )}
      <button
        type="button"
        className="social-button"
        disabled={!facebook || !providers.facebook || !facebookReady}
        onClick={signFacebook}
      >
        <ProviderIcon provider="facebook" />
        Continuar com Facebook{(!facebook || !providers.facebook) && <span>Em breve</span>}
      </button>
      {(!google ||
        !apple ||
        !facebook ||
        !providers.google ||
        !providers.apple ||
        !providers.facebook) && (
        <small className="social-notice">
          As opções marcadas “Em breve” ainda não estão disponíveis. Você já pode entrar com email.
        </small>
      )}
    </div>
  );
}
function ProviderIcon({ provider }: { provider: 'google' | 'apple' | 'facebook' }) {
  if (provider === 'google')
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="#4285f4"
          d="M22 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.6a4.8 4.8 0 0 1-2.1 3.2v2.7h3.4c2-1.9 3.1-4.6 3.1-7.9Z"
        />
        <path
          fill="#34a853"
          d="M12 22c2.8 0 5.1-.9 6.9-2.5l-3.4-2.7c-1 .6-2.2 1-3.5 1-2.7 0-5-1.8-5.8-4.2H2.7v2.8A10.4 10.4 0 0 0 12 22Z"
        />
        <path fill="#fbbc05" d="M6.2 13.6a6.2 6.2 0 0 1 0-3.2V7.6H2.7a10 10 0 0 0 0 8.8Z" />
        <path
          fill="#ea4335"
          d="M12 6.2c1.5 0 2.8.5 3.9 1.5L19 4.6A10 10 0 0 0 2.7 7.6l3.5 2.8C7 8 9.3 6.2 12 6.2Z"
        />
      </svg>
    );
  if (provider === 'facebook')
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#1877f2" />
        <path
          fill="#fff"
          d="M13.5 23v-8.5h2.8l.5-3.3h-3.3V9.1c0-.9.4-1.8 1.9-1.8H17V4.5s-1.4-.3-2.8-.3c-2.9 0-4.8 1.7-4.8 5v2H6.2v3.3h3.2V23Z"
        />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.1 12.8c0-2 1.7-3 1.8-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.2-2.5.8-3.2.8-.6 0-1.7-.8-2.8-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .8 1 1.6 2.2 2.8 2.1 1.1 0 1.5-.7 2.9-.7s1.8.7 3 .7c1.2 0 2-1 2.7-2.1.9-1.2 1.2-2.4 1.2-2.4-.1 0-2.8-1.1-2.8-4.1ZM15 6.7c.6-.8 1.1-1.9 1-3-.9 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1.1 2.9 1.1.1 2.2-.5 2.9-1.4Z"
      />
    </svg>
  );
}
