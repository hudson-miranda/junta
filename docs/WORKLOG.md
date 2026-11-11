# Worklog

## 2026-11-10 — auditoria inicial

- Pasta local vazia, remoto público vazio, sem histórico, código, migrations ou arquivos locais a preservar.
- GitHub CLI autenticado; Node 22.14.0, pnpm 10.6.5 e Docker Engine 29.7.2 disponíveis.
- Não há MASTER PROMPT funcional adicional no remoto; o anexo é a especificação disponível.
- Decisão: executar diretamente na branch dedicada; checkout vazio não requer worktree adicional.
- Autonomia e publicação em branch/PR autorizadas pelo anexo. Não haverá cobrança, DNS ou publicação em lojas.

## 2026-11-10 — implementação e evidências intermediárias

- Fundação publicada em `955abba`; schema/migration/seed em `490c9e3`; jornada API em `c9675b8`.
- PostgreSQL/Redis/Mailpit saudáveis. Migration aplicada do zero e repetida sem alterações; seed de nove produtos e contas demo com senha aleatória local.
- Corrigidos: porta Windows reservada, DATABASE_URL herdada de outro checkout (nenhuma gravação externa), fechamento de Redis no ciclo de vida NestJS, timeout de aquisição de transação e client Prisma ausente na imagem de runtime.
- API: 15 testes de integração passaram, incluindo oito criações concorrentes idempotentes, isolamento de papéis/tenant, refresh replay, recuperação de senha de uso único, cancelamento e exclusão de conta. Exclusão ganhou teste de regressão que falhou antes da correção da corrida de intenção.
- Validação: 4 testes passaram. Client: 4 testes passaram após reproduzir e corrigir perda da sessão em indisponibilidade temporária e erro HTML do proxy.
- Expo Doctor passou 20/20 antes da adição de observabilidade; bundles Android/iOS/web exportados. Nova rodada com Sentry/OAuth em andamento; não houve build nativo ou teste em aparelho.
- Auditoria após overrides e atualização do Nodemailer: 0 críticos/altos/moderados; 1 baixo (`deepmerge` transitivo de ferramentas Expo, sem correção publicada).
- Vercel: acesso ao time foi liberado pelo usuário; projetos `junta-web`, `junta-admin`, `junta-merchant` criados em Node 22. Nenhum domínio foi comprado ou alterado.
- EAS `whoami`: `Not logged in`. Credenciais OAuth, FCM/APNs, Sentry DSN e dados jurídicos não fornecidos.
- Browser: cadastro, recuperação de sessão HttpOnly, admin, metadados, viewport e foco de modal validados em rodadas incrementais; jornada completa ainda sendo consolidada contra builds estáveis.
