# Status — 2026-11-10

Beta executável. Jornada central persistida validada localmente e em staging. Publicação em lojas e operação de produção dependem dos acessos abaixo.

Atualização de conta/identidade: força da senha acessível, opções Google/Apple/Facebook, nove fotos reais, nova logo em curvas e edição de fotos no admin. Foram validados **46 testes locais** (35 contratos/cliente/API + 11 navegador), quatro migrations, builds e Expo Doctor 20/20. As provas de clone limpo da tabela abaixo pertencem à entrega anterior; a atualização usa o lockfile congelado no build Docker/Vercel. Login real nos três provedores segue pendente das credenciais e configuração de domínio: [ativação](SOCIAL_LOGIN.md). [Fontes das fotos](PRODUCT_IMAGES.md).

## Funcionando

| Componente          | Evidência                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| API NestJS          | Build, 19 testes com PostgreSQL real e `/ready` HTTP 200 no container e HTTPS                                         |
| PostgreSQL/Prisma   | Quatro migrations do zero, reaplicação sem pendências, seed, backup e restore isolado                                   |
| Redis/BullMQ/worker | Containers saudáveis, outbox processada e aviso recebido na jornada externa                                           |
| Web                 | Cadastro, sessão HttpOnly após reload, busca, intenção R$ 2.999, compartilhamento, meus produtos, aviso e clique      |
| Admin               | Login, produto/oferta/campanha, demanda, métricas e configurações de conta                                            |
| Merchant            | Login, demanda agregada, publicação de oferta e isolamento de tenant                                                  |
| Vercel              | Três projetos e previews protegidos, runtime verificado e jornada externa completa                                    |
| Qualidade           | 46 testes passando, zero falhas; lint, TypeScript, build e instalação congelada em clone separado                     |
| Segurança           | Revisão independente corrigida; audit com zero críticos/altos/moderados; scan de secrets aprovado                     |
| Mobile              | TypeScript, Expo Doctor 20/20 e export Android/iOS/web; código de onboarding, conta, intenção, ofertas e notificações |

## Parcial

- Mobile foi validado por exportação; APK/IPA, Maestro e execução em aparelho não foram realizados.
- Staging usa API/worker Docker e banco local através de Quick Tunnel; depende deste computador e não representa hospedagem permanente.
- Um aviso baixo em `deepmerge`, transitivo da configuração Expo, sem patch publicado. Não recebe payloads da API.
- Campanhas possuem cadastro/metas; automações avançadas não são anunciadas neste beta.

## Bloqueado externamente

- GitHub Actions: conta bloqueada por faturamento; os jobs não iniciaram. Main exige `quality` e `container`, inclusive para administradores, e o merge permanece bloqueado.
- EAS: `eas whoami` retorna `Not logged in`; falta autenticar e associar projeto/credenciais nativas. Este host não tem Android SDK nem toolchain iOS.
- Google/Apple/Facebook OAuth, FCM/APNs e Sentry: falta configurar IDs/chaves/DSNs reais para validar entrega externa.
- Produção permanente: faltam conta/ambiente do provedor para API, PostgreSQL e Redis gerenciados.
- Lojas/domínio: faltam identidade jurídica, documentos revisados, credenciais de publicação e associação de domínio verificável.

## Não iniciado

- Cobrança, venda interna, submissão às lojas e alteração de DNS principal. Essas ações não foram ativadas no beta.

URLs, commits, limites e procedimentos: [relatório final](FINAL_REPORT.md) e [deploy/operação](DEPLOYMENT.md).
