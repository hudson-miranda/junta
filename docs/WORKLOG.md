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

## 2026-11-10 — validação e entrega

- Revisão independente: quatro achados importantes reproduzidos e corrigidos com RED -> GREEN; nenhum crítico. Cache por identidade, refresh entre abas/401 atrasado, ingress autenticado e desvinculação de push no logout.
- `rotatedAt` separou consumo de refresh de revogação de sessão; migration aditiva testada do zero. Replay/logout/reset continuam revogando acesso.
- Jornada externa Vercel passou com sessão após reload, intenção, share, oferta merchant, inbox, clique e criação administrativa. Sem page errors; screenshots locais e evidências web versionadas. Tokens temporários de automação revogados; SSO preservado.
- Configurações de conta dos portais receberam rotas compartilhadas. Na checagem final, a imagem OG apresentou HTTP 500; log identificou layout Satori, regressão reproduziu a falha e passou após ajuste. Runtime Vercel agora devolve PNG HTTP 200.
- Resultado final: 4 contratos + 5 client + 17 integração API + 3 ingress + 7 browser = 36 testes, zero falhas; lint, tipos, build completo, Doctor 20/20 e Docker aprovados.
- Clone externo atualizado até `0b57de1`: frozen install, migrations/seed isolados, lint, tipos, testes e build passaram. Restore isolado confirmou contagens iguais ao snapshot de origem. Dumps e ambientes preservados localmente/ignorados.
- Main protegida por checks `quality`/`container`, inclusive administradores. GitHub Actions continua impedido por billing antes de executar; não foi declarada aprovação de CI.
- Deploys explícitos de staging READY; API/worker/PostgreSQL/Redis/Mailpit saudáveis. Limites externos registrados em STATUS e FINAL_REPORT. Não houve cobrança, DNS principal ou publicação em lojas.
