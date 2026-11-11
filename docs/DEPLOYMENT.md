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

Três projetos Vercel, com `rootDirectory` em `apps/web`, `apps/admin` e `apps/merchant`. O browser usa `NEXT_PUBLIC_API_URL=/api`; cada frontend encaminha ao `API_SERVER_URL` via proxy no mesmo domínio, mantendo refresh em cookie HttpOnly e validando Origin. `PROXY_SHARED_SECRET` (32+ caracteres) deve ser igual nos três frontends e na API, sempre armazenado como segredo. O proxy assina o identificador de cliente para não agrupar todos os visitantes no mesmo rate limit. Endereços de ingress confiáveis são explicitados em `TRUSTED_INGRESS_IPS`; jamais confiar em cabeçalhos públicos sem verificar o peer. URLs canônicas usam a URL real do deployment Vercel quando `NEXT_PUBLIC_WEB_URL` não é definido.

EAS: autenticar com a conta proprietária, executar `eas init`, definir `EAS_PROJECT_ID`, URLs públicas e credenciais FCM/APNs. Perfis `development`, `preview` (APK) e `production` (AAB/iOS), channels distintos e runtime por versão do app. OTA só é habilitado quando o projectId real existir. Não submeter a lojas sem identidade jurídica, política revisada e credenciais reais.

Google/Apple/Facebook exigem aplicativos registrados, IDs/chaves e configuração dos identificadores/redirects no provedor; identidades são verificadas no backend. Sem configuração o endpoint responde 503, sem identidade simulada. Consulte [SOCIAL_LOGIN.md](SOCIAL_LOGIN.md) para variáveis, nonce e ativação. Email de recuperação: SMTP via `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`. Mailpit é somente local.

## Release, migrations e rollback

Sequência: CI -> imagem imutável por SHA -> backup -> job `prisma migrate deploy` -> API e worker -> checagens `/ready` e jornada -> frontends. Mudanças futuras de schema usam expand/contract. Nunca remover coluna ainda consumida pela imagem anterior.

Rollback: restaurar o deployment anterior no Vercel e a imagem anterior da API/worker. Não inverter migration por conta própria. Restaurar backup somente em instância isolada primeiro, verificar contagens e integridade, então definir o cutover explicitamente.

## Backup e restore

Habilitar backup automático/PITR no provedor antes de atender usuários reais. Para backup local, salve `pg_dump -Fc` em pasta ignorada com acesso restrito. Valide com `pg_restore` em banco novo, compare contagens e execute smoke de leitura. Dumps podem conter dados pessoais; nunca versioná-los.

## Operação

Previews atuais usam um Quick Tunnel até a API/worker Docker deste computador. É staging temporário: depende do host ligado e da continuidade do túnel. Se o container de túnel for recriado, verifique a nova URL e o IP do peer antes de atualizar `API_SERVER_URL`/`TRUSTED_INGRESS_IPS`. Hospedagem permanente de API, PostgreSQL e Redis depende da conta do provedor e de seus secrets; não há produção gerenciada provisionada.

Deploys são explícitos em staging. O `vercel.json` desabilita disparos automáticos do Git enquanto o CI hospedado está bloqueado por faturamento. A proteção SSO dos previews foi mantida. Tokens temporários de automação usados no QA foram revogados depois da validação.

Monitorar falhas `/ready`, jobs falhos, `OutboxEvent.deadAt`, latência, conexões e espaço de disco. Nunca registrar tokens ou corpos de auth. Sentry de API usa `SENTRY_DSN` opcional com PII desativada; entrega externa depende de DSN real. Reconciliar notificações e push quando houver indisponibilidade do provedor. Não prometer entrega push exatamente uma vez.
