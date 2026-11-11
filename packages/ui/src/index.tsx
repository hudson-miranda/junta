'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useId,
  useRef,
  type ReactNode,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import {
  Search,
  Users,
  ArrowUpRight,
  Heart,
  Bell,
  ShoppingBag,
  Share2,
  X,
  Check,
  LogOut,
  SlidersHorizontal,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import {
  ApiClient,
  brl,
  type User,
  type Product,
  type Intent,
  type Notification,
  type Offer,
  type Session,
} from '@junta/api-client';
import { initMonitoring } from './monitoring';
import { SocialLogin } from './social';
export { reportClientError } from './monitoring';

export const api = new ApiClient(process.env.NEXT_PUBLIC_API_URL ?? '/api');
const Auth = createContext<{
  user: User | null;
  ready: boolean;
  open: () => void;
  accept: (s: Session) => void;
  logout: () => Promise<void>;
}>({ user: null, ready: false, open: () => {}, accept: () => {}, logout: async () => {} });
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : 'Não foi possível concluir. Tente novamente.';
export function Shell({
  children,
  mode = 'web',
}: {
  children: ReactNode;
  mode?: 'web' | 'admin' | 'merchant';
}) {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [modal, setModal] = useState(false);
  useEffect(() => {
    void initMonitoring();
    void api.restore().then((s) => {
      setUser(s?.user ?? null);
      setReady(true);
    });
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) {
      sessionStorage.setItem('junta_referral', ref);
      void api
        .request('/referrals/visit', 'POST', {
          code: ref,
          productSlug: window.location.pathname.split('/').pop(),
        })
        .catch(() => {});
    }
  }, []);
  async function logout() {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }
  const accept = (s: Session) => {
    setUser(s.user);
    setModal(false);
  };
  return (
    <Auth.Provider value={{ user, ready, open: () => setModal(true), accept, logout }}>
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="logo" aria-label="JUNTA início">
            <span className="brand-mark">
              <i />
              <i />
              <i />
            </span>
            junta<span className="logo-dot">.</span>
          </Link>
          {mode === 'web' ? (
            <nav aria-label="Menu principal">
              <Link href="/">Explorar</Link>
              <Link href="/me">Meus produtos</Link>
              <Link href="/notifications" aria-label="Notificações">
                <Bell size={20} />
              </Link>
            </nav>
          ) : (
            <span className="portal-label">{mode === 'admin' ? 'Operação' : 'Portal da loja'}</span>
          )}
          <div className="account">
            {user ? (
              <>
                <button className="user-button" onClick={() => window.location.assign('/settings')}>
                  {user.name}
                </button>
                <button className="icon-button" onClick={() => void logout()} aria-label="Sair">
                  <LogOut size={18} />
                </button>
              </>
            ) : mode === 'web' ? (
              <button className="button small" onClick={() => setModal(true)}>
                Entrar
              </button>
            ) : null}
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer>
        <div className="footer-inner">
          <span>junta. Comprar melhor começa junto.</span>
          <div>
            <Link href="/privacy">Privacidade</Link>
            <Link href="/terms">Termos</Link>
            <Link href="/delete-account">Excluir conta</Link>
          </div>
          <small>Beta · Preços e catálogo demonstrativos</small>
        </div>
      </footer>
      {modal && (
        <Modal onClose={() => setModal(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-label="Sua conta JUNTA">
            <button
              className="close icon-button"
              onClick={() => setModal(false)}
              aria-label="Fechar"
            >
              <X />
            </button>
            <LoginForm />
          </section>
        </Modal>
      )}
    </Auth.Provider>
  );
}
function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('input,button,select')?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      ref={ref}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onClose();
          return;
        }
        if (event.key !== 'Tab') return;
        const nodes = Array.from(
            ref.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input,select,textarea,a[href]',
            ) ?? [],
          ),
          first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      {children}
    </div>
  );
}
export function LoginForm() {
  const { accept } = useContext(Auth);
  const [signup, setSignup] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [forgot, setForgot] = useState(false),
    [notice, setNotice] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      if (forgot) {
        const result = await api.request<{ message: string }>('/auth/forgot', 'POST', {
          email: data.get('email'),
        });
        setNotice(result.message);
        return;
      }
      const email = String(data.get('email')),
        password = String(data.get('password'));
      accept(
        signup
          ? await api.signup({
              name: String(data.get('name')),
              email,
              password,
              referralCode: sessionStorage.getItem('junta_referral') ?? undefined,
            })
          : await api.login(email, password),
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-panel">
      <div className="auth-symbol">
        <Users />
      </div>
      <h2>
        {forgot ? 'Recuperar acesso' : signup ? 'Você já chega junto.' : 'Bom ter você aqui.'}
      </h2>
      <p>
        {signup
          ? 'Crie sua conta para juntar desejos e receber ofertas.'
          : 'Entre para acompanhar seus produtos e ofertas.'}
      </p>
      <form onSubmit={submit}>
        {signup && !forgot && (
          <label>
            Seu nome
            <input name="name" autoComplete="name" required minLength={2} />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        {!forgot && (
          <label>
            Senha
            <input
              name="password"
              aria-label="Senha"
              type="password"
              autoComplete={signup ? 'new-password' : 'current-password'}
              minLength={signup ? 12 : 1}
              required
            />
            {signup && <small>Use pelo menos 12 caracteres.</small>}
          </label>
        )}
        <Feedback error={error} notice={notice} />
        <button className="button full" disabled={busy}>
          {busy ? 'Aguarde…' : forgot ? 'Enviar instruções' : signup ? 'Criar conta' : 'Entrar'}
        </button>
      </form>
      {!forgot && <SocialLogin accept={accept} onError={setError} />}
      <button
        className="text-button"
        onClick={() => {
          setSignup(!signup);
          setForgot(false);
          setError('');
        }}
      >
        {signup ? 'Já tenho conta' : 'Criar uma conta'}
      </button>
      {!signup && (
        <button className="text-button" onClick={() => setForgot(!forgot)}>
          {forgot ? 'Voltar ao login' : 'Esqueci minha senha'}
        </button>
      )}
    </div>
  );
}
export function Feedback({ error, notice }: { error?: string; notice?: string }) {
  return (
    <>
      {error && (
        <p className="feedback error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="feedback success" role="status">
          <Check size={18} />
          {notice}
        </p>
      )}
    </>
  );
}
function useRemote<T>(path: string | null) {
  const { user } = useContext(Auth),
    scope = `${user?.id ?? 'public'}:${path ?? ''}`;
  const [snapshot, setSnapshot] = useState<{ scope: string; data: T } | null>(null),
    [failure, setFailure] = useState<{ scope: string; message: string } | null>(null),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    setFailure(null);
    void api
      .request<T>(path)
      .then((d) => {
        if (alive) setSnapshot({ scope, data: d });
      })
      .catch((e) => {
        if (alive) setFailure({ scope, message: errorText(e) });
      });
    return () => {
      alive = false;
    };
  }, [path, scope, revision]);
  return {
    data: path && snapshot?.scope === scope ? snapshot.data : null,
    error: failure?.scope === scope ? failure.message : '',
    reload: () => setRevision((n) => n + 1),
  };
}
export function ProductArt({
  kind = 'console',
  large = false,
}: {
  kind?: string;
  large?: boolean;
}) {
  const id = useId().replaceAll(':', '');
  return (
    <div className={`product-art art-${kind} ${large ? 'large' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 320 240" fill="none">
        <defs>
          <linearGradient id={id} x1="70" y1="30" x2="250" y2="210" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff" />
            <stop offset="1" stopColor="#d5dcf3" />
          </linearGradient>
        </defs>
        <ellipse cx="164" cy="208" rx="85" ry="12" fill="#172344" opacity=".09" />
        {kind === 'phone' ? (
          <g transform="rotate(12 160 120)">
            <rect x="111" y="27" width="99" height="177" rx="22" fill="#2549eb" />
            <rect x="117" y="32" width="88" height="165" rx="17" fill={`url(#${id})`} />
            <rect x="142" y="39" width="39" height="10" rx="5" fill="#172344" />
            <circle cx="140" cy="73" r="10" fill="#2549eb" />
            <circle cx="166" cy="73" r="10" fill="#172344" />
            <path d="M133 151Q172 78 201 128V180Q180 202 133 180Z" fill="#a9b9ff" />
          </g>
        ) : kind === 'laptop' ? (
          <g>
            <rect x="68" y="49" width="184" height="126" rx="10" fill="#172344" />
            <rect x="76" y="57" width="168" height="108" rx="4" fill="#b5c5ff" />
            <path d="M77 145L143 72L244 146V165H77Z" fill="#2549eb" />
            <path d="M68 175H252L278 192Q280 201 268 203H52Q40 201 42 192Z" fill={`url(#${id})`} />
            <path d="M136 176H184L190 186H130Z" fill="#aeb8d3" />
          </g>
        ) : kind === 'tv' ? (
          <g>
            <rect x="35" y="39" width="250" height="151" rx="8" fill="#172344" />
            <rect x="43" y="47" width="234" height="133" rx="3" fill="#aebfff" />
            <circle cx="195" cy="95" r="43" fill="#ff9f88" />
            <path d="M43 172L124 74L212 180H43Z" fill="#2549eb" />
            <path d="M149 191H171L184 207H136Z" fill="#172344" />
          </g>
        ) : kind === 'audio' ? (
          <g transform="rotate(-12 160 120)">
            <rect x="94" y="115" width="133" height="83" rx="31" fill={`url(#${id})`} />
            <path d="M94 139H227" stroke="#b8c2de" />
            <rect x="112" y="49" width="19" height="78" rx="9" fill="#fff" />
            <ellipse cx="117" cy="53" rx="20" ry="25" fill="#fff" />
            <ellipse cx="109" cy="52" rx="6" ry="11" fill="#172344" />
            <rect x="187" y="49" width="19" height="78" rx="9" fill="#fff" />
            <ellipse cx="202" cy="53" rx="20" ry="25" fill="#fff" />
            <ellipse cx="210" cy="52" rx="6" ry="11" fill="#172344" />
          </g>
        ) : kind === 'watch' ? (
          <g transform="rotate(18 160 120)">
            <rect x="137" y="15" width="50" height="210" rx="18" fill="#2549eb" />
            <rect x="110" y="69" width="102" height="108" rx="28" fill="#172344" />
            <rect x="118" y="77" width="86" height="92" rx="22" fill="#273757" />
            <circle cx="161" cy="123" r="30" stroke="#ff775e" strokeWidth="9" />
            <path d="M161 99V123L181 132" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            <path d="M123 35L165 28L176 191L115 202Z" fill="#172344" />
            <path d="M123 35Q96 103 112 202L141 190Q126 101 148 30Z" fill={`url(#${id})`} />
            <path d="M165 28Q192 106 182 195L163 191Q174 104 153 30Z" fill="#fff" />
            <path d="M174 69L179 159" stroke="#2549eb" strokeWidth="2" />
            <path
              d="M187 157Q197 148 219 158L239 180Q247 203 232 201L216 188H194L181 203Q167 204 173 184Z"
              fill={`url(#${id})`}
            />
            <path d="M190 169V181M184 175H196" stroke="#172344" strokeWidth="3" />
            <circle cx="222" cy="172" r="3" fill="#2549eb" />
            <circle cx="231" cy="180" r="3" fill="#ff775e" />
          </g>
        )}
      </svg>
    </div>
  );
}
export function Catalogue() {
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState('Todos');
  const { data, error, reload } = useRemote<{ items: Product[]; total: number }>(
    `/products?q=${encodeURIComponent(query)}`,
  );
  const products = data?.items.filter((p) => category === 'Todos' || p.category === category);
  return (
    <div className="container">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-note">
            <span className="live-dot" />
            Sua vontade ganha força aqui
          </div>
          <h1>Seu próximo desejo tem companhia.</h1>
          <p>
            Conte o que você quer, escolha quanto quer pagar.
            <br className="desktop" /> Juntos, a gente atrai ofertas melhores.
          </p>
          <a href="#explorar" className="button">
            Encontrar meu próximo desejo <ArrowUpRight size={19} />
          </a>
          <div className="hero-proof">
            <span className="avatars">
              <i>A</i>
              <i>L</i>
              <i>M</i>
              <i>+</i>
            </span>
            <span>
              Mais gente querendo.
              <br />
              <strong>Mais motivos para baixar o preço.</strong>
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-sticker">
            <Users size={18} /> A união faz a oferta
          </div>
          <ProductArt large />
          <div className="hero-demand">
            <div>
              <span className="live-dot" />
              PlayStation 5 Slim
            </div>
            <strong>Um desejo. Muitas vozes.</strong>
            <p>Defina seu preço-alvo e entre no grupo.</p>
            <span className="demand-track">
              <i />
            </span>
            <small>Acompanhe a demanda em tempo real</small>
          </div>
        </div>
      </section>
      <section id="explorar" className="catalogue">
        <div className="section-heading">
          <div>
            <h2>Qual é o seu próximo desejo?</h2>
            <p>Escolha um produto e faça parte da demanda.</p>
          </div>
          <span className="demo-badge">Catálogo demo</span>
        </div>
        <div className="catalogue-controls">
          <label className="search">
            <Search size={21} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="O que você quer comprar?"
              aria-label="Pesquisar produtos"
            />
            {query && (
              <button
                className="icon-button"
                onClick={() => setQuery('')}
                aria-label="Limpar busca"
              >
                <X size={18} />
              </button>
            )}
          </label>
          <span className="filter-caption">
            <SlidersHorizontal size={18} /> Encontre sua turma
          </span>
        </div>
        <div className="category-tabs" aria-label="Categorias">
          {['Todos', 'Games', 'Celulares', 'Computadores', 'TV e áudio', 'Wearables'].map((c) => (
            <button
              key={c}
              className={c === category ? 'selected' : ''}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        {error ? (
          <div className="empty">
            <Feedback error={error} />
            <button onClick={reload}>Tentar novamente</button>
          </div>
        ) : !products ? (
          <p className="loading">Buscando desejos…</p>
        ) : products.length === 0 ? (
          <div className="empty">
            <Search />
            <h3>Nenhum produto por aqui ainda.</h3>
            <p>Tente outro nome ou outra categoria.</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <Link className="product-card" key={p.id} href={`/p/${p.slug}`}>
                <div className="card-visual">
                  <ProductArt kind={p.illustration} />
                  <span className="heart">
                    <Heart size={18} />
                  </span>
                  {p.variants[0]?.offers.length > 0 && (
                    <span className="offer-badge">Tem oferta</span>
                  )}
                </div>
                <div className="card-body">
                  <small>{p.category}</small>
                  <h3>{p.name}</h3>
                  <p>{p.variants[0]?.name}</p>
                  <div className="card-price">
                    <span>Preço demo</span>
                    <strong>{brl(p.variants[0]?.demoPriceCents ?? 0)}</strong>
                  </div>
                  <div className="card-demand">
                    <Users size={16} />
                    <span>
                      <strong>{p.variants.reduce((a, v) => a + v.demand, 0)}</strong> pessoas querem
                    </span>
                    <span className="card-arrow">
                      <ArrowUpRight size={19} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="how">
        <div>
          <span className="round-icon">
            <Heart />
          </span>
          <h3>Seu desejo conta.</h3>
          <p>Escolha um produto e diga seu preço ideal.</p>
        </div>
        <div>
          <span className="round-icon coral">
            <Users />
          </span>
          <h3>Juntos chama atenção.</h3>
          <p>A demanda reunida chega até as lojas.</p>
        </div>
        <div>
          <span className="round-icon green">
            <ShoppingBag />
          </span>
          <h3>A oferta encontra você.</h3>
          <p>Receba o aviso e compre direto no parceiro.</p>
        </div>
      </section>
      <section className="manifesto">
        <h2>
          Comprar bem é bom.
          <br />
          Comprar melhor, juntos.
        </h2>
        <p>
          Sem pagar para participar.
          <br />
          Sem compromisso de compra.
        </p>
        <Users size={100} strokeWidth={1} />
      </section>
    </div>
  );
}
export function ProductDetails({ slug, initial }: { slug: string; initial?: Product }) {
  const { user, open } = useContext(Auth);
  const { data, error, reload } = useRemote<Product>(`/products/${encodeURIComponent(slug)}`);
  const p = data ?? initial;
  const [intentOpen, setIntentOpen] = useState(false),
    [notice, setNotice] = useState(''),
    [failure, setFailure] = useState(''),
    [busy, setBusy] = useState(false),
    [share, setShare] = useState('');
  const [key, setKey] = useState(''),
    [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (user) void api.analytics.track('product.view', { slug });
  }, [user, slug]);
  if (!p)
    return (
      <div className="container empty">
        <Feedback error={error} />
        <p>Carregando produto…</p>
        <button onClick={reload}>Tentar novamente</button>
      </div>
    );
  const variant = p.variants.find((v) => v.id === selected) ?? p.variants[0];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    setBusy(true);
    setFailure('');
    try {
      await api.intent(
        {
          variantId: String(values.get('variant')),
          horizon: String(values.get('horizon')) as 'WEEK' | 'MONTH' | 'ANYTIME',
          targetCents: Math.round(Number(values.get('price')) * 100),
        },
        key,
      );
      setNotice('Participação confirmada');
      setIntentOpen(false);
      reload();
    } catch (e) {
      setFailure(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function sharing() {
    if (!user) {
      open();
      return;
    }
    try {
      const result = await api.request<{ url: string }>(`/share/${p!.slug}`, 'POST', {});
      setShare(result.url);
      await navigator.clipboard?.writeText(result.url).catch(() => {});
    } catch (e) {
      setFailure(errorText(e));
    }
  }
  return (
    <div className="container detail">
      <Link className="back-link" href="/">
        <ArrowLeft size={17} />
        Explorar produtos
      </Link>
      <div className="detail-grid">
        <ProductArt kind={p.illustration} large />
        <div className="detail-copy">
          <span className="demo-badge">{p.category} · Demonstração</span>
          <h1>{p.name}</h1>
          <p>{p.description}</p>
          <label>
            Versão
            <select
              name="displayVariant"
              aria-label="Versão do produto"
              value={variant.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {p.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <div className="price-label">
            Preço de referência demo<strong>{brl(variant.demoPriceCents)}</strong>
            <small>Valor fictício, sem promessa de desconto.</small>
          </div>
          <div className="demand-panel">
            <Users />
            <div>
              <strong>{p.variants.reduce((a, v) => a + v.demand, 0)} pessoas querem</strong>
              <p>Seu preço-alvo ajuda a mostrar o tamanho da demanda.</p>
            </div>
          </div>
          <Feedback error={failure} notice={notice} />
          <button
            className="button full"
            onClick={() => {
              if (!user) {
                open();
                return;
              }
              setKey(crypto.randomUUID());
              setIntentOpen(true);
            }}
          >
            Eu quero <Heart size={18} />
          </button>
          <button className="button secondary full" onClick={() => void sharing()}>
            <Share2 size={18} />
            Compartilhar
          </button>
          {share && (
            <label>
              Link para compartilhar
              <input readOnly value={share} onFocus={(e) => e.currentTarget.select()} />
            </label>
          )}
          <p className="fine-print">
            <ShieldCheck size={15} /> Participar é grátis e não obriga você a comprar.
          </p>
          <a className="text-button" href={`junta://product/${p.slug}`}>
            Abrir no aplicativo
          </a>
          {process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL ? (
            <a className="text-button" href={process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL}>
              Baixar aplicativo
            </a>
          ) : (
            <small className="muted"> Aplicativo em beta interno.</small>
          )}
        </div>
      </div>
      {variant.offers.length > 0 && (
        <section className="offers-section">
          <h2>Ofertas para este desejo</h2>
          {variant.offers.map((o) => (
            <Link key={o.id} href={`/offer/${o.id}`} className="offer-row">
              <div>
                <strong>{o.merchant.name}</strong>
                <span>Válida até {new Date(o.endsAt).toLocaleDateString('pt-BR')}</span>
              </div>
              <strong>{brl(o.priceCents)}</strong>
              <ArrowUpRight />
            </Link>
          ))}
        </section>
      )}
      {intentOpen && (
        <Modal onClose={() => setIntentOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Participar da demanda"
          >
            <button
              className="close icon-button"
              onClick={() => setIntentOpen(false)}
              aria-label="Fechar"
            >
              <X />
            </button>
            <h2>Vamos buscar esse preço?</h2>
            <p>{p.name}</p>
            <form onSubmit={submit}>
              <label>
                Versão
                <select name="variant" defaultValue={variant.id}>
                  {p.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quando quer comprar?
                <select name="horizon">
                  <option value="WEEK">Esta semana</option>
                  <option value="MONTH">Este mês</option>
                  <option value="ANYTIME">Sem pressa</option>
                </select>
              </label>
              <label>
                Preço-alvo em reais
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="9999999.99"
                  placeholder="2999,00"
                  required
                />
              </label>
              <Feedback error={failure} />
              <button className="button full" disabled={busy}>
                {busy ? 'Confirmando…' : 'Confirmar participação'}
              </button>
            </form>
          </section>
        </Modal>
      )}
    </div>
  );
}
function Gate({ children }: { children: ReactNode }) {
  const { user, ready } = useContext(Auth);
  return !ready ? (
    <p className="loading">Carregando sua conta…</p>
  ) : !user ? (
    <div className="container login-page">
      <LoginForm />
    </div>
  ) : (
    <>{children}</>
  );
}
export function MyProducts() {
  const { user } = useContext(Auth);
  const { data, error, reload } = useRemote<{ items: Intent[] }>(user ? '/intents' : null);
  return (
    <Gate>
      <div className="container page">
        <h1>Meus produtos</h1>
        <p>Seus desejos, reunidos em um lugar.</p>
        <Feedback error={error} />
        {data?.items.length === 0 ? (
          <div className="empty">
            <Heart />
            <h2>Seu próximo desejo começa aqui.</h2>
            <Link className="button" href="/">
              Explorar produtos
            </Link>
          </div>
        ) : (
          data?.items.map((i) => (
            <div key={i.id} className="list-row">
              <ProductArt kind={i.variant.product.illustration} />
              <div>
                <Link href={`/p/${i.variant.product.slug}`}>
                  <h3>{i.variant.product.name}</h3>
                </Link>
                <p>
                  Seu preço-alvo: <strong>{brl(i.targetCents)}</strong>
                </p>
                <small>
                  {i.horizon === 'WEEK'
                    ? 'Esta semana'
                    : i.horizon === 'MONTH'
                      ? 'Este mês'
                      : 'Sem pressa'}
                </small>
              </div>
              <button
                className="text-button"
                onClick={() => void api.request(`/intents/${i.id}`, 'DELETE', {}).then(reload)}
              >
                Cancelar participação
              </button>
            </div>
          ))
        )}
      </div>
    </Gate>
  );
}
export function Inbox() {
  const { user } = useContext(Auth);
  const { data, error, reload } = useRemote<{ items: Notification[] }>(
    user ? '/notifications' : null,
  );
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(reload, 5000);
    return () => clearInterval(interval);
  }, [user]);
  return (
    <Gate>
      <div className="container page">
        <h1>Boas notícias para seus desejos.</h1>
        <p>Ofertas que chegaram ao seu preço-alvo.</p>
        <Feedback error={error} />
        {data?.items.length === 0 ? (
          <div className="empty">
            <Bell />
            <h2>A gente avisa quando chegar.</h2>
            <p>Seus alertas de oferta vão aparecer aqui.</p>
          </div>
        ) : (
          data?.items.map((n) => (
            <Link
              key={n.id}
              className="notification-row"
              href={`/offer/${n.offerId}`}
              onClick={() => void api.request(`/notifications/${n.id}`, 'PATCH', {})}
            >
              <span className="round-icon">
                <ShoppingBag />
              </span>
              <div>
                <h3>{n.title}</h3>
                <p>{n.body}</p>
              </div>
              <ArrowUpRight />
            </Link>
          ))
        )}
      </div>
    </Gate>
  );
}
export function OfferDetails({ id }: { id: string }) {
  const { user, open } = useContext(Auth);
  const { data, error } = useRemote<Offer>(`/offers/${id}`);
  const [failure, setFailure] = useState('');
  async function click() {
    if (!user) {
      open();
      return;
    }
    try {
      const { url } = await api.request<{ url: string }>(`/offers/${id}/click`, 'POST', {});
      window.location.assign(url);
    } catch (e) {
      setFailure(errorText(e));
    }
  }
  return (
    <div className="container page narrow">
      <span className="demo-badge">Oferta do parceiro</span>
      <h1>{data?.variant?.product.name ?? 'Sua oferta'}</h1>
      <Feedback error={error || failure} />
      {data && (
        <>
          <ProductArt kind={data.variant?.product.illustration} />
          <h2>{brl(data.priceCents)}</h2>
          <p>
            {data.merchant.name} · Até {new Date(data.endsAt).toLocaleString('pt-BR')}
          </p>
          <button className="button full" onClick={() => void click()}>
            Ver oferta <ArrowUpRight size={18} />
          </button>
          <p className="fine-print">
            Você será levado ao site da loja. O JUNTA pode receber comissão por uma compra no
            parceiro.
          </p>
        </>
      )}
    </div>
  );
}
export function Settings() {
  const { user, logout } = useContext(Auth);
  const [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [deleting, setDeleting] = useState(false);
  return (
    <Gate>
      <div className="container page narrow">
        <h1>Sua conta</h1>
        <p>{user?.email}</p>
        <h2>Quais avisos quer receber?</h2>
        {user && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              try {
                await api.request(
                  '/me/preferences',
                  'PATCH',
                  Object.fromEntries(
                    ['offers', 'priceAlerts', 'campaigns', 'marketing'].map((k) => [
                      k,
                      form.get(k) === 'on',
                    ]),
                  ),
                );
                setNotice('Preferências salvas');
              } catch (e) {
                setError(errorText(e));
              }
            }}
          >
            {[
              ['offers', 'Ofertas para seus produtos'],
              ['priceAlerts', 'Alertas de preço'],
              ['campaigns', 'Campanhas'],
              ['marketing', 'Novidades e promoções'],
            ].map(([key, label]) => (
              <label className="check-label" key={key}>
                <input
                  type="checkbox"
                  name={key}
                  defaultChecked={user.preferences[key as keyof User['preferences']]}
                />
                {label}
              </label>
            ))}
            <button className="button">Salvar preferências</button>
          </form>
        )}
        <Feedback error={error} notice={notice} />
        <hr />
        <button className="text-button danger" onClick={() => setDeleting(true)}>
          Excluir minha conta
        </button>
        {deleting && (
          <div className="deletion">
            <p>
              A exclusão encerra suas participações e remove seus dados de identificação. Não é
              possível desfazer.
            </p>
            <button
              className="button danger"
              onClick={async () => {
                try {
                  await api.request('/me', 'DELETE');
                  await logout().catch(() => {});
                  window.location.assign('/');
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            >
              Confirmar exclusão da conta
            </button>
            <button className="text-button" onClick={() => setDeleting(false)}>
              Manter minha conta
            </button>
          </div>
        )}
      </div>
    </Gate>
  );
}
export function ResetPassword() {
  const [notice, setNotice] = useState(''),
    [error, setError] = useState('');
  return (
    <div className="container page narrow">
      <h1>Uma nova senha.</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          try {
            await api.request('/auth/reset', 'POST', {
              token: new URLSearchParams(window.location.search).get('token'),
              password: data.get('password'),
            });
            setNotice('Senha alterada. Entre novamente com sua nova senha.');
          } catch (e) {
            setError(errorText(e));
          }
        }}
      >
        <label>
          Nova senha
          <input
            name="password"
            aria-label="Senha"
            type="password"
            minLength={12}
            required
            autoComplete="new-password"
          />
        </label>
        <button className="button">Salvar nova senha</button>
      </form>
      <Feedback error={error} notice={notice} />
    </div>
  );
}
export { Operations } from './operations';
export { Auth, useRemote, errorText };
