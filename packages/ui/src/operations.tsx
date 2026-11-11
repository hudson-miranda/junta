'use client';
import { useContext, useState, type FormEvent } from 'react';
import { Users, ShoppingBag, MousePointerClick, TrendingUp } from 'lucide-react';
import { brl, type Overview, type Product } from '@junta/api-client';
import { Auth, api, useRemote, errorText, LoginForm, Feedback, ProductPhoto } from './index';
export function Operations({ mode }: { mode: 'admin' | 'merchant' }) {
  const { user, ready } = useContext(Auth),
    { data, error, reload } = useRemote<Overview>(user ? `/${mode}/overview` : null),
    { data: catalogue, reload: reloadCatalogue } = useRemote<{ items: Product[] }>('/products');
  const [notice, setNotice] = useState(''),
    [failure, setFailure] = useState(''),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState<Product | null>(null);
  if (!ready) return <p className="loading">Carregando operação…</p>;
  if (!user)
    return (
      <div className="container login-page">
        <LoginForm />
      </div>
    );
  if (
    (mode === 'admin' && !['ADMIN', 'ANALYST'].includes(user.role)) ||
    (mode === 'merchant' && user.role !== 'MERCHANT')
  )
    return (
      <div className="container empty">
        <h1>Acesso não permitido.</h1>
        <p>Entre com uma conta autorizada para este portal.</p>
      </div>
    );
  const mutate = user.role !== 'ANALYST';
  const variants =
    catalogue?.items.flatMap((p) => p.variants.map((v) => ({ ...v, productName: p.name }))) ?? [];
  async function publish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setFailure('');
    setNotice('');
    try {
      await api.request('/offers', 'POST', {
        variantId: f.get('variant'),
        merchantId: mode === 'admin' ? f.get('merchant') : undefined,
        priceCents: Math.round(Number(f.get('price')) * 100),
        url: f.get('url'),
        startsAt: new Date(Date.now() - 1000).toISOString(),
        endsAt: new Date(String(f.get('endsAt'))).toISOString(),
      });
      setNotice('Oferta publicada');
      reload();
    } catch (e) {
      setFailure(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setFailure('');
    setNotice('');
    try {
      await api.request(
        edit ? `/admin/products/${edit.id}` : '/admin/products',
        edit ? 'PATCH' : 'POST',
        {
          name: f.get('name'),
          description: f.get('description'),
          category: f.get('category'),
          illustration: f.get('illustration'),
          ...(f.get('imageUrl') ? { imageUrl: f.get('imageUrl') } : {}),
          variantName: f.get('variantName'),
          demoPriceCents: Math.round(Number(f.get('price')) * 100),
        },
      );
      setNotice('Produto salvo');
      setEdit(null);
      reloadCatalogue();
    } catch (e) {
      setFailure(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const metric = [
    {
      label: 'Pessoas na demanda',
      value: data?.pools.reduce((a, p) => a + p.count, 0) ?? 0,
      icon: Users,
    },
    { label: 'Ofertas publicadas', value: data?.offers.length ?? 0, icon: ShoppingBag },
    {
      label: 'Cliques em ofertas',
      value: data?.events.find((x) => x.name === 'offer.click')?._count ?? 0,
      icon: MousePointerClick,
    },
    {
      label: 'Intenções criadas',
      value: data?.events.find((x) => x.name === 'intent.creation')?._count ?? 0,
      icon: TrendingUp,
    },
  ];
  return (
    <div className="container operations page">
      <div className="section-heading">
        <div>
          <span className="demo-badge">Ambiente beta</span>
          <h1>{mode === 'admin' ? 'O pulso do JUNTA.' : 'A demanda já está aqui.'}</h1>
          <p>
            {mode === 'admin'
              ? 'Catálogo, comunidade e resultados em uma visão.'
              : 'Veja o que as pessoas querem e crie a próxima boa oferta.'}
          </p>
        </div>
        <button className="button secondary" onClick={reload}>
          Atualizar
        </button>
      </div>
      <Feedback error={error || failure} notice={notice} />
      <div className="metrics">
        {metric.map((m) => (
          <div key={m.label}>
            <m.icon size={22} />
            <strong>{m.value}</strong>
            <span>{m.label}</span>
          </div>
        ))}
      </div>
      <section className="ops-panel">
        <h2>Demanda coletiva</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Prazo</th>
                <th>Pessoas interessadas</th>
              </tr>
            </thead>
            <tbody>
              {data?.pools.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="ops-product">
                      <ProductPhoto product={p.variant.product} />
                      <span>
                        {p.variant.product.name}
                        <small>{p.variant.name}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    {p.horizon === 'WEEK'
                      ? 'Esta semana'
                      : p.horizon === 'MONTH'
                        ? 'Este mês'
                        : 'Sem pressa'}
                  </td>
                  <td>
                    <strong>{p.count}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.pools.length === 0 && (
          <p className="muted">As intenções dos consumidores aparecerão aqui.</p>
        )}
      </section>
      {mutate && (
        <section className="ops-panel">
          <h2>Uma boa oferta começa aqui.</h2>
          <form className="ops-form" onSubmit={publish}>
            <label>
              Produto da oferta
              <select name="variant" required>
                <option value="">Selecione o produto</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.productName} — {v.name}
                  </option>
                ))}
              </select>
            </label>
            {mode === 'admin' && (
              <label>
                Loja
                <select name="merchant" required>
                  {data?.merchants
                    .filter((m) => m.approved)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <label>
              Preço da oferta em reais
              <input name="price" type="number" min="0.01" step="0.01" required />
            </label>
            <label>
              Válida até
              <input
                name="endsAt"
                type="datetime-local"
                defaultValue={new Date(
                  Date.now() + 86400000 - new Date().getTimezoneOffset() * 60000,
                )
                  .toISOString()
                  .slice(0, 16)}
                required
              />
            </label>
            <label className="wide">
              URL de compra
              <input
                name="url"
                type="url"
                placeholder="https://loja.com.br/produto"
                required
                pattern="https://.*"
              />
            </label>
            <button className="button" disabled={busy}>
              {busy ? 'Publicando…' : 'Publicar oferta'}
            </button>
          </form>
        </section>
      )}
      <section className="ops-panel">
        <h2>Ofertas</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Loja</th>
                <th>Preço</th>
                <th>Validade</th>
                {mutate && <th>Ação</th>}
              </tr>
            </thead>
            <tbody>
              {data?.offers.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div className="ops-product">
                      <ProductPhoto product={o.variant?.product} />
                      <span>{o.variant?.product.name}</span>
                    </div>
                  </td>
                  <td>{o.merchant.name}</td>
                  <td>{brl(o.priceCents)}</td>
                  <td>{new Date(o.endsAt).toLocaleDateString('pt-BR')}</td>
                  {mutate && (
                    <td>
                      <button
                        className="text-button"
                        onClick={() =>
                          void api
                            .request(`/offers/${o.id}`, 'DELETE', {})
                            .then(reload)
                            .catch((e) => setFailure(errorText(e)))
                        }
                      >
                        Desativar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {mode === 'admin' && (
        <>
          <section className="ops-panel">
            <h2>Catálogo</h2>
            <div className="catalogue-list">
              {catalogue?.items.map((p) => (
                <button
                  key={p.id}
                  className="text-button"
                  disabled={!mutate}
                  onClick={() => setEdit(p)}
                >
                  <ProductPhoto product={p} />
                  <span>
                    {p.name} {mutate && '· Editar'}
                  </span>
                </button>
              ))}
            </div>
            {mutate && (
              <form key={edit?.id ?? 'new'} className="ops-form" onSubmit={saveProduct}>
                <h3 className="wide">{edit ? 'Editar produto' : 'Adicionar produto'}</h3>
                <label>
                  Nome do produto
                  <input name="name" defaultValue={edit?.name} required minLength={3} />
                </label>
                <label>
                  Categoria
                  <input name="category" defaultValue={edit?.category ?? 'Games'} required />
                </label>
                <label className="wide">
                  Descrição do produto
                  <textarea
                    name="description"
                    defaultValue={edit?.description}
                    required
                    minLength={10}
                  />
                </label>
                <label>
                  Versão
                  <input
                    name="variantName"
                    defaultValue={edit?.variants[0]?.name ?? 'Padrão'}
                    required
                  />
                </label>
                <label>
                  Preço de demonstração em reais
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={edit ? edit.variants[0]?.demoPriceCents / 100 : undefined}
                    required
                  />
                </label>
                <label>
                  Tipo do produto
                  <select name="illustration" defaultValue={edit?.illustration ?? 'console'}>
                    {['console', 'phone', 'laptop', 'tv', 'audio', 'watch'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Foto do produto (URL HTTPS)
                  <input
                    name="imageUrl"
                    aria-label="Foto do produto"
                    defaultValue={edit?.imageUrl ?? ''}
                    placeholder="https://.../foto.webp"
                  />
                  <small>Use uma foto fiel ao modelo e à versão cadastrados.</small>
                </label>
                <button className="button" disabled={busy}>
                  Salvar produto
                </button>
                {edit && (
                  <button className="text-button" type="button" onClick={() => setEdit(null)}>
                    Cancelar edição
                  </button>
                )}
              </form>
            )}
          </section>
          <section className="ops-panel">
            <h2>Campanhas</h2>
            {data?.campaigns.map((c) => (
              <p key={c.id}>
                {c.name} · Meta: {c.threshold} pessoas
              </p>
            ))}
            {mutate && (
              <form
                className="ops-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  try {
                    await api.request('/admin/campaigns', 'POST', {
                      name: f.get('name'),
                      variantId: f.get('variant'),
                      threshold: Number(f.get('threshold')),
                      startsAt: new Date().toISOString(),
                      endsAt: new Date(String(f.get('endsAt'))).toISOString(),
                    });
                    setNotice('Campanha criada');
                    reload();
                  } catch (e) {
                    setFailure(errorText(e));
                  }
                }}
              >
                <label>
                  Nome da campanha
                  <input name="name" required minLength={3} />
                </label>
                <label>
                  Produto da campanha
                  <select name="variant">
                    {variants.map((v) => (
                      <option value={v.id} key={v.id}>
                        {v.productName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Meta de pessoas
                  <input name="threshold" type="number" min="1" required />
                </label>
                <label>
                  Encerramento da campanha
                  <input name="endsAt" type="datetime-local" required />
                </label>
                <button className="button">Criar campanha</button>
              </form>
            )}
          </section>
          <section className="ops-panel">
            <h2>Intenções recentes</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Preço-alvo</th>
                    <th>Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.intents.map((i) => (
                    <tr key={i.id}>
                      <td>{i.variant.product.name}</td>
                      <td>{brl(i.targetCents)}</td>
                      <td>{i.horizon}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="ops-panel">
            <h2>Lojas</h2>
            {data?.merchants.map((m) => (
              <p key={m.id}>
                {m.name} · {m.approved ? 'Aprovada' : 'Em análise'}
              </p>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
