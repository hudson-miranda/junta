import { useState } from 'react';
import { Text, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { brl, type Offer } from '@junta/api-client';
import { api, useRemote, useSession } from '../../src/session';
import { Page, Title, Copy, Button, ErrorNotice, ProductPhoto, s } from '../../src/ui';
export default function OfferPage() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { user } = useSession(),
    { data, error, reload } = useRemote<Offer>(`/offers/${id}`),
    [failure, setFailure] = useState('');
  return (
    <Page>
      <Title>{data?.variant?.product.name ?? 'Sua oferta'}</Title>
      <ErrorNotice error={error || failure} retry={reload} />
      {data && (
        <>
          <ProductPhoto product={data.variant?.product} />
          <Text style={s.price}>{brl(data.priceCents)}</Text>
          <Copy>{data.merchant.name}</Copy>
          <Copy>Até {new Date(data.endsAt).toLocaleString('pt-BR')}</Copy>
          <Button
            onPress={async () => {
              if (!user) {
                router.push('/login');
                return;
              }
              try {
                const result = await api.request<{ url: string }>(
                  `/offers/${id}/click`,
                  'POST',
                  {},
                );
                await Linking.openURL(result.url);
              } catch (e) {
                setFailure(e instanceof Error ? e.message : 'Oferta indisponível');
              }
            }}
          >
            Ver oferta
          </Button>
          <Copy>
            Você vai para o site da loja. O JUNTA pode receber comissão por uma compra no parceiro.
          </Copy>
        </>
      )}
    </Page>
  );
}
