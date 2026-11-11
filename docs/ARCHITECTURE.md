# Arquitetura JUNTA

Monólito modular, com clientes independentes e contratos de entrada gerados a partir do Swagger real.

- `apps/api`: NestJS, módulos de autenticação, catálogo/demanda/ofertas e outbox. OpenAPI em `/api/docs`; JSON em `/api/docs-json` no desenvolvimento. Em produção habilitar explicitamente `ENABLE_API_DOCS=true` somente se desejado.
- `apps/mobile`: Expo Router, React Native, sessões em SecureStore. A versão web usa tokens somente em memória. IDs nativos `br.com.junta.app`.
- `apps/web`, `apps/admin`, `apps/merchant`: Next.js, UI compartilhada, sessões com access token em memória e refresh em cookie HttpOnly. O servidor aplica o isolamento; esconder botões não concede permissões.
- `packages/validation`: schemas Zod usados pelo servidor e documentação; `packages/api-client`: cliente com timeout, refresh serializado e tipos de entrada gerados de OpenAPI.
- PostgreSQL/Prisma: histórico de intenções, projeção de demanda, restrições de unicidade parcial e valores DECIMAL. A API recebe dinheiro em centavos inteiros.
- Redis/BullMQ: limites de requisição e agendamento do worker; outbox persistida em PostgreSQL garante que a criação da oferta e seu evento sejam atômicos.

## Consistência e segurança

Criação/cancelamento de intenção usa advisory lock por usuário dentro da transação e índice parcial por usuário/variante ativa. Criação atualiza pool e outbox na mesma transação. Repetir a mesma chave com o mesmo corpo retorna o recurso anterior; reutilizar com outro corpo é conflito.

Refresh tokens são aleatórios e somente seus hashes SHA-256 são persistidos. Cada rotação revoga o anterior; replay revoga a família inteira, incluindo access tokens associados. Senhas usam Argon2id. O cadastro público não aceita papel de acesso. Login social valida assinatura, emissor, audiência e email verificado, sem vinculação automática de contas com o mesmo email.

Ofertas exigem loja aprovada e membership verificada. Lojistas recebem demanda agregada; não recebem identidades ou orçamentos individuais. Toda publicação e alteração administrativa escreve auditoria. URLs de compra exigem HTTPS. Clique só é registrado para oferta vigente e aprovada.

Outbox gera notificações persistidas uma única vez por usuário/evento. Entrega push externa tem semântica de pelo menos uma vez: uma queda após o envio e antes do commit pode repetir o push; a caixa de entrada continua única. Máximo de oito tentativas com backoff, `deadAt` e erro sanitizado para inspeção operacional.

## Decisões

- Prisma 6.19.3 preserva execução CommonJS do NestJS. O client é gerado em pasta explícita e copiado para a imagem, evitando depender de artefatos escondidos em `node_modules`.
- Expo SDK 55 possui versões coerentes verificadas por Expo Doctor; bundles exportados para as três plataformas. Publicação em lojas exige credenciais e validação nativa real.
- Atualizações de segurança de dependências transitivas são fixadas por overrides e verificadas por migrations, testes, Doctor e exportação. Um aviso baixo de `deepmerge` na ferramenta de configuração Expo, sem correção publicada, permanece documentado; não processa payloads da API.
- O catálogo demonstra o fluxo com preços fictícios e não faz afirmações sobre especificações ou preços reais do mercado.
- Cache de catálogo foi adiado: leituras são paginadas e indexadas; manter leitura direta evita invalidadores e dados obsoletos no beta. Redis tem funções concretas de rate limit e filas.
- Nenhum processamento de pagamento. Conversões de venda dependem do programa de afiliados e webhook verificado do parceiro; cliques são medidos diretamente.
