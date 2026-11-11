# JUNTA

Intenção de compra + demanda coletiva + preço-alvo + ofertas.

Beta executável com API NestJS, PostgreSQL/Prisma, Redis/BullMQ, Expo e portais Next.js.

```powershell
git clone --branch codex/junta-foundation https://github.com/hudson-miranda/junta.git
cd junta
pnpm install --frozen-lockfile
node scripts/setup-env.mjs
docker compose up -d
pnpm db:generate
pnpm --filter @junta/validation build
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Web: http://localhost:3000 · Admin: http://localhost:3001 · Lojas: http://localhost:3002 · API/Swagger: http://localhost:4000/api/docs · Expo: http://localhost:8081.

Contas de desenvolvimento: `consumer@junta.local`, `admin@junta.local`, `merchant@junta.local`, `analyst@junta.local`. A senha aleatória está somente no `.env` local, campo `DEMO_PASSWORD`. Preços são fictícios e identificados como demonstração. Seed é proibido em produção.

Validação: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`. Testes de integração recusam qualquer banco cujo nome não seja `junta_test`. O build exporta bundles Expo; isso não substitui build nativo e teste em aparelho.

Para executar API/worker em containers, consulte [deploy e operação](docs/DEPLOYMENT.md). Use um modo de API por vez para evitar disputa pela porta 4000. Consulte [status comprovado](docs/STATUS.md), [arquitetura](docs/ARCHITECTURE.md) e [revisão independente](docs/REVIEW.md).
