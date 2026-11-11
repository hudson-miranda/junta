import { Text } from 'react-native';
import { router } from 'expo-router';
import { brl, type Intent } from '@junta/api-client';
import { api, useRemote, useSession } from '../src/session';
import { Page, Title, Copy, Button, Card, ErrorNotice, ProductGlyph, s } from '../src/ui';
export default function MyProducts() {
  const { user } = useSession(),
    { data, error, reload } = useRemote<{ items: Intent[] }>('/intents');
  return (
    <Page>
      <Title>Meus produtos</Title>
      <Copy>Seus desejos, reunidos em um lugar.</Copy>
      {!user ? (
        <Button onPress={() => router.push('/login')}>Entrar na minha conta</Button>
      ) : (
        <>
          <ErrorNotice error={error} retry={reload} />
          {data?.items.map((i) => (
            <Card key={i.id}>
              <ProductGlyph kind={i.variant.product.illustration} />
              <Text style={s.productTitle}>{i.variant.product.name}</Text>
              <Copy>Seu preço-alvo: {brl(i.targetCents)}</Copy>
              <Button
                secondary
                onPress={() =>
                  router.push({
                    pathname: '/product/[slug]',
                    params: { slug: i.variant.product.slug },
                  })
                }
              >
                Ver produto
              </Button>
              <Button
                secondary
                onPress={() => void api.request(`/intents/${i.id}`, 'DELETE', {}).then(reload)}
              >
                Cancelar participação
              </Button>
            </Card>
          ))}
          {data?.items.length === 0 && (
            <Card>
              <Copy>Seu próximo desejo começa aqui.</Copy>
              <Button onPress={() => router.push('/')}>Explorar produtos</Button>
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
