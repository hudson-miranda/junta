import { useEffect } from 'react';
import { Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import type { Notification } from '@junta/api-client';
import { api, useRemote, useSession } from '../src/session';
import { Page, Title, Copy, Button, Card, ErrorNotice, s } from '../src/ui';
export default function Inbox() {
  const { user } = useSession(),
    { data, error, reload } = useRemote<{ items: Notification[] }>('/notifications');
  useEffect(() => {
    const t = setInterval(reload, 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <Page>
      <Title>Boas notícias para seus desejos.</Title>
      {!user ? (
        <Button onPress={() => router.push('/login')}>Entrar na minha conta</Button>
      ) : (
        <>
          <ErrorNotice error={error} retry={reload} />
          {data?.items.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => {
                void api.request(`/notifications/${n.id}`, 'PATCH', {});
                router.push({ pathname: '/offer/[id]', params: { id: n.offerId } });
              }}
            >
              <Card>
                <Text style={s.productTitle}>{n.title}</Text>
                <Copy>{n.body}</Copy>
              </Card>
            </Pressable>
          ))}
          {data?.items.length === 0 && (
            <Card>
              <Copy>A gente avisa quando a oferta chegar ao seu preço-alvo.</Copy>
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
