import { useState, useEffect } from 'react';
import { View, Text, Share, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { brl, type Product } from '@junta/api-client';
import { api, useRemote, useSession, captureReferral } from '../../src/session';
import {
  Page,
  Title,
  Copy,
  Button,
  Field,
  Card,
  ProductPhoto,
  ErrorNotice,
  Success,
  s,
} from '../../src/ui';
export default function ProductPage() {
  const { slug, ref } = useLocalSearchParams<{ slug: string; ref?: string }>(),
    { user } = useSession(),
    { data, error, reload } = useRemote<Product>(`/products/${encodeURIComponent(slug)}`);
  const [form, setForm] = useState(false),
    [price, setPrice] = useState(''),
    [horizon, setHorizon] = useState<'WEEK' | 'MONTH' | 'ANYTIME'>('WEEK'),
    [notice, setNotice] = useState(''),
    [failure, setFailure] = useState(''),
    [key, setKey] = useState(''),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (ref) void captureReferral(ref, slug);
    if (user) void api.analytics.track('product.view', { slug });
  }, [ref, slug, user]);
  if (!data)
    return (
      <Page>
        <ErrorNotice error={error} retry={reload} />
        <Copy>Carregando produto…</Copy>
      </Page>
    );
  const variant = data.variants.find((v) => v.id === selected) ?? data.variants[0];
  async function submit() {
    setBusy(true);
    setFailure('');
    try {
      await api.intent(
        {
          variantId: variant.id,
          targetCents: Math.round(Number(price.replace(',', '.')) * 100),
          horizon,
        },
        key,
      );
      setNotice('Participação confirmada');
      setForm(false);
      reload();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Tente novamente');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <ProductPhoto product={data} />
      <Text style={s.chipText}>{data.category} · Demonstração</Text>
      <Title>{data.name}</Title>
      <Copy>{data.description}</Copy>
      {data.variants.map((v) => (
        <Pressable
          key={v.id}
          onPress={() => setSelected(v.id)}
          style={[s.chip, variant.id === v.id && { borderWidth: 1, borderColor: '#2549eb' }]}
        >
          <Text>{v.name}</Text>
        </Pressable>
      ))}
      <Copy>Preço de referência demo</Copy>
      <Text style={s.price}>{brl(variant.demoPriceCents)}</Text>
      <Card>
        <Text style={s.productTitle}>{variant.demand} pessoas querem</Text>
        <Copy>Seu preço-alvo ajuda a mostrar o tamanho da demanda.</Copy>
      </Card>
      <ErrorNotice error={failure} />
      {notice && <Success>{notice}</Success>}
      {form ? (
        <Card>
          <Text style={s.productTitle}>Vamos buscar esse preço?</Text>
          <Copy>Quando quer comprar?</Copy>
          <View style={{ gap: 5 }}>
            {(
              [
                ['WEEK', 'Esta semana'],
                ['MONTH', 'Este mês'],
                ['ANYTIME', 'Sem pressa'],
              ] as const
            ).map(([v, label]) => (
              <Button secondary={horizon !== v} key={v} onPress={() => setHorizon(v)}>
                {label}
              </Button>
            ))}
          </View>
          <Field
            label="Preço-alvo em reais"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="2999,00"
          />
          <Button disabled={busy} onPress={() => void submit()}>
            Confirmar participação
          </Button>
          <Button secondary onPress={() => setForm(false)}>
            Cancelar
          </Button>
        </Card>
      ) : (
        <Button
          onPress={() => {
            if (!user) {
              router.push('/login');
              return;
            }
            setKey(Crypto.randomUUID());
            setForm(true);
          }}
        >
          Eu quero
        </Button>
      )}
      <Button
        secondary
        onPress={async () => {
          if (!user) {
            router.push('/login');
            return;
          }
          try {
            const result = await api.request<{ url: string; text: string }>(
              `/share/${slug}`,
              'POST',
              {},
            );
            await Share.share({ message: `${result.text}\n${result.url}`, url: result.url });
          } catch (e) {
            setFailure(e instanceof Error ? e.message : 'Não foi possível compartilhar');
          }
        }}
      >
        Compartilhar
      </Button>
      {variant.offers.map((o) => (
        <Button
          key={o.id}
          secondary
          onPress={() => router.push({ pathname: '/offer/[id]', params: { id: o.id } })}
        >
          Oferta: {brl(o.priceCents)}
        </Button>
      ))}
      <Copy>Participar é grátis. Você só compra se quiser.</Copy>
    </Page>
  );
}
