import { useState } from 'react';
import { Text, View, Switch, Platform, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api, useSession } from '../src/session';
import { Page, Title, Copy, Button, Card, ErrorNotice, Success, s } from '../src/ui';
export default function Settings() {
  const { user, logout } = useSession(),
    [prefs, setPrefs] = useState(
      user?.preferences ?? { offers: true, priceAlerts: true, campaigns: true, marketing: false },
    ),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false);
  async function push() {
    try {
      if (Platform.OS === 'web' || !Device.isDevice)
        throw new Error('Ative os avisos em um aparelho Android ou iPhone.');
      const projectId =
        Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId)
        throw new Error(
          'As notificações push dependem da configuração do projeto EAS. Seus avisos continuam disponíveis na caixa de entrada.',
        );
      if (Platform.OS === 'android')
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Ofertas',
          importance: Notifications.AndroidImportance.HIGH,
        });
      const permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted')
        throw new Error('Permita os avisos nas configurações do aparelho.');
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      await api.request('/devices', 'POST', { token, platform: Platform.OS });
      setNotice('Notificações ativadas');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível ativar');
    }
  }
  async function remove() {
    try {
      await api.request('/me', 'DELETE');
      await logout().catch(() => {});
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível excluir');
    }
  }
  return (
    <Page>
      <Title>Sua conta</Title>
      {!user ? (
        <Button onPress={() => router.push('/login')}>Entrar na minha conta</Button>
      ) : (
        <>
          <Copy>{user.email}</Copy>
          <Card>
            <Text style={s.productTitle}>Seus avisos</Text>
            {(
              [
                ['offers', 'Ofertas'],
                ['priceAlerts', 'Alertas de preço'],
                ['campaigns', 'Campanhas'],
                ['marketing', 'Novidades e promoções'],
              ] as const
            ).map(([k, label]) => (
              <View key={k} style={s.row}>
                <Text>{label}</Text>
                <Switch
                  accessibilityLabel={label}
                  value={prefs[k]}
                  onValueChange={(v) => setPrefs((p) => ({ ...p, [k]: v }))}
                />
              </View>
            ))}
            <Button
              onPress={() =>
                void api
                  .request('/me/preferences', 'PATCH', prefs)
                  .then(() => setNotice('Preferências salvas'))
                  .catch((e) => setError(e.message))
              }
            >
              Salvar preferências
            </Button>
            <Button secondary onPress={() => void push()}>
              Ativar notificações
            </Button>
          </Card>
          <ErrorNotice error={error} />
          {notice && <Success>{notice}</Success>}
          <Button secondary onPress={() => void logout().then(() => router.replace('/'))}>
            Sair da conta
          </Button>
          <Button
            secondary
            onPress={() => {
              if (Platform.OS === 'web') setConfirm(true);
              else
                Alert.alert(
                  'Excluir sua conta?',
                  'Suas participações serão encerradas e seus dados de identificação serão removidos.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Excluir conta', style: 'destructive', onPress: () => void remove() },
                  ],
                );
            }}
          >
            Excluir minha conta
          </Button>
          {confirm && (
            <Card>
              <Copy>Esta ação não pode ser desfeita.</Copy>
              <Button onPress={() => void remove()}>Confirmar exclusão da conta</Button>
            </Card>
          )}
        </>
      )}
      <Button
        secondary
        onPress={() =>
          void Linking.openURL(
            `${process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000'}/privacy`,
          )
        }
      >
        Privacidade
      </Button>
      <Button
        secondary
        onPress={() =>
          void Linking.openURL(
            `${process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000'}/terms`,
          )
        }
      >
        Termos de uso
      </Button>
    </Page>
  );
}
