# Changelog

Todas as mudancas relevantes do projeto **PetOS** devem ser registradas neste arquivo.

Este documento segue, com adaptacoes, a ideia do **Keep a Changelog**, usando linguagem clara e categorias padronizadas para facilitar acompanhamento de evolucao do produto e do repositorio.

## Como usar este arquivo

- Registrar mudancas relevantes de produto, arquitetura, seguranca, banco de dados, integracoes, testes e documentacao.
- Atualizar o changelog em toda alteracao significativa aprovada para o repositorio.
- Nao usar este arquivo para listar detalhes triviais ou ruido de implementacao sem impacto real.
- Sempre que possivel, manter alinhamento entre as entradas do changelog, o **PRD do PetOS**, o **AGENTS.md** e o historico de entregas por fase.

## Categorias padrao

- **Added**: novas funcionalidades, novos documentos, novas integracoes.
- **Changed**: mudancas de comportamento, arquitetura, regras ou fluxos existentes.
- **Fixed**: correcoes de bugs, falhas de validacao, seguranca, regressoes e inconsistencias.
- **Deprecated**: recursos, fluxos ou padroes marcados para descontinuacao futura.
- **Removed**: remocoes efetivas de funcionalidades, arquivos, fluxos ou dependencias.
- **Security**: mudancas diretamente ligadas a seguranca, autenticacao, autorizacao, auditoria, dados sensiveis, pagamentos ou webhooks.

## Politica de versao

O projeto pode adotar **Semantic Versioning** quando a base do sistema estiver operacionalmente estavel.

Ate la, recomenda-se o uso de versoes iniciais no padrao:

- `0.1.0` -> estrutura inicial do projeto
- `0.2.0` -> MVP parcial com blocos principais
- `0.3.0` -> MVP funcional consolidado
- `0.4.0+` -> evolucao do MVP, Fase 2 e adicoes relevantes

## Datas

Usar o formato:

`YYYY-MM-DD`

Exemplo:

`2026-03-30`

---

## [Unreleased]

### Changed
- A Fase 4 agora ganhou um recorte explicito de validacao operacional guiada do assistente virtual, com snapshot administrativo de status, alertas, cobertura de voz, cobertura do fluxo de agenda e proximos passos em `/admin/sistema`, sem abrir provider real, memoria conversacional persistida ou novo painel operacional.
- A Fase 4 agora ganhou uma rodada curta de hardening do assistente virtual do tutor, com intent adicional para `report cards`, parsing deterministico de referencias como dia da semana/periodo do dia, historico minimo e telemetria de uso derivados de `AuditLog`, e leitura administrativa minima do uso do assistente em `/admin/sistema`, sem abrir provider real, audio bruto persistido ou memoria conversacional livre.
- O repositorio agora fecha uma Fase 4 conservadora para o item de roadmap "assistente virtual por voz", limitada ao portal do tutor, com consultas proprias, agendamento assistido por confirmacao explicita, operacao transcript-only no servidor e reutilizacao integral da fundacao de IA fail-closed.
- A fundacao de IA passou a reconhecer o novo modulo `VIRTUAL_ASSISTANT`, com flag dedicada, quota propria por modulo, contrato provider-neutral, gating server-side, auditoria coerente com o envelope e sem abrir provider real, billing real ou armazenamento de audio bruto.
- O portal do tutor agora incorpora um painel minimo de assistente virtual com texto e voz no navegador, mantendo o backend como autoridade para ownership, disponibilidade e criacao do agendamento.
- A baseline de documentacao de desenvolvimento foi consolidada com reescrita de `docs/architecture.md`, `docs/domain-rules.md` e `docs/data-model.md`, sincronizacao dos exemplos de ambiente com as flags e quotas da Fase 3 e abertura dos novos guias `docs/environment-contract.md`, `docs/rbac-permission-matrix.md`, `docs/internal-api-catalog.md` e `docs/phase3-maintenance-guide.md`.
- O Bloco 5 da Fase 3 agora fecha a fase com um snapshot consolidado de governanca em `features/phase3/governance.ts`, uma rota interna administrativa dedicada, leitura minima em `/admin/sistema` e alertas operacionais sobre fail-closed, backlog humano, utilidade preditiva, fallback conceitual e contexto multiunidade.
- O repositorio agora possui uma regressao reconhecivel para toda a Fase 3 com `npm run test:phase3:block5` e `npm run test:phase3`, consolidando os smokes dos blocos 1 a 5 sem reabrir provider real, billing real ou painel final.
- A Fase 3 agora possui baseline documental propria e checklist formal de saida do Bloco 5, marcando o fechamento conservador da fase sem confundir essa baseline com multiunidade irrestrita, provider real ou automacao operacional.
- O Bloco 4 da Fase 3 agora fecha o primeiro corte de analise preditiva e insights, com snapshots persistidos de previsao de demanda de agenda por unidade, rotas internas administrativas para geracao/listagem/feedback, secao minima em `/admin/agenda` e saida explicitamente mantida como recomendacao auditavel, sem automacao, provider real ou billing real.
- O repositorio agora possui a suite minima reconhecivel e o checklist formal de saida do Bloco 4, com `npm run test:phase3:block4`, smoke tecnico proprio e gate conservador para abertura do Bloco 5 sem reavaliacao ampla dos blocos anteriores.
- O Bloco 3 da Fase 3 agora fecha o primeiro corte assistivo de analise de imagem, com persistencia de `ImageAnalysis`, metadados de captura em `media assets`, rotas internas administrativas e UI minima em `documentos`, `report-cards` e `pets`, mantendo resultado assistivo, revisao humana obrigatoria, consentimento por finalidade e descarte por padrao do payload bruto.
- O repositorio agora possui a suite minima reconhecivel e o checklist formal de saida do Bloco 3, com `npm run test:phase3:block3`, smoke tecnico proprio e gate conservador para abertura do Bloco 4 sem reavaliacao ampla dos Blocos 1 e 2.
- O Bloco 2 da Fase 3 agora fecha a propagacao operacional do contexto multiunidade pelos modulos centrais (`appointments`, `finance`, `fiscal`, `inventory`, `messages`, `crm`, `employees`, `team-operations`, `services`, `waitlist`, `taxi-dog`, `pos`, `report-cards`, `documents`, `media` e `integration-events`), substituindo filtros cegos por `actor.unitId` por resolucao server-side do contexto ativo ou global autorizado sem abrir escrita estrutural cross-unit.
- O layout administrativo agora exibe o contexto multiunidade ativo da sessao em modo somente leitura, deixando explicita a separacao entre escopo `LOCAL` e `GLOBAL_AUTHORIZED` sem abrir a UI final de troca de contexto.
- A primeira fatia controlada do Bloco 2 da Fase 3 agora aplica escopo multiunidade server-side nas leituras de `appointments`, fazendo listagem e detalhe consumirem o contexto resolvido da sessao ou `unitId` explicitamente autorizado sem abrir escrita estrutural cross-unit, UI final ou rollout amplo do modulo.
- O `B1-T19` da Fase 3 agora fecha o Bloco 1 com um checklist formal e auditavel de saida para o Bloco 2, alinhado ao plano operacional, ao mapa de impacto multiunidade, a `npm run test:phase3:block1` e ao smoke final administrativo interno, sem abrir feature nova, provider real ou multiunidade operacional completa.
- O `B1-T18` da Fase 3 agora consolida a suite minima de testes do Bloco 1, com script dedicado, smoke administrativo interno e documento explicito de cobertura e sinais de handoff, sem abrir nova feature, provider real ou Bloco 2.
- O `B1-T17` da Fase 3 agora expõe a superficie interna minima de contexto multiunidade sobre a base administrativa ja aberta no `B1-T16`, com leitura protegida de unidade ativa, papel global, ownership base e probes de escopo/limite sem abrir UI final multiunidade nem o Bloco 2.
- O `B1-T16` da Fase 3 agora adiciona a superficie administrativa minima de diagnostico da fundacao, com leitura protegida de flags, gating, quota, bloqueios, lifecycle conceitual, eventos operacionais minimos e sinais essenciais de multiunidade em `/admin/sistema` e em rota interna, sem abrir painel final, provider real ou mutacoes administrativas novas.
- O `B1-T15` da Fase 3 agora adiciona os eventos minimos de custo, erro e desligamento rapido da camada de IA, com contrato provider-neutral, classificacao de severidade e proximo passo sugerido, integrados ao envelope e a auditoria minima sem abrir billing real, painel final ou persistencia definitiva.
- O `B1-T14` da Fase 3 agora adiciona a trilha transversal de consentimento e retencao da camada de IA, com contrato provider-neutral de finalidade, gate server-side por consentimento, integracao coerente com retencao e auditoria minima e bloqueio explicito de inferencias de imagem sem opt-in compativel, sem abrir UI final, provider real ou persistencia definitiva.
- O `B1-T13` da Fase 3 agora adiciona a auditoria minima de uso de IA, com eventos estruturados para tentativa, bloqueio, execucao, fallback e decisao humana relevante, reaproveitando `auditLog` e o contexto multiunidade ja existente sem abrir persistencia nova ou UI administrativa.
- O `B1-T12` da Fase 3 agora adiciona o fallback conceitual minimo da camada de IA, com contrato provider-neutral para elegibilidade, indisponibilidade, ausencia de configuracao e proximo passo sugerido, integrando esses metadados ao lifecycle assincrono e ao adaptador interno sem abrir fallback real entre vendors, retry real ou persistencia definitiva.
- O `B1-T11` da Fase 3 agora adiciona o envelope minimo de jobs e estados assincronos da camada de IA, distinguindo admissao, fila logica, execucao imediata controlada, conclusao, bloqueio, falha e `NOT_SUPPORTED` sem abrir fila externa, retry real completo ou provider real.
- O `B1-T10` da Fase 3 agora adiciona o adaptador interno de provider da camada de IA, com contrato normalizado, executor unico server-side, subdominios preparados para `vision` e `insights` e mapeamento auditavel de resposta valida, erro tecnico e bloqueio por flag sem integrar provider real.
- O `B1-T09` da Fase 3 agora registra o mapa tecnico de impacto multiunidade em filtros, consultas, listagens e dashboards, deixando explicito onde o sistema ja esta seguro no escopo local, onde ainda assume single-unit e o que deve permanecer bloqueado ate o Bloco 2.
- O `B1-T08` da Fase 3 agora conecta ownership e visibilidade base de cliente/pet ao contexto multiunidade server-side, aplicando leitura local, leitura global autorizada e bloqueio de edicao cross-unit por padrao sem abrir multiunidade operacional completa.
- O `B1-T07` da Fase 3 agora adiciona a fundacao server-side de contexto de unidade e isolamento base multiunidade, com snapshot de sessao, decisao central de escopo, bloqueio cross-unit por padrao e permissao global explicita para leitura ou edicao estrutural sem abrir a operacao multiunidade completa.
- O `B1-T06` da Fase 3 agora adiciona metadados operacionais provider-neutral ao envelope da IA, representando provider/modelo declarados, classe de custo estimado, fallback e observabilidade minima sem integrar provider real, billing real ou storage definitivo.
- O `B1-T05` da Fase 3 agora adiciona a politica transversal de retencao e descarte da camada de IA, classificando resultado interpretado, metadado tecnico, payload bruto e referencia de entrada no envelope provider-neutral sem abrir storage definitivo, payload cru de provider ou schema.
- O `B1-T04` da Fase 3 agora abre o primeiro envelope real de execucao da camada de IA, consumindo contrato, gating e politica ja existentes para responder de forma padronizada com estados `PENDING`, `BLOCKED` ou `FAILED`, ainda sem provider real, job real ou persistencia definitiva.
- O gate formal de saida do Sprint 1 do Bloco 1 da Fase 3 foi registrado como `GO COM RESSALVAS`, com `build`, `typecheck` e suite ampla verdes e com autorizacao para abrir o Sprint 2 sem reescrever a fundacao da camada de IA.
- O `B1-T03` da Fase 3 agora adiciona uma fundacao central de quota/politica por modulo sobre o gating existente, distinguindo bloqueio por flag, quota esgotada, quota ausente ou invalida e indisponibilidade operacional sem abrir billing real nem persistencia definitiva.
- O `B1-T02` da Fase 3 agora centraliza o gating server-side da IA em um unico funil fail-closed, avaliando `ai.enabled`, flags por modulo e suporte minimo do contrato antes de qualquer caminho futuro de custo, job ou retry.
- O Bloco 1 da Fase 3 iniciou sua implementacao real de forma controlada pelo `B1-T01`, abrindo o contrato interno central da camada de IA, a fronteira futura com adaptadores externos e a base de resultado/erro/auditoria sem integrar provider real nem liberar consumo pago.
- O inicio da implementacao do Bloco 1 da Fase 3 agora possui um plano proprio de Sprint 1, restrito a `B1-T01`, `B1-T02` e `B1-T03`, com slices pequenos, reversiveis e validaveis.
- O Bloco 1 da Fase 3 agora possui backlog tecnico por camadas, com ordem de execucao, dependencias reais, validacao por item e estrategia minima de testes, sem abrir implementacao.
- O Bloco 1 da Fase 3 agora possui um plano operacional proprio, com backlog ordenado, contratos conceituais, criterios de pronto e sinal de saida para o Bloco 2, sem abrir implementacao.
- A rodada final de ratificacao humana da Fase 3 aprovou `B1` e aprovou com ajustes `B2` e `C1`, destravando documentalmente o Bloco 1 sem iniciar implementacao.
- O gate documental do Bloco 1 da Fase 3 passou a ter uma rodada curta de ratificacao humana separada para `B1`, `B2` e `C1`, deixando explicito quando o bloco continua bloqueado e em que condicao ele pode ser autorizado.
- A diretriz de IA da Fase 3 passou a exigir feature flags server-side, fail-closed, desligamento operacional rapido e governanca de custo por modulo e por unidade antes de qualquer implementacao.
- A documentacao principal passou a refletir o estado atual do host real: o rollout tecnico ja foi fechado na Hostinger e o proximo passo recomendado deixou de ser rollout para virar homologacao operacional guiada por gaps reais de uso.
- Atualizacao de seguranca e compatibilidade do stack web para `next@15.5.9`, `react@19.1.2`, `react-dom@19.1.2` e `eslint-config-next@15.5.9`, destravando o gate de deploy da Netlify para a baseline do MVP validado.
- `typecheck` passou a gerar os tipos do App Router com `next typegen` antes do `tsc --noEmit`, reduzindo fragilidade operacional em ambientes de rollout.
- Abertura controlada da Fase 2 no codigo apenas pelo Bloco 1, preservando a baseline do MVP validado e mantendo os fluxos finais da fase fora do escopo.
- O script de `typecheck` agora limpa `.next/types` stale antes de regenerar os tipos, evitando falso negativo local depois de mudancas estruturais no App Router.
- O Bloco 2 da Fase 2 expandiu o dominio financeiro sem reabrir o MVP: `PAID` continua como liquidacao real, comissao agora depende de `PAID + COMPLETED`, e deposito/pre-pagamento/no-show protection passaram a refletir corretamente no consolidado financeiro.
- O Bloco 3 da Fase 2 ativou o dominio documental sem inflar o portal do tutor nem puxar o fiscal alem do minimo ja consolidado: documentos, midia e assinaturas agora operam com storage fora do banco, arquivamento logico e acesso protegido no servidor.
- O Bloco 4 da Fase 2 expandiu a agenda sem reescrever o MVP: capacidade agora pode ser refinada por profissional, porte e raca, bloqueios operacionais passam a ser respeitados no servidor, a waitlist ganhou promocao/cancelamento previsiveis e o Taxi Dog entrou como fluxo logistico pratico do atendimento.
- O Bloco 5 da Fase 2 ampliou o portal do tutor sobre os dominios ja entregues, mantendo o servidor como autoridade para documentos, assinaturas, financeiro proprio, waitlist, Taxi Dog e pre-check-in.
- O Bloco 6 da Fase 2 ampliou o modulo de comunicacao sem trocar o dominio existente: consentimento por cliente, campanhas segmentadas, review booster, recuperacao de inativos, ofertas por perfil e gatilhos pos-servico agora reutilizam templates, logs e abertura manual controlada de canal.
- O Bloco 7 da Fase 2 ativou PDV e estoque sem abrir ERP: a venda presencial agora fecha no servidor, reaproveita o ledger financeiro existente, baixa estoque na mesma transacao e so solicita fiscal minimo quando a liquidacao e real.
- O Bloco 8 da Fase 2 fechou o recorte de equipe com escalas, ponto e base de payroll integrados a funcionarios, agenda e comissoes, sem abrir modulo trabalhista amplo.
- O Bloco 9 consolidou a Fase 2 como baseline tecnica propria, com regressao automatizada, smoke local dos dominios novos e documentacao sincronizada para rollout controlado.
- O inicio do instalador/atualizador integrados passou a ter fundacao server-side propria: estado persistido de runtime, deteccao de ciclo de vida, preflight de setup e readiness operacional conscientes de `NOT_INSTALLED`, `INSTALLED`, `MAINTENANCE` e `REPAIR`.
- O Bloco B do instalador integrado abriu a superficie guiada inicial em `/setup`, reaproveitando o preflight do Bloco A e mantendo o finalize da instalacao fora do escopo por enquanto.
- O Bloco C do instalador integrado fechou o bootstrap inicial com finalize server-side, transicao persistida `INSTALLING -> INSTALLED`, lock definitivo do modo setup e redirecionamento seguro para o login.
- O Bloco E do updater integrado passou a embarcar um manifest de release tipado, comparar versao instalada vs. build alvo, bloquear drift/ambiente degradado e expor um preflight seguro do update sem ainda executar migrations ou maintenance.
- O Bloco F do updater integrado passou a executar updates controlados no proprio runtime: lock de execucao, entrada explicita em `UPDATING`, migrations, seed policy suportada, tasks pos-update declaradas, validacao final e recovery minimo persistido.
- O Bloco G fechou a frente installer/updater com regressao consolidada, smoke checklist dedicado, baseline operacional propria e sincronizacao final de docs/UI com o estado real da camada.
- O rollout hospedado do staging agora publica a baseline installer/updater de fato em `petos-staging`, mas a validacao continua `NO-GO` enquanto o ambiente publicado nao tiver banco real valido e runtime coerente.
- A remediacao final do staging confirmou com mais precisao o bloqueio hospedado: as envs seguras/publicas puderam ser reaplicadas, mas `DATABASE_URL` e `DIRECT_DATABASE_URL` seguem ausentes no contexto `production`, impedindo um rebuild limpo sem `.env.local` local.
- O repositorio passou a registrar formalmente o fallback operacional com Docker local como validacao tecnica controlada da baseline atual quando o staging hospedado estiver bloqueado por banco externo.
- O alvo operacional principal de staging deixou de ser a Netlify e passou a refletir o ambiente real da Hostinger Business Web Hosting, onde o MySQL remoto ja foi validado separadamente com readiness verde.
- O pipeline de importacao GitHub da Hostinger passou a tratar o toolchain critico de build como dependencias normais do app, evitando falhas de deploy quando o host instala pacotes em modo focado em producao antes de executar `npm run build`.

### Added
- `docs/phase4-operational-validation.md` como runbook da rodada de homologacao guiada da Fase 4, conectando smoke manual, leitura administrativa minima e classificacao de gaps do assistente virtual.
- `features/assistant/usage.ts` como modulo de historico/telemetria minima do assistente virtual, reaproveitando a trilha de auditoria existente para o portal do tutor e para a leitura administrativa de sistema.
- `PHASE4_PLAN.md`, `docs/phase4-test-suite.md`, `docs/phase4-exit-checklist.md` e `docs/phase4-baseline.md` como plano, suite reconhecivel, gate formal de saida e baseline documental da Fase 4.
- `docs/decisions/015-virtual-assistant-transcript-only-confirmation-first.md` como ADR do primeiro corte do assistente virtual.
- `features/assistant/` com contrato, parser deterministico, service integrado ao envelope de IA e painel minimo no portal do tutor.
- `POST /api/tutor/virtual-assistant` como superficie protegida do tutor para interpretar pedidos e confirmar rascunhos assistidos.
- `tests/server/assistant/*.test.ts`, `tests/server/ai/virtual-assistant-foundation.test.ts` e `tests/server/phase4-smoke.test.ts` como rede minima de protecao da nova fase.
- `docs/decisions/011-installer-updater-runtime-foundation.md`, `docs/decisions/012-multiunit-server-side-scope-and-fail-closed-context.md`, `docs/decisions/013-ai-foundation-fail-closed-provider-neutral.md` e `docs/decisions/014-phase3-governance-and-regression-baseline.md` como ADRs da baseline atual do repositorio.
- `docs/phase3-block5-test-suite.md`, `docs/phase3-block5-exit-checklist.md` e `docs/phase3-baseline.md` como suite minima, gate formal de saida e baseline documental da Fase 3.
- `features/phase3/governance.ts` e `GET /api/admin/system/phase3-governance` como snapshot consolidado e protegido da governanca minima da Fase 3.
- `tests/server/phase3-governance.test.ts` e `tests/server/phase3-block5-smoke.test.ts` como recorte de regressao do fechamento da fase.
- `docs/phase3-block4-test-suite.md` e `docs/phase3-block4-exit-checklist.md` como suite minima e checklist formal de saida do Bloco 4 para o Bloco 5.
- `tests/server/phase3-block2-smoke.test.ts` como smoke reconhecivel do Bloco 2, cobrindo leituras operacionais multiunidade, bloqueio de escrita estrutural cross-unit e guardrails do portal do tutor.
- `docs/phase3-block2-test-suite.md` e `docs/phase3-block2-exit-checklist.md` como suite minima e checklist formal de saida do Bloco 2 para o Bloco 3.
- `server/jobs/ai.ts` como ponto unico inicial de scheduling logico da camada de IA, sem fila real de producao.
- `server/integrations/ai/adapter.ts` como executor unico do adaptador interno de provider da Fase 3, consumindo envelope, gating e politica existentes antes de qualquer integracao real.
- `features/ai/provider-routing.ts`, `features/ai/vision/contract.ts` e `features/insights/contract.ts` como base dos subdominios e do roteamento provider-neutral por modulo.
- `tests/server/ai/provider-adapter.test.ts` para cobrir resposta valida do adaptador, erro tecnico normalizado e bloqueio por flag sem chamada de provider.
- `docs/phase3-block1-multiunit-impact-map.md` como mapa tecnico central do `B1-T09`, inventariando superficies afetadas, classificacao por risco e backlog derivado para a abertura controlada do Bloco 2.
- `features/clients/ownership.ts` como contrato minimo de ownership de cliente/pet por unidade, reutilizado pela camada de autorizacao multiunidade.
- Cobertura de testes `tests/server/multiunit/client-pet-ownership.test.ts` para leitura local, leitura global autorizada e bloqueio de edicao cross-unit sem permissao global.
- `features/ai/execution.ts` como orquestrador inicial server-side do envelope de execucao da IA da Fase 3.
- `docs/phase3-block1-sprint1-exit-gate.md` como registro formal da decisao de saida do Sprint 1 do Bloco 1 da Fase 3.
- `features/ai/policy.ts` como camada central inicial de quota/politica da IA da Fase 3, com quotas base por modulo, previsao explicita de quota por unidade e resolucao provider-neutral integrada ao contrato do Sprint 1.
- `features/ai/gating.ts` como autoridade central inicial de gating da IA da Fase 3, com hierarquia minima de flags, motivo de bloqueio padronizado, preparacao para escopo por unidade e resolucao compatível com o contrato do `B1-T01`.
- `features/ai/` como fundacao inicial da camada interna de IA da Fase 3, com contrato normalizado de requisicao, resultado assistivo, erro padronizado, decisao compativel com fail-closed e snapshot minimo para auditoria.
- `server/integrations/ai/contract.ts` como fronteira provider-neutral para adaptadores futuros da Fase 3, mantendo a UI e o dominio desacoplados de formatos externos.
- `docs/phase3-block1-sprint1-plan.md` como handoff imediato do primeiro sprint tecnico do Bloco 1 da Fase 3.
- `docs/phase3-block1-technical-backlog.md` como backlog tecnico executavel do Bloco 1 da Fase 3, pronto para handoff de implementacao futura.
- `docs/phase3-block1-operational-plan.md` como handoff operacional do Bloco 1 da Fase 3, cobrindo fundacao de IA, multiunidade e governanca minima antes de qualquer codigo.
- `docs/phase3-block1-approval-round.md` como rodada final curta de aprovacao humana para destravar, ou manter bloqueado, o Bloco 1 da Fase 3.
- `docs/operational-homologation.md` como runbook da fase seguinte ao rollout tecnico: configuracao operacional, uso real do sistema, captura de gaps e separacao explicita entre correcao de baseline e planejamento de Fase 3.
- `PHASE3_PLAN.md` como plano explicito da Fase 3, separando IA avancada e multiunidade operacional completa da homologacao atual e da baseline fechada do MVP/Fase 2.
- `docs/phase3-decision-matrix.md` como matriz executiva de decisoes da Fase 3, cobrindo provider, LGPD/retencao, compartilhamento entre unidades, imagem e predicao antes de qualquer implementacao.
- `docs/phase3-approval-board.md` como quadro de aprovacao final da Fase 3, com status decisorios por item e gate formal do Bloco 1.
- `docs/release-baseline.md` como marco curto da baseline tecnica do MVP validado.
- `PHASE2_PLAN.md` como plano tecnico-operacional da Fase 2.
- `docs/mvp-status.md` agora descreve oficialmente o MVP como `validado`, com estabilizacao automatizada e validacao manual em ambiente real concluidas.
- README e guias operacionais passaram a tratar o repositorio como baseline tecnica do MVP validado, sem confundir esse estado com inicio da Fase 2.
- Documentacao de setup, deploy, operabilidade e release readiness foi alinhada para trocar a ideia de "validacao manual pendente" por "rollout controlado em ambiente hospedado".
- Fundacao transacional da Fase 2 no schema com base para documentos, assinaturas, midia, depositos, reembolsos, creditos de cliente e eventos de integracao auditaveis.
- Contratos de ambiente, seed e readiness para a base compartilhada da Fase 2 sem ativar os blocos seguintes por antecipacao.
- Bloco 2 da Fase 2 com fluxos server-side para depositos, reembolsos, creditos, no-show protection, documentos fiscais minimos e ingestao normalizada de eventos externos com idempotencia e auditoria.
- Bloco 3 da Fase 2 com servicos server-side para upload, registro, listagem, assinatura, arquivamento logico e download protegido de `Documentos` e `Midia`.
- Superficies minimas em `/admin/documentos` e no tutor para operar o recorte documental da fase, incluindo documentos gerados por formulario e assinatura operacional do tutor.
- Bloco 4 da Fase 2 com `CapacidadeAgendamento`, `BloqueiosAgenda`, `ListaEspera` e `TaxiDog` ativos no schema, APIs administrativas dedicadas e superficie minima em `/admin/agenda` para operar agenda avancada, waitlist e transporte.
- Bloco 5 da Fase 2 com `PreCheckInTutor`, APIs do tutor para financeiro/waitlist/pre-check-in e ampliacao de `/tutor` para jornada, alertas, documentos protegidos e acompanhamento proprio.
- Bloco 6 da Fase 2 com `PreferenciasComunicacaoCliente`, `CampanhasCRM`, `ExecucoesCampanhaCRM` e `DestinatariosCampanhaCRM`, novas APIs administrativas de CRM e ampliacao de `/admin/comunicacao` para consentimento, campanhas, execucoes e disparo controlado.
- Bloco 7 da Fase 2 com `Produtos`, `EstoquesProduto`, `MovimentacoesEstoque`, `VendasPDV` e `ItensVendaPDV`, novas APIs administrativas de produtos, estoque e PDV, e superficies minimas em `/admin/estoque` e `/admin/pdv`.
- Bloco 8 da Fase 2 com `EscalasEquipe`, `RegistrosPonto`, `FolhasPagamento` e `ItensFolhaPagamento`, novas APIs administrativas de escalas, ponto e folha, e superficies minimas em `/admin/escalas`, `/admin/ponto` e `/admin/folha`.
- `docs/phase2-baseline.md` como marco curto da baseline tecnica da Fase 2 concluida.
- `docs/phase2-smoke-checklist.md` como checklist objetiva de regressao da Fase 2.
- `EstadoRuntimeSistema` no schema como fundacao do Bloco A do instalador/atualizador, registrando estado de ciclo de vida, lock do instalador, versao instalada e manutencao.
- `GET /api/setup/preflight` como rota minima e protegida para diagnostico de setup inicial, com token de bootstrap e sem deixar o wizard exposto permanentemente.
- Servicos server-side para detectar versao do build, inferir `NOT_INSTALLED` versus `INSTALLED` em bancos legados e enriquecer `/api/health` com bloco `lifecycle`.
- Sessao temporaria assinada do instalador, actions server-side para abrir/encerrar essa sessao e wizard inicial em `/setup` para validar o draft de empresa, unidade e admin antes do bloco de finalize.
- Cobertura automatizada para token de bootstrap, cookie assinado do instalador e validacao server-side do draft inicial.
- Bootstrap compartilhado entre `prisma/seed.ts` e o instalador integrado, evitando divergencia entre seed manual e finalize assistido.
- Finalize do setup com criacao da unidade inicial, admin inicial, templates base, runtime state persistido e auditoria de sucesso/falha.
- `release-manifest.json` como fonte declarativa da release alvo do updater core, junto com endpoint interno `GET /api/admin/system/update-preflight` e leitura minima no painel `/admin/sistema`.
- `ExecucoesUpdate` e `PassosExecucaoUpdate` no schema com migration propria, permitindo trilha persistida de execucao, passos, retentativas e resumo de falha do updater.
- Endpoints internos `GET/POST /api/admin/system/update-executions`, `GET /api/admin/system/update-executions/[executionId]` e `POST /api/admin/system/update-executions/[executionId]/retry`.
- `docs/installer-updater-baseline.md` como baseline operacional propria da frente installer/updater.
- `docs/installer-updater-smoke-checklist.md` como checklist de regressao e smoke controlado da frente installer/updater.
- `docs/installer-updater-hosted-rollout.md` como registro curto e auditavel do rollout tecnico hospedado da frente installer/updater.
- `scripts/sanitize-netlify-artifacts.mjs` e o comando `npm run netlify:artifacts:sanitize` para remover `.env*` empacotados indevidamente das functions do Netlify antes de um deploy manual.

### Fixed
- Ambiguidade documental que ainda sugeria fechamento incompleto do MVP mesmo apos a rodada manual bem-sucedida.
- `eslint` passou a ignorar artefatos gerados em `.netlify`, evitando falso negativo de qualidade depois do link/deploy local via CLI.
- O dominio de assinatura manual deixou de atribuir silenciosamente a assinatura ao operador interno como se ele fosse o signatario final do documento.
- A promocao da waitlist passou a ocorrer na mesma transacao da criacao do agendamento, evitando inconsistencias entre agenda real e estado da fila.
- Regras de capacidade desativadas deixaram de bloquear a criacao de uma nova regra equivalente, preservando historico sem congelar a operacao.
- Uma incompatibilidade de build com schema Zod refinado no pre-check-in do tutor foi eliminada sem relaxar validacao nem autorizacao server-side.
- Novos clientes internos passam a nascer com preferencia minima de comunicacao coerente com o contato cadastrado, evitando lacunas operacionais no CRM ampliado.
- A montagem dos itens do formulario do PDV passou a preservar as linhas realmente preenchidas, evitando desalinhamento entre produto, quantidade, preco e desconto quando havia linhas opcionais vazias.
- A documentacao principal deixou de tratar a Fase 2 como parcialmente iniciada e passou a refletir o estado real de fase concluida.
- A readiness operacional deixou de tratar ausencia de estado persistido do instalador como informacao inexistente: agora o runtime consegue inferir `INSTALLED` em bases legadas com seed valida e `NOT_INSTALLED` em ambientes novos sem schema/seed completos.
- A versao declarada do pacote foi alinhada para `0.2.0`, evitando que a fundacao de instalacao/update registre `0.1.0` como versao atual em uma baseline ja tratada como Fase 2 concluida.
- O cleanup de `.next` antes do build deixou de depender de uma remocao fragil no Windows e passou a usar um script com retry, evitando falhas intermitentes `ENOTEMPTY` no gate `npm run build` e em `npm run check:all`.
- O fluxo administrativo do update passou a aceitar `backupConfirmed=true` vindo de checkbox ou input oculto, evitando falso bloqueio de backup por parsing fraco do formulario.
- A pagina `/setup`, o painel `/admin/sistema` e o `release-manifest.json` deixaram de exibir mensagens stale sobre o estado da frente installer/updater depois da entrega dos blocos E e F.
- O script `scripts/clean-path.mjs` agora diagnostica melhor `EPERM` ao limpar `.next`, orientando o operador a encerrar runtimes locais antes de um novo build.
- O diagnostico automatico da Hostinger para "tailwindcss ausente" deixou de ser um risco recorrente no repositorio: `tailwindcss`, `postcss`, `autoprefixer`, `prisma`, `typescript`, `eslint` e tipagens usadas pelo build foram promovidos para `dependencies` e o fluxo foi revalidado com `npm ci --omit=dev && npm run build`.
- O layout administrativo deixou de truncar o `callbackUrl` das subrotas para `/admin`, preservando o retorno correto para paginas como `/admin/sistema` depois do login.
- A documentacao de readiness e staging agora registra explicitamente o resultado do rollout hospedado da frente installer/updater: `petos-staging` ainda esta sem deploy/env e o `petos-production` publicado ainda nao contem essa baseline.
- O fluxo de rollout hospedado da Netlify agora remove `.env.local` dos artefatos de function antes do upload manual, evitando que callbacks e URLs de auth vazem `localhost` para o staging publicado.
- A documentacao de staging e hosted rollout agora diferencia explicitamente dois caminhos de deploy Netlify: upload manual de artefatos com sanitizacao e deploy integrado `--build`, que tambem precisa rodar sem `.env.local` e com banco real ja configurado no host.
- A documentacao agora conecta explicitamente o `NO-GO` do staging hospedado com um `GO` local via Docker, deixando claro que o bloqueio residual esta no ambiente externo e nao na baseline funcional do app.
- O `prisma:seed` deixou de depender de uma transacao interativa longa para o bootstrap inteiro, evitando timeout em MySQL remoto com latencia maior, como no staging validado contra a Hostinger.
- A trilha de rollout agora distingue corretamente dois estados diferentes: `NO-GO` no staging antigo da Netlify por deploy/env contaminados e `banco validado` no ambiente real da Hostinger, evitando diagnostico operacional stale.

### Security
- Eventos externos financeiros e fiscais agora exigem validacao de assinatura, processamento idempotente por `provider + externalEventId` e trilha auditavel antes de tocar o dominio financeiro.
- Uploads e downloads de documentos e midia agora passam por validacao obrigatoria de tipo/tamanho, autorizacao server-side por vinculo e permissao, e trilha de auditoria para criacao, assinatura e arquivamento.
- O portal ampliado do tutor passou a exigir ownership server-side para pre-check-in, waitlist, Taxi Dog, documentos e visao financeira propria, sem delegar regra critica ao cliente.
- Campanhas e gatilhos do Bloco 6 agora exigem snapshot de consentimento, criterio auditavel, descarte explicito por falta de opt-in/destino e vinculo opcional com `LogsMensagens` quando o canal externo e aberto.
- O Bloco 7 reforcou o fechamento do PDV e a movimentacao de estoque como operacoes server-side, auditaveis e protegidas por permissao, com politica de saldo negativo por unidade e baixa por venda sem depender da UI.
- O Bloco 8 reforcou que escalas, ponto e folha so operam por permissao interna, com auditoria em abertura/fechamento de ponto e finalizacao de folha.
- A fundacao do instalador passou a exigir gating explicito por `INSTALLER_ENABLED` e `INSTALLER_BOOTSTRAP_TOKEN`, evitando rota publica de setup sem protecao e reduzindo risco de reinstalacao indevida.
- O wizard inicial do setup agora depende de sessao temporaria assinada com `HttpOnly`, combinando flag de ambiente, token forte e bloqueio por ciclo de vida para nao reabrir instalacao em ambiente ja instalado.
- O finalize do setup so tenta `prisma migrate deploy` quando o runtime realmente consegue localizar a Prisma CLI; caso contrario, o preflight bloqueia a automacao e exige migracao manual explicita em vez de seguir com bootstrap parcial.
- O updater integrado agora so executa depois de preflight compativel, permissao `sistema.update.operar`, lock exclusivo e revalidacao de capacidade real de `prisma migrate deploy`.
- Falhas durante update deixam o runtime em `UPDATE_FAILED` com trilha persistida por passo, sem esconder erro operacional nem liberar retorno silencioso ao estado normal.

---

## [0.1.0] - 2026-03-30

### Added
- PRD inicial consolidado do **PetOS**.
- Definicao da stack principal: **Next.js App Router**, **TypeScript**, **Tailwind CSS**, **MySQL**, **Prisma**, **Route Handlers** e **Auth.js / NextAuth.js**.
- Estrutura inicial de documentacao para desenvolvimento assistido por IA.
- Definicao do escopo do **MVP**, **Fase 2**, **Fase 3** e **Roadmap Futuro**.
- Diretrizes de seguranca, RBAC, auditoria, pagamentos e integracoes externas.

### Changed
- Consolidacao da decisao de manter o PetOS como **sistema proprio**, e nao baseado em WordPress.
- Refinamento da arquitetura do projeto para aderir ao modelo fullstack com Next.js.

### Security
- Definicao inicial de cuidados obrigatorios com autenticacao, autorizacao, webhooks, dados sensiveis e pagamentos.

---

## Modelo para futuras entradas

```md
## [0.x.x] - YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Deprecated
- ...

### Removed
- ...

### Security
- ...
```

## O que deve entrar no changelog

Inclua no changelog quando houver:

- nova funcionalidade do produto;
- mudanca de regra de negocio;
- alteracao de schema Prisma ou migracao relevante;
- alteracao de autenticacao, RBAC ou auditoria;
- adicao ou troca de gateway, webhook ou integracao externa;
- mudanca de comportamento de agendamento, status, pagamentos ou comissao;
- correcao importante de seguranca ou bug operacional;
- mudanca de arquitetura, convencoes ou politicas do repositorio.

## O que normalmente nao precisa entrar

Normalmente nao incluir:

- ajustes cosmeticos sem impacto real;
- refactors triviais internos sem mudanca de comportamento;
- pequenas correcoes textuais sem impacto no uso do projeto;
- experimentos descartados antes de entrar no fluxo principal.

## Relacao com outros arquivos do projeto

Este arquivo deve ser lido em conjunto com:

- `README.md`
- `PetOS_PRD.md`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `SECURITY.md`

Se houver conflito entre o changelog e o PRD sobre comportamento esperado do produto, o **PRD** permanece como referencia principal de especificacao.
