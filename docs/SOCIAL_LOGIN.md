# Login social

Google, Apple e Facebook possuem adaptadores web e nativos e validam a identidade na API antes de emitir a sessão JUNTA. Sem configuração no cliente e na API, as opções aparecem desabilitadas como “Em breve”; email/senha permanece disponível. O export web do Expo é uma prévia técnica com login por email; o site Next é o cliente web dos provedores.

## Configuração por ambiente

| Provedor | API (privado) | Web Next (público) | Mobile (público) |
|---|---|---|---|
| Google | `GOOGLE_CLIENT_ID` (audiências separadas por vírgulas) | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` |
| Apple | `APPLE_CLIENT_ID` (audiências separadas por vírgulas) | `NEXT_PUBLIC_APPLE_CLIENT_ID`, `NEXT_PUBLIC_APPLE_REDIRECT_URI` | `EXPO_PUBLIC_APPLE_CLIENT_ID` |
| Facebook | `FACEBOOK_APP_ID`, **`FACEBOOK_APP_SECRET`**, `FACEBOOK_GRAPH_VERSION=v25.0` | `NEXT_PUBLIC_FACEBOOK_APP_ID`, `NEXT_PUBLIC_FACEBOOK_GRAPH_VERSION=v25.0` | `EXPO_PUBLIC_FACEBOOK_APP_ID`, `EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN` |

O segredo do aplicativo Facebook nunca recebe prefixo público e nunca vai para o bundle. O client token do SDK nativo é uma configuração distinta. `compose.app.yaml` encaminha os valores da API; Vercel e EAS precisam dos valores correspondentes a cada ambiente. Alterações nas variáveis públicas exigem novo build. `/auth/providers` expõe somente booleanos de disponibilidade da API.

## Ativação nas contas dos provedores

- Google: criar cliente OAuth web, cadastrar as origens HTTPS exatas dos portais usados e configurar os clientes Android/iOS com pacote/bundle `br.com.junta.app` e certificados de assinatura. [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
- Apple: habilitar Sign in with Apple no App ID, criar Services ID para web, associar domínio e URL de retorno HTTPS exata e configurar capability/entitlements do build iOS. No mobile o botão Apple nativo só fica ativo em iOS. [Apple web](https://developer.apple.com/documentation/signinwithapple/configuring-your-webpage-for-sign-in-with-apple).
- Meta: criar aplicativo com Facebook Login, configurar domínio/origens web, permissão de email, plataformas Android/iOS e hashes de assinatura; concluir verificações/revisão/publicação aplicáveis à conta Meta. [Facebook Login web](https://developers.facebook.com/docs/facebook-login/web/), [guia Expo](https://docs.expo.dev/guides/facebook-authentication/).

Previews protegidos da Vercel e domínios temporários não substituem o cadastro e a verificação dos domínios nos provedores. Nenhum destes passos foi anunciado como concluído sem as credenciais e a configuração externas.

## Validação e comportamento

Google e Apple validam JWT por JWKS, emissor, audiência, assinatura RS256 e email verificado. Facebook clássico verifica o token no Graph com credencial do servidor, aplicativo emissor, tipo USER, validade e ID do perfil, usando `appsecret_proof`. Tokens e segredos não são registrados em logs.

No iOS, Facebook Limited Login usa JWT assinado e nonce emitido pela API: `/auth/oauth/facebook/challenge` gera um desafio aleatório de 32 bytes, armazena somente sua chave hash no Redis por cinco minutos e o consome atomicamente com GETDEL. O SDK recebe esse nonce e a API exige que o claim assinado seja idêntico. Replay, nonce ausente/inválido, emissor/audiência incorretos e tokens expirados são rejeitados.

O SDK nativo Facebook só é autolinkado quando app ID e client token estão presentes; importação e inicialização JS acontecem apenas ao iniciar esse login. Mudança de configuração requer reconstruir o development client/APK/IPA. Não funciona no Expo Go. A exclusão/inclusão condicional foi verificada pelo resolvedor Expo para Android e iOS; não equivale a um teste em aparelho.

Não há vinculação automática de provedores a contas existentes por coincidência de email: a API pede o acesso original, evitando apropriação de contas. Vinculação adicional de provedores a uma mesma conta não faz parte desta entrega.

Testes locais cobrem tokens clássicos, assinatura JWT, audiência/emissor/expiração/nonce, desafio de uso único, disponibilidade e cadastro por email. Login real nos provedores exige credenciais e conta de teste autorizada; ainda não foi executado.
