# Revisão independente do beta

Revisão somente leitura por agente independente, base `2546093`, implementação até `82fc11e` e alterações locais. Nenhum crítico, quatro achados importantes. A publicação foi retida durante a correção. Não houve nova revisão circular: regressões e a suíte completa verificam o passe final de correção.

## Corrigidos

1. Respostas privadas retidas ao mudar de conta: snapshots agora têm escopo por identidade e rota; resultados e erros da identidade anterior somem imediatamente, inclusive no app nativo. Regressão de navegador reproduziu o PS5 da conta A aparecendo na conta B após 503 e passou após a correção.
2. Refresh concorrente em abas: Web Locks serializa a rotação do cookie entre abas; respostas 401 atrasadas aproveitam access token já renovado. `rotatedAt` separa consumo do refresh de revogação real, mantendo tokens de acesso legítimos por até 15 minutos. Replay, logout e reset continuam revogando sessões. Testes demonstraram falha anterior e funcionamento após correção.
3. Rate limit compartilhado pelo proxy: frontend assina identificador de cliente com segredo independente; API verifica HMAC em tempo constante. Cabeçalhos públicos arbitrários não são confiáveis. A origem direta usa o socket; `CF-Connecting-IP` só é aceito de peers configurados explicitamente. Dois clientes assinados fizeram 61 consultas cada sem consumir a cota um do outro.
4. Push da conta anterior após logout: logout global revoga sessões e desativa seus dispositivos na mesma transação. Cadastro de device revalida a sessão sob o mesmo lock do usuário; mobile sincroniza ownership ao entrar quando a permissão do aparelho já existe. Teste reproduziu `enabled=true` após logout e passou com `false` e transferência posterior para a conta B.

## Decisões sobre itens que o revisor não classificou como defeito

- Verificação de email, antifraude de múltiplas identidades em referral e administração do onboarding de lojas: fora da jornada selecionada deste beta; risco de abuso deve ser tratado antes de expansão pública.
- Refresh e logout global: mantidos, com consumo do refresh separado da revogação do acesso; risco residual de um access token roubado dura no máximo 15 minutos até expiração, ou menos se a família for revogada.
- Retenção de histórico sem campos de identidade após exclusão: mantida para integridade de demanda; política definitiva de retenção depende de revisão jurídica.
- Isolamento de tenant, ownership de notificações, locks de intenção, reset de uso único e corrida de exclusão: testes e checagens do servidor preservados.
- CSRF e segredo dos tokens: proxy mantém validação de Origin e cookie HttpOnly; nenhum refresh token é entregue ao JavaScript web.
- Repetição de push externo: entrega pelo menos uma vez documentada; a caixa de entrada é idempotente. Escala de múltiplos workers requer validação de carga antes de ampliar a configuração atual.
- Push desabilitado, campanhas além do cadastro e alertas para intenções posteriores a ofertas existentes: o beta garante a jornada oferta publicada após intenção. Push externo permanece desabilitado sem credenciais. Campanhas registram metas; automações adicionais não são anunciadas como prontas.
- Desaprovação de loja/desativação de catálogo: publicação já exige aprovação; não há mutation administrativa de remoção de aprovação neste beta.
- Paginação ampla, navegação de conta nos portais e atualização visual das preferências: limitações de escala/polimento registradas; portais operacionais são destinados a usuários provisionados.
- Build nativo, entrega push/OAuth/Sentry e universal links: exigem conta, chaves, aparelho e domínio verificável; exportação não é teste em aparelho.
- CI hospedado: jobs bloqueados por faturamento da conta GitHub antes de iniciar. Não foi tratado como falha de teste nem como CI aprovado.
- Vercel e runtime Docker: resultado consta nas verificações de entrega; o revisor não afirmou sucesso externo.
- Formatação: sem alteração de comportamento identificada.
