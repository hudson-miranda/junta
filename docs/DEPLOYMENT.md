# Execução e deploy

## Local

```powershell
pnpm install --frozen-lockfile
node scripts/setup-env.mjs
docker compose up -d
pnpm db:generate
pnpm --filter @junta/validation build
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Web http://localhost:3000, admin :3001, merchant :3002, API :4000, worker :4001, Expo :8081, Mailpit http://localhost:58025. PostgreSQL :55432 e Redis :16379 estão vinculados somente ao loopback.

Contas locais `consumer@junta.local`, `admin@junta.local`, `merchant@junta.local`, `analyst@junta.local`. A senha está no campo `DEMO_PASSWORD` do `.env` ignorado e é gerada aleatoriamente pelo setup. Não a publique. Seed recusa `NODE_ENV=production`.

Para telefone físico, `EXPO_PUBLIC_API_URL` deve apontar para o IP LAN do computador ou API HTTPS acessível, pois `localhost` no telefone é o próprio telefone. Expo atualiza valores públicos somente ao iniciar/reexportar o bundle.

## Container

```powershell
pnpm exec dotenv -e .env -o -- docker compose -f compose.yaml -f compose.app.yaml up -d --build
```

Isso executa API e worker na imagem, preservando o banco e Redis existentes. Execute migrations antes da atualização; a imagem de runtime contém somente dependências de produção. O job de migration deve usar a etapa build com CLI Prisma, nunca `db push`.

## Produção e staging

Ambientes separados exigem banco, Redis, chaves de assinatura, origins e OAuth distintos. API container: `NODE_ENV=production`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` aleatório, `CORS_ORIGINS` HTTPS explícitas, `WEB_URL`. Worker usa a mesma imagem com `node dist/worker.js`. `/health` indica processo; `/ready` verifica PostgreSQL e Redis. Capture SIGTERM para fechamento dos recursos.

Banco gerenciado: criar usuário de aplicação sem SUPERUSER, sem CREATEDB/CREATEROLE. Criar extensão `pg_trgm` com conta de migration; liberar DDL apenas ao job de migration. Aplicação recebe apenas SELECT/INSERT/UPDATE/DELETE e acesso necessário às sequences. Redis deve ter TLS e credenciais fora do Docker local.

Três projetos Vercel, `rootDirectory` respectivamente `apps/web`, `apps/admin`, `apps/merchant`. `installCommand=pnpm install --frozen-lockfile`, build no respectivo `vercel.json`. Configure `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_WEB_URL` de cada ambiente. As URLs de preview devem estar na whitelist exata da API. Cookies cross-site de staging/produção exigem HTTPS, `Secure` e `SameSite=None`; navegadores que bloqueiam cookies de terceiros precisam dos frontends e API no mesmo domínio registrável antes do lançamento.

EAS: autenticar com a conta proprietária, executar `eas init`, definir `EAS_PROJECT_ID`, URLs públicas e credenciais FCM/APNs. Perfis `development`, `preview` (APK) e `production` (AAB/iOS), channels distintos e runtime por versão do app. OTA só é habilitado quando o projectId real existir. Não submeter a lojas sem identidade jurídica, política revisada e credenciais reais.

Google/Apple exigem client IDs e registros dos identificadores/redirects no provedor; JWTs são verificados no backend. Sem client IDs o endpoint responde 503, sem identidade simulada. Email de recuperação: SMTP via `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`. Mailpit é somente local.

## Release, migrations e rollback

Sequência: CI -> imagem imutável por SHA -> backup -> job `prisma migrate deploy` -> API e worker -> checagens `/ready` e jornada -> frontends. Mudanças futuras de schema usam expand/contract. Nunca remover coluna ainda consumida pela imagem anterior.

Rollback: restaurar o deployment anterior no Vercel e a imagem anterior da API/worker. Não inverter migration por conta própria. Restaurar backup somente em instância isolada primeiro, verificar contagens e integridade, então definir o cutover explicitamente.

## Backup e restore

Habilitar backup automático/PITR no provedor antes de atender usuários reais. Para backup local, salve `pg_dump -Fc` em pasta ignorada com acesso restrito. Valide com `pg_restore` em banco novo, compare contagens e execute smoke de leitura. Dumps podem conter dados pessoais; nunca versioná-los.

## Operação

Monitorar falhas `/ready`, jobs falhos, `OutboxEvent.deadAt`, latência, conexões e espaço de disco. Nunca registrar tokens ou corpos de auth. Sentry de API usa `SENTRY_DSN` opcional com PII desativada; entrega externa depende de DSN real. Reconciliar notificações e push quando houver indisponibilidade do provedor. Não prometer entrega push exatamente uma vez.
