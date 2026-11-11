import { useState } from 'react';
import { router } from 'expo-router';
import { api, useSession, getReferral } from '../src/session';
import { password as passwordSchema } from '@junta/validation';
import { PasswordField } from '../src/password';
import { SocialLogin } from '../src/social';
import { Page, Title, Copy, Button, Field, ErrorNotice, Success } from '../src/ui';
export default function Login() {
  const { accept } = useSession(),
    [signup, setSignup] = useState(false),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  async function submit() {
    setBusy(true);
    setError('');
    try {
      if (signup && !passwordSchema.safeParse(password).success)
        throw new Error('Use uma senha entre 12 e 128 caracteres.');
      accept(
        signup
          ? await api.signup({ name, email, password, referralCode: await getReferral() })
          : await api.login(email, password),
      );
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível entrar');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page tabs={false}>
      <Title>{signup ? 'Você já chega junto.' : 'Bom ter você aqui.'}</Title>
      <Copy>Entre para acompanhar seus desejos e ofertas.</Copy>
      {signup && <Field label="Seu nome" value={name} onChangeText={setName} autoComplete="name" />}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <PasswordField value={password} onChangeText={setPassword} creation={signup} />
      <ErrorNotice error={error} />
      {notice && <Success>{notice}</Success>}
      <Button disabled={busy} onPress={() => void submit()}>
        {busy ? 'Aguarde…' : signup ? 'Criar conta' : 'Entrar'}
      </Button>
      <Button secondary onPress={() => setSignup(!signup)}>
        {signup ? 'Já tenho conta' : 'Criar uma conta'}
      </Button>
      <SocialLogin
        accept={(session) => {
          accept(session);
          router.replace('/');
        }}
        onError={setError}
      />
      {!signup && (
        <Button
          secondary
          onPress={() =>
            void api
              .request<{ message: string }>('/auth/forgot', 'POST', { email })
              .then((v) => setNotice(v.message))
              .catch((e) => setError(e.message))
          }
        >
          Esqueci minha senha
        </Button>
      )}
    </Page>
  );
}
