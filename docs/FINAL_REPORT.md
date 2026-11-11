# JUNTA — relatório de entrega do beta

Data: 2026-11-10, America/Sao_Paulo. Repositório originalmente vazio; implementação entregue em `codex/junta-foundation`, com PR para `main`. A entrega comprovada é um beta executável local e em staging.

## Atualização de conta e identidade

- Força da senha com barra acessível, texto, dicas, contador e mostrar/ocultar no cadastro dos três portais e mobile. A validação de comprimento agora é inline; a regra mínima permanece em 12 caracteres.
- Google/Apple/Facebook apresentados e conectados a adaptadores reais. Facebook clássico e Limited Login verificam identidade antes de criar sessão; no iOS, desafio aleatório do servidor com validade de cinco minutos e consumo único no Redis impede reutilização. SDK nativo é opcional até haver configuração. Login externo ainda aguarda credenciais, configuração dos provedores e domínios: [guia](SOCIAL_LOGIN.md).
- Nove fotos reais locais no catálogo, detalhes, meus produtos, operação e compartilhamento; imagens mobile usam a mesma API. Campo editável no admin e migration de backfill que preserva URLs personalizadas. [Fontes](PRODUCT_IMAGES.md).
- Nova [logo vetorial](../assets/brand/junta-logo.svg) com símbolo original de união em J e wordmark em curvas, replicada nos três portais e mobile; favicons e ícones regenerados.
- Validação desta atualização: 35 testes de contratos/cliente/API + 11 Playwright = **46**, lint e TypeScript sem erros, builds Next e export Android/iOS/web, Expo Doctor 20/20, Docker com quatro migrations. Fotos decodificadas em navegador entre origens distintas e telas revisadas em desktop/mobile. APK/IPA e autenticação real nos provedores continuam sem comprovação externa.

As evidências e URLs abaixo da entrega inicial são históricas; os previews desta atualização são registrados no worklog após a publicação.

## Arquitetura

Monorepo pnpm/Turborepo/TypeScript. NestJS modular, PostgreSQL/Prisma, Redis/BullMQ, três Next.js e Expo Router. Contratos de entrada gerados do OpenAPI real. [Arquitetura](ARCHITECTURE.md), [revisão independente e decisões](REVIEW.md), [operação](DEPLOYMENT.md).

## Funcionalidades implementadas

- Cadastro/email/senha Argon2id, sessão web HttpOnly, armazenamento nativo SecureStore, refresh rotativo com detecção de replay e coordenação entre abas, logout, reset de uso único e exclusão de conta.
- Catálogo com produtos/variantes, busca, páginas públicas, SEO e imagem Open Graph dinâmica.
- Intenção com centavos inteiros, prazo e preço-alvo; transação com demanda e outbox; chave idempotente, cancelamento e preservação de histórico.
- Compartilhamento com referral, atribuição no cadastro, aviso persistido e preferências.
- Loja aprovada/membership, demanda agregada, oferta válida, auditoria, worker e registro de clique de afiliado.
- Admin de catálogo, ofertas e campanhas; visão de demanda/intenção/lojas/métricas. Portal lojista e configurações de conta funcionais.
- Analytics interno com adapter, configuração remota/flags globais, rate limit com identidade de proxy autenticada, logs JSON e request ID.
- Adaptadores Google/Apple, push e Sentry condicionados às credenciais reais. Nenhuma identidade ou entrega externa foi simulada como sucesso.

## URLs

Previews exigem acesso Vercel ao time. A proteção SSO foi mantida; os tokens de automação utilizados no QA foram revogados.

| Aplicação      | Preview                                                               |
| -------------- | --------------------------------------------------------------------- |
| Web            | https://junta-chnvxo1gr-hudsons-projects-6f231da2.vercel.app          |
| Admin          | https://junta-admin-h8pbl799w-hudsons-projects-6f231da2.vercel.app    |
| Merchant       | https://junta-merchant-rahglbbm5-hudsons-projects-6f231da2.vercel.app |
| API temporária | https://rec-atmospheric-coral-efficient.trycloudflare.com             |

Local: web `:3000`, admin `:3001`, merchant `:3002`, API `:4000`, Swagger `/api/docs`, worker `:4001`, Expo `:8081`, Mailpit `:58025`. Para evitar disputa de porta, utilize API em container ou `pnpm dev`, conforme [DEPLOYMENT.md](DEPLOYMENT.md).

## Deployments

| Aplicação | Deployment                         | Commit de código |
| --------- | ---------------------------------- | ---------------- |
| Web       | `dpl_7hwUj7GK1xxJnsueoWM7DuqKZEQx` | `0b57de1`        |
| Admin     | `dpl_BEWUCURryGMu2q2XoRruxkn84eVd` | `f276861`        |
| Merchant  | `dpl_sNQtXwJEXxgDefWfkr7uWL94WgLJ` | `f276861`        |

Os três chegaram a READY. A jornada completa foi executada nas URLs Vercel: signup, reload de sessão, PS5, intenção 299900 centavos, share, oferta pelo merchant, aviso, abertura da oferta e clique. Admin criou produto. Após os ajustes finais, configurações dos portais responderam HTTP 200 e Open Graph respondeu HTTP 200 `image/png`.

API e worker usam imagem multi-stage, dependências de runtime, usuário `node`, healthchecks e volumes persistentes. PostgreSQL, Redis, API, worker e Mailpit foram observados saudáveis. Staging depende deste host ligado e do Quick Tunnel; não há SLA nem provedor permanente configurado. Não houve compra de domínio ou alteração de DNS principal.

## Banco

- Duas migrations aditivas, testadas em banco vazio e reaplicadas sem pendências; nenhum `db push`.
- DECIMAL, índices de busca, constraints de preço/datas, unicidade parcial de intenção ativa e locks transacionais.
- Nove produtos demo ativos. Preços são fictícios. Produtos criados pelo QA foram desativados de forma reversível; histórico e auditoria foram preservados.
- Backup `pg_dump -Fc` restaurado em banco isolado: origem e destino com 19 produtos totais, 25 usuários e 16 intenções no snapshot verificado. Registros adicionais de testes posteriores não alteram essa prova de recuperação.
- Dumps permanecem somente em `.local/backups`, ignorados pelo Git. Nenhum dump ou `.env` foi publicado.

## CI/CD

Workflow com PostgreSQL/Redis, migrations, lint, tipos, testes, auditoria, scan de secrets, Expo Doctor, builds, Playwright e build Docker; Actions fixadas por SHA, Dependabot e cache pnpm/Turbo.

O GitHub recusou iniciar os jobs por bloqueio de faturamento da conta, com a anotação: “The job was not started because your account is locked due to a billing issue.” Isso não é teste aprovado nem falha de código executado. A main está protegida e exige `quality`/`container`. O merge aguarda regularização da conta e rerun bem-sucedido.

Deploys Vercel foram explícitos em staging. Disparos automáticos do Git foram desabilitados para evitar publicação automática enquanto o CI hospedado está impedido.

## Mobile

Android/iOS/web exportados; Expo Doctor 20/20 e TypeScript passaram. Identificador `br.com.junta.app`, scheme `junta`, rotas de produto/oferta, onboarding, login, intenção, meus produtos, avisos, preferências e exclusão. Assets provisórios e perfis EAS development/preview/production presentes; runtime OTA vinculado à versão e desabilitado sem projectId real.

APK/IPA e Maestro não executados: EAS sem login e host sem Android SDK/toolchain iOS. Não houve teste em aparelho, assinatura, submissão ou publicação em loja. Exportação de JavaScript não foi tratada como validação nativa.

## Testes

| Verificação                          | Resultado                   |
| ------------------------------------ | --------------------------- |
| Validação de contratos               | 4 passaram                  |
| Client/sessão/rede                   | 5 passaram                  |
| API/PostgreSQL real                  | 17 passaram                 |
| Isolamento e autenticação de ingress | 3 passaram                  |
| Playwright em builds de produção     | 7 passaram                  |
| Total da suíte automatizada          | **36 passaram, 0 falharam** |
| Expo Doctor                          | 20/20                       |
| Lint/TypeScript/build completo       | Passaram                    |
| Jornada externa Vercel               | Passou, sem page errors     |

O clone separado em `C:\dev\junta-validation-8718f20`, atualizado até `0b57de1`, passou `pnpm install --frozen-lockfile`, geração Prisma, migrations/seed em banco isolado, lint, tipos, testes e build. Isso verificou a instalação sem os artefatos do checkout de implementação.

Capturas: [desktop](evidence/web-desktop.png) e [viewport mobile](evidence/web-mobile.png). As capturas são da web; não representam teste em aparelho nativo.

## Segurança

Revisão independente identificou quatro problemas de troca de conta, sessões e ingress; todos receberam regressões que falharam antes e passaram depois. Detalhes e decisões em [REVIEW.md](REVIEW.md).

Audit final: zero critical/high/moderate, um low em `deepmerge` transitivo da configuração Expo, sem patch publicado. Scan de arquivos versionados aprovado. Sessões e reset persistem hashes, CORS não aceita wildcard, dinheiro não usa float, isolamento merchant é imposto no servidor, notificações são únicas por usuário/evento e a entrega push externa é pelo menos uma vez.

## Commits relevantes

- `955abba`: monorepo e infraestrutura local.
- `490c9e3`: schema, migration inicial e seed.
- `c9675b8`: jornada persistida da API.
- `2aa2f70`: ciclo de conta e runtime Prisma.
- `c8eba07`: web e client gerado.
- `0fa1264`: portais administrativos/lojistas.
- `73e8781`: Expo e integrações nativas.
- `82fc11e`: CI e containers.
- `8718f20`: correções da revisão de segurança.
- `f276861`: configurações de conta nos portais.
- `0b57de1`: correção e regressão da imagem Open Graph.

## Variáveis necessárias

`.env.example` e `scripts/setup-env.mjs` preparam o ambiente local. Valores gerados ficam apenas no `.env` ignorado. Contas demo usam `DEMO_PASSWORD`, nunca uma senha fixa de produção.

Runtime: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `PROXY_SHARED_SECRET`, `CORS_ORIGINS`, `WEB_URL`. Frontends: `API_SERVER_URL`, `NEXT_PUBLIC_API_URL=/api`, opcionalmente `NEXT_PUBLIC_WEB_URL`. Mobile: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_URL`, `EAS_PROJECT_ID`. SMTP, OAuth, Sentry e Expo Push têm seus campos explícitos no exemplo e no guia de deploy. Secrets do proxy foram configurados criptografados no ambiente preview Vercel.

## Credenciais externas ainda necessárias

- Regularização de billing GitHub e rerun do CI.
- Login da conta Expo/EAS, projectId real, assinatura e FCM/APNs.
- IDs Google/Apple e configuração dos identificadores/redirects no provedor.
- DSNs Sentry e SMTP de produção, se utilizados.
- Conta/ambiente de hospedagem permanente para API/PostgreSQL/Redis.
- Identidade jurídica, política/termos finais, domínio e credenciais das lojas.

## Limitações reais

O beta usa dados demonstrativos e infraestrutura de staging temporária. A operação de produção não foi habilitada. Não há conversão de venda confirmada sem integração do parceiro; cliques são medidos. Atribuição social/push/observabilidade externa aguarda credenciais. Listas e painéis têm limites adequados ao beta; não houve teste de carga ou auditoria jurídica independente.

## Itens não bloqueantes para a jornada validada

Identidade visual definitiva, paginação de operação em escala, campanhas avançadas e evoluções de analytics. Drops e checkout interno não foram ativados. Os limites acima não foram mascarados como funcionalidades concluídas.
