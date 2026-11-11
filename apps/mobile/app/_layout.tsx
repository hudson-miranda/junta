import { useEffect } from 'react';
import { Stack, router, type ErrorBoundaryProps } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider } from '../src/session';
import * as Sentry from '@sentry/react-native';
if (process.env.EXPO_PUBLIC_SENTRY_DSN)
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    sendDefaultPii: false,
    beforeSend: (event) => {
      delete event.request;
      delete event.user;
      return event;
    },
  });
import { Page, Title, Copy, Button } from '../src/ui';
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
export function ErrorBoundary({ retry, error }: ErrorBoundaryProps) {
  useEffect(() => {
    if (process.env.EXPO_PUBLIC_SENTRY_DSN) Sentry.captureException(error);
  }, [error]);
  return (
    <Page tabs={false}>
      <Title>Vamos tentar de novo?</Title>
      <Copy>Não foi possível abrir esta tela.</Copy>
      <Button onPress={retry}>Tentar novamente</Button>
    </Page>
  );
}
export default function Layout() {
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      const id = response?.notification.request.content.data?.offerId;
      if (typeof id === 'string' && /^[\w-]+$/.test(id))
        router.push({ pathname: '/offer/[id]', params: { id } });
    };
    void Notifications.getLastNotificationResponseAsync().then(open);
    const listener = Notifications.addNotificationResponseReceivedListener(open);
    return () => listener.remove();
  }, []);
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}
