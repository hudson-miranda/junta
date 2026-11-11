import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ApiClient, type User, type Session } from '@junta/api-client';
import { syncPushDevice } from './push';
let webRefresh: string | null = null;
let referralCode: string | null = null;
export async function captureReferral(code: string, slug: string) {
  if (!/^[\w-]{1,80}$/.test(code)) return;
  referralCode = code;
  if (Platform.OS !== 'web') await SecureStore.setItemAsync('junta_referral', code);
  void api.request('/referrals/visit', 'POST', { code, productSlug: slug }).catch(() => {});
}
export async function getReferral() {
  return (
    referralCode ??
    (Platform.OS === 'web'
      ? undefined
      : ((await SecureStore.getItemAsync('junta_referral')) ?? undefined))
  );
}
export const api = new ApiClient(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000', {
  get: async () => (Platform.OS === 'web' ? webRefresh : SecureStore.getItemAsync('junta_refresh')),
  set: async (token) => {
    if (Platform.OS === 'web') {
      webRefresh = token;
      return;
    }
    if (token) await SecureStore.setItemAsync('junta_refresh', token);
    else await SecureStore.deleteItemAsync('junta_refresh');
  },
});
const Context = createContext<{
  user: User | null;
  ready: boolean;
  accept: (s: Session) => void;
  logout: () => Promise<void>;
}>({ user: null, ready: false, accept: () => {}, logout: async () => {} });
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false);
  useEffect(() => {
    void api.restore().then((s) => {
      setUser(s?.user ?? null);
      setReady(true);
    });
  }, []);
  useEffect(() => {
    if (user) void syncPushDevice(api).catch(() => {});
  }, [user?.id]);
  return (
    <Context.Provider
      value={{
        user,
        ready,
        accept: (s) => setUser(s.user),
        logout: async () => {
          try {
            await api.logout();
          } finally {
            setUser(null);
          }
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useSession = () => useContext(Context);
export function useRemote<T>(path: string) {
  const { user } = useSession(),
    scope = `${user?.id ?? 'public'}:${path}`;
  const [snapshot, setSnapshot] = useState<{ scope: string; data: T } | null>(null),
    [failure, setFailure] = useState<{ scope: string; message: string } | null>(null),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setFailure(null);
    void api
      .request<T>(path)
      .then((v) => {
        if (active) setSnapshot({ scope, data: v });
      })
      .catch((e) => {
        if (active)
          setFailure({
            scope,
            message: e instanceof Error ? e.message : 'Não foi possível carregar',
          });
      });
    return () => {
      active = false;
    };
  }, [path, scope, revision]);
  return {
    data: snapshot?.scope === scope ? snapshot.data : null,
    error: failure?.scope === scope ? failure.message : '',
    reload: () => setRevision((v) => v + 1),
  };
}
