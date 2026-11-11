# Conta e identidade JUNTA

**Objetivo:** tornar o cadastro compreensível, oferecer Google/Apple/Facebook e mostrar os produtos reais com uma identidade própria.

**Decisões de design:** manter azul #2549eb, marinho #172344, coral #ff775e, branco e texto cinza #63708a. Manter Outfit para títulos e DM Sans para leitura. O símbolo será um J construído por dois elos, representando vontades que se encontram; wordmark compacto, sem o ponto decorativo. Fotos isoladas em fundo claro ocupam o espaço antes usado por desenhos. Formulários continuam alinhados à esquerda.

**Arquitetura:** avaliação de senha compartilhada entre React e React Native; regra mínima de 12 caracteres permanece. Feedback textual, barra acessível e mostrar/ocultar senha. Fotos locais servidas pela API, campo opcional imageUrl no catálogo e edição pelo admin. Facebook verifica identidade na API antes de emitir a sessão JUNTA; nunca vincular contas automaticamente por email. Sem credenciais reais, provedores aparecem como indisponíveis e a conta por email continua disponível.

## Execução

- [x] Testar avaliação: senha curta, repetida, sequencial, frase longa; implementar feedback web/mobile e recuperação de senha.
- [x] Obter fotos dos nove produtos em fontes dos fabricantes; registrar fontes, adicionar migration, seed, transporte e componentes web/mobile, permitir foto no admin.
- [x] Criar logo vetorial e regenerar favicons/ícones mobile; aplicar cabeçalhos e cartões de compartilhamento.
- [x] Integrar Facebook web/native e verificação de tokens clássicos/limitados; testar token inválido, audiência errada, expiração e indisponibilidade sem chaves.
- [x] Validar lint, tipos, testes, builds, navegador desktop/mobile e previews; atualizar documentação, publicar branch/PR.

## Limites externos

As credenciais Google/Apple/Meta e configuração dos domínios nas contas dos provedores são necessárias para autenticação real. APK/IPA continuam dependentes de EAS e toolchains. Não desativar proteção Vercel nem modificar produção/DNS. Preservar dados e secrets existentes.
