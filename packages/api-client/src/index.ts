import type { paths } from './generated';
import { Analytics } from './analytics';
export { Analytics } from './analytics';
export type { paths as OpenApiPaths } from './generated';
export type IntentInput = paths['/intents']['post']['requestBody']['content']['application/json'];
export type OfferInput = paths['/offers']['post']['requestBody']['content']['application/json'];
export type ProductInput =
  paths['/admin/products']['post']['requestBody']['content']['application/json'];
export type SignupInput =
  paths['/auth/signup']['post']['requestBody']['content']['application/json'];
export type CampaignInput =
  paths['/admin/campaigns']['post']['requestBody']['content']['application/json'];
export type User = {
  id: string;
  name: string;
  email: string;
  role: 'CONSUMER' | 'MERCHANT' | 'ANALYST' | 'ADMIN';
  referralCode: string;
  preferences: { offers: boolean; priceAlerts: boolean; campaigns: boolean; marketing: boolean };
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  illustration: string;
  imageUrl?: string | null;
  variants: Variant[];
};
export type Variant = {
  id: string;
  name: string;
  demoPriceCents: number;
  demand: number;
  offers: Offer[];
};
export type Offer = {
  id: string;
  priceCents: number;
  url: string;
  startsAt: string;
  endsAt: string;
  merchant: { id: string; name: string };
  variant?: { product: Product };
};
export type Intent = {
  id: string;
  targetCents: number;
  horizon: string;
  variant: { product: Product; name: string };
};
export type Notification = {
  id: string;
  title: string;
  body: string;
  offerId: string;
  readAt: string | null;
};
export type Overview = {
  pools: {
    id: string;
    count: number;
    horizon: string;
    variant: { id: string; name: string; product: Product };
  }[];
  offers: Offer[];
  merchants: { id: string; name: string; approved: boolean }[];
  events: { name: string; _count: number }[];
  intents: Intent[];
  campaigns: { id: string; name: string; threshold: number }[];
};
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
  }
}
export type Session = { user: User; accessToken: string; refreshToken?: string };
export interface SessionStorage {
  get: () => Promise<string | null>;
  set: (token: string | null) => Promise<void>;
}
export async function browserRefreshLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks)
    return navigator.locks.request('junta-session-refresh', action);
  return action();
}
export class ApiClient {
  readonly analytics = new Analytics({
    track: async (name, properties) => {
      await this.request('/analytics', 'POST', { name, properties });
    },
  });
  token: string | null = null;
  private refreshPromise: Promise<Session | null> | null = null;
  private identity: string | null = null;
  constructor(
    readonly base: string,
    readonly storage?: SessionStorage,
    readonly coordinateRefresh: <T>(action: () => Promise<T>) => Promise<T> = browserRefreshLock,
  ) {}
  async request<T>(
    path: string,
    method = 'GET',
    body?: unknown,
    key?: string,
    retry = true,
  ): Promise<T> {
    let response: Response;
    const startedToken = this.token,
      startedIdentity = this.identity;
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 15000);
    try {
      response = await fetch(this.base + path, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          ...(key ? { 'Idempotency-Key': key } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw new ApiError('Sem conexão com o JUNTA. Confira sua rede e tente novamente.', 0);
    } finally {
      clearTimeout(timer);
    }
    if (response.status === 401 && retry && !path.startsWith('/auth')) {
      if (startedIdentity && this.identity !== startedIdentity)
        throw new ApiError('Sua conta mudou. Tente novamente.', 401);
      if (this.token && this.token !== startedToken)
        return this.request(path, method, body, key, false);
      if (await this.restore()) return this.request(path, method, body, key, false);
    }
    const value = await response
      .json()
      .catch(() => ({ message: 'Serviço temporariamente indisponível. Tente novamente.' }));
    if (!response.ok)
      throw new ApiError(
        value.message ?? 'Não foi possível concluir',
        response.status,
        value.requestId,
      );
    return value as T;
  }
  async accept(session: Session) {
    this.token = session.accessToken;
    this.identity = session.user.id;
    if (session.refreshToken && this.storage) await this.storage.set(session.refreshToken);
    return session;
  }
  async login(email: string, password: string) {
    return this.accept(await this.request<Session>('/auth/login', 'POST', { email, password }));
  }
  async signup(input: SignupInput) {
    return this.accept(await this.request<Session>('/auth/signup', 'POST', input));
  }
  async oauth(provider: 'google' | 'apple' | 'facebook', idToken: string, nonce?: string) {
    return this.accept(
      await this.request<Session>(
        `/auth/oauth/${provider}`,
        'POST',
        provider === 'facebook'
          ? { accessToken: idToken, ...(nonce ? { nonce } : {}) }
          : { idToken },
      ),
    );
  }
  restore() {
    if (!this.refreshPromise)
      this.refreshPromise = this.coordinateRefresh(async () => {
        try {
          const refreshToken = await this.storage?.get();
          const session = await this.request<Session>(
            '/auth/refresh',
            'POST',
            { ...(refreshToken ? { refreshToken } : {}) },
            undefined,
            false,
          );
          return await this.accept(session);
        } catch (error) {
          this.token = null;
          if (error instanceof ApiError && [400, 401, 403].includes(error.status))
            await this.storage?.set(null);
          return null;
        } finally {
          this.refreshPromise = null;
        }
      });
    return this.refreshPromise;
  }
  async logout() {
    try {
      await this.request('/auth/logout', 'POST', {});
    } finally {
      this.token = null;
      this.identity = null;
      await this.storage?.set(null);
    }
  }
  products(q = '') {
    return this.request<{ items: Product[]; total: number }>(
      `/products?q=${encodeURIComponent(q)}`,
    );
  }
  product(slug: string) {
    return this.request<Product>(`/products/${encodeURIComponent(slug)}`);
  }
  intent(input: IntentInput, key: string) {
    return this.request<Intent>('/intents', 'POST', input, key);
  }
  intents() {
    return this.request<{ items: Intent[] }>('/intents');
  }
  offer(id: string) {
    return this.request<Offer>(`/offers/${id}`);
  }
  notifications() {
    return this.request<{ items: Notification[] }>('/notifications');
  }
  overview(mode: 'admin' | 'merchant') {
    return this.request<Overview>(`/${mode}/overview`);
  }
}
export const brl = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
