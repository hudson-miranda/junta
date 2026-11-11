import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { brl, type Product } from '@junta/api-client';
import { useRemote, useSession } from '../src/session';
import { Page, Title, Copy, Button, Field, Card, ProductGlyph, ErrorNotice, s } from '../src/ui';
export default function Home() {
  const { user, ready } = useSession(),
    [onboarded, setOnboarded] = useState(false),
    [q, setQ] = useState('');
  const { data, error, reload } = useRemote<{ items: Product[] }>(
    `/products?q=${encodeURIComponent(q)}`,
  );
  if (!onboarded && !user && ready)
    return (
      <Page tabs={false}>
        <View style={{ paddingTop: 45, gap: 20 }}>
          <Text style={{ fontSize: 95, textAlign: 'center' }}>🤝</Text>
          <Title>Seu próximo desejo tem companhia.</Title>
          <Copy>
            Escolha um produto. Conte quanto quer pagar. Juntos, a gente atrai ofertas melhores.
          </Copy>
          <Card>
            <Copy>Participar é grátis e não obriga você a comprar.</Copy>
          </Card>
          <Button onPress={() => setOnboarded(true)}>Vamos juntar?</Button>
          <Button secondary onPress={() => router.push('/login')}>
            Já tenho conta
          </Button>
        </View>
      </Page>
    );
  return (
    <Page>
      <Title>Qual é o seu próximo desejo?</Title>
      <Copy>Mais gente querendo. Mais motivos para baixar o preço.</Copy>
      <Field
        label="Pesquisar produtos"
        placeholder="O que você quer comprar?"
        value={q}
        onChangeText={setQ}
      />
      <ErrorNotice error={error} retry={reload} />
      <Text style={s.chipText}>Catálogo e preços demo</Text>
      {data?.items.map((p) => (
        <Pressable
          accessibilityRole="button"
          key={p.id}
          onPress={() => router.push({ pathname: '/product/[slug]', params: { slug: p.slug } })}
        >
          <Card>
            <ProductGlyph kind={p.illustration} />
            <Text style={s.productTitle}>{p.name}</Text>
            <Copy>{p.variants[0]?.name}</Copy>
            <View style={s.row}>
              <Text style={{ fontWeight: '700' }}>{brl(p.variants[0]?.demoPriceCents ?? 0)}</Text>
              <Text style={s.chipText}>
                {p.variants.reduce((a, v) => a + v.demand, 0)} pessoas querem
              </Text>
            </View>
          </Card>
        </Pressable>
      ))}
      {data?.items.length === 0 && <Copy>Nenhum produto encontrado. Tente outro nome.</Copy>}
    </Page>
  );
}
