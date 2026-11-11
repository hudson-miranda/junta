import {
  ScrollView,
  Image,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import type { Product } from '@junta/api-client';
import brandLogo from '../assets/junta-logo.png';
export const colors = {
  blue: '#2549eb',
  ink: '#172344',
  muted: '#63708a',
  pale: '#edf2ff',
  line: '#e4e9f3',
  green: '#17765c',
};
export function Page({ children, tabs = true }: { children: ReactNode; tabs?: boolean }) {
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Link href="/" asChild>
          <Pressable
            accessibilityLabel="JUNTA início"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Image source={brandLogo} style={{ width: 126, height: 41 }} resizeMode="contain" />
          </Pressable>
        </Link>
        <Pressable accessibilityLabel="Sua conta" onPress={() => router.push('/settings')}>
          <Text style={s.headerLink}>Sua conta</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {tabs && (
        <View style={s.tabs}>
          <Link href="/" style={s.tab}>
            Explorar
          </Link>
          <Link href="/me" style={s.tab}>
            Meus produtos
          </Link>
          <Link href="/notifications" style={s.tab}>
            Avisos
          </Link>
        </View>
      )}
    </SafeAreaView>
  );
}
export function Button({
  children,
  onPress,
  secondary = false,
  disabled = false,
}: {
  children: ReactNode;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[s.button, secondary && s.secondary, disabled && { opacity: 0.5 }]}
    >
      <Text style={[s.buttonText, secondary && { color: colors.blue }]}>{children}</Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7, marginVertical: 9 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#7a87a1"
        style={s.input}
        {...props}
      />
    </View>
  );
}
export function Title({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={s.title}>
      {children}
    </Text>
  );
}
export function Copy({ children }: { children: ReactNode }) {
  return <Text style={s.copy}>{children}</Text>;
}
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function ErrorNotice({ error, retry }: { error: string; retry?: () => void }) {
  return error ? (
    <View accessibilityRole="alert" style={s.error}>
      <Text style={{ color: '#a22b22' }}>{error}</Text>
      {retry && (
        <Pressable onPress={retry}>
          <Text style={s.headerLink}>Tentar novamente</Text>
        </Pressable>
      )}
    </View>
  ) : null;
}
export function Success({ children }: { children: ReactNode }) {
  return (
    <View accessibilityRole="alert" style={s.success}>
      <Text style={{ color: colors.green, fontWeight: '600' }}>{children}</Text>
    </View>
  );
}
export function ProductPhoto({ product }: { product?: Pick<Product, 'name' | 'imageUrl'> }) {
  const [failed, setFailed] = useState<string | null>(null);
  const path = product?.imageUrl;
  const uri = path?.startsWith('/assets/products/')
    ? `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000'}${path}`
    : path?.startsWith('https://')
      ? path
      : undefined;
  return (
    <View style={[s.art, { backgroundColor: '#fff' }]}>
      {uri && failed !== uri ? (
        <Image
          source={{ uri }}
          accessibilityLabel={product?.name}
          resizeMode="contain"
          style={{ width: '100%', height: '100%' }}
          onError={() => setFailed(uri)}
        />
      ) : (
        <Text style={{ color: colors.muted }}>Foto em atualização</Text>
      )}
    </View>
  );
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    height: 65,
    paddingHorizontal: 23,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { fontSize: 34, fontWeight: '900', letterSpacing: -2, color: colors.blue },
  headerLink: { fontSize: 13, fontWeight: '600', color: colors.blue },
  content: { padding: 23, paddingBottom: 35, gap: 13 },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tab: { fontSize: 12, fontWeight: '600', color: colors.blue },
  title: {
    fontSize: 35,
    lineHeight: 39,
    fontWeight: '800',
    letterSpacing: -1.3,
    color: colors.ink,
    marginVertical: 10,
  },
  copy: { fontSize: 15, lineHeight: 23, color: colors.muted },
  button: {
    backgroundColor: colors.blue,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 5,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: { backgroundColor: colors.pale },
  input: {
    borderWidth: 1,
    borderColor: '#cbd3e4',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: '#fff',
  },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 17,
    padding: 19,
    marginVertical: 4,
    gap: 10,
  },
  art: {
    height: 155,
    backgroundColor: colors.pale,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  error: { backgroundColor: '#fff0ed', borderRadius: 10, padding: 15, gap: 12 },
  success: { backgroundColor: '#e8f5ee', borderRadius: 10, padding: 15 },
  productTitle: { fontSize: 21, fontWeight: '700', color: colors.ink },
  price: { fontSize: 28, fontWeight: '700', color: colors.ink },
  chip: { backgroundColor: colors.pale, padding: 10, borderRadius: 20 },
  chipText: { fontSize: 12, color: colors.blue },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
