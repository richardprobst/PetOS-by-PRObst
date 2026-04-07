# Phase 3 Decision Matrix

Data da ultima revisao: 2026-04-07

## Objetivo

Este documento transforma o planejamento da Fase 3 em uma matriz de decisoes pronta para aprovacao.

Ele existe para:

- fechar ambiguidades antes de qualquer implementacao;
- comparar alternativas com trade-offs claros;
- separar o que e decisao de produto, arquitetura, dados e governanca;
- evitar que a Fase 3 comece por impulso, sem gates ou sem criterio de reversao.

Este documento nao autoriza implementacao por si so.
Ele deve ser lido em conjunto com:

- [PHASE3_PLAN.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/PHASE3_PLAN.md)
- [README.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/README.md)
- [docs/operational-homologation.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/operational-homologation.md)

---

## Matriz de decisoes

### A1. Arquitetura de integracao de IA

- **Nome da decisao**: arquitetura de provider de IA
- **Por que ela existe**: define acoplamento, velocidade de entrega, fallback futuro e custo de troca de provider
- **Opcoes possiveis**:
  - integracao direta com provider unico
  - provider unico por tras de adaptador interno
  - arquitetura multi-provider desde o inicio
- **Pros**:
  - direta: entrega mais rapida
  - adaptador: preserva flexibilidade com baixo acoplamento
  - multi-provider: maior independencia futura
- **Contras**:
  - direta: alto lock-in
  - adaptador: exige disciplina inicial de contrato
  - multi-provider: complexidade precoce
- **Riscos**:
  - lock-in tecnico e comercial
  - divergencia de contrato entre providers
  - custo de manutencao desnecessario cedo demais
- **Impacto em arquitetura**:
  - direto: integracoes espalhadas pelo dominio
  - adaptador: contrato unico em `server/integrations/ai`
  - multi-provider: registry, roteamento e politicas extras
- **Impacto em dados/LGPD**:
  - adaptador e multi-provider facilitam auditar qual provider recebeu qual dado
- **Impacto em UX/operacao**:
  - neutro na UI; alto na resiliencia operacional futura
- **Impacto em custo**:
  - direto: menor custo inicial de implementacao
  - adaptador: custo inicial moderado
  - multi-provider: custo inicial mais alto
- **Recomendacao inicial**: provider unico por tras de adaptador interno
- **Reversibilidade**: media para alta
- **O que fica bloqueado sem decidir isso**:
  - desenho do modulo `features/ai`
  - estrategia de fallback
  - observabilidade por provider

### A2. Modelo de hospedagem da IA

- **Nome da decisao**: cloud API vs self-hosted vs hibrido
- **Por que ela existe**: define custo, latencia, governanca, operacao e risco de lock-in
- **Opcoes possiveis**:
  - cloud API
  - self-hosted
  - hibrido
- **Pros**:
  - cloud API: menor atrito e menor operacao inicial
  - self-hosted: maior controle de ambiente e dados
  - hibrido: permite comecar simples e migrar cargas sensiveis ou caras depois
- **Contras**:
  - cloud API: custo variavel e dependencia externa
  - self-hosted: operacao e tuning pesados
  - hibrido: mais regras de roteamento e observabilidade
- **Riscos**:
  - cloud API: dependencia de disponibilidade e precificacao externa
  - self-hosted: custo oculto de MLOps e hardware
  - hibrido: governanca mal definida entre cargas
- **Impacto em arquitetura**:
  - cloud API simplifica Bloco 1
  - self-hosted exige fila, jobs, monitoracao e capacidade dedicada
  - hibrido exige politica de roteamento e fallback por caso de uso
- **Impacto em dados/LGPD**:
  - self-hosted tende a facilitar controle direto, mas nao elimina obrigacoes de consentimento
  - cloud API exige cuidado maior com minimizacao, retention e DPA
- **Impacto em UX/operacao**:
  - cloud API acelera validacao de valor
  - self-hosted aumenta dependencia do time tecnico
- **Impacto em custo**:
  - cloud API: custo variavel por uso
  - self-hosted: custo fixo e operacional maior
  - hibrido: custo misto
- **Recomendacao inicial**: comecar com cloud API, preservando arquitetura compativel com hibrido no futuro
- **Reversibilidade**: media
- **O que fica bloqueado sem decidir isso**:
  - budget inicial
  - stack de jobs de IA
  - estrategia de infraestrutura da Fase 3

### A3. Modo de execucao da IA

- **Nome da decisao**: fluxo sincrono vs assincrono vs misto
- **Por que ela existe**: define UX, latencia, fila, retries e custo operacional
- **Opcoes possiveis**:
  - sincrono
  - assincrono
  - misto
- **Pros**:
  - sincrono: UX imediata
  - assincrono: mais robustez para cargas caras ou lentas
  - misto: combina rapidez em leitura leve e fila para processamento pesado
- **Contras**:
  - sincrono: timeout e UX ruim em cargas maiores
  - assincrono: UX mais complexa
  - misto: exige criterio claro de roteamento
- **Riscos**:
  - travar request web com analise longa
  - duplicidade de job
  - operador achar que a resposta e final quando ainda esta pendente
- **Impacto em arquitetura**:
  - assincrono ou misto exige entidade/job para execucao de IA
- **Impacto em dados/LGPD**:
  - assincrono aumenta superficie de persistencia de estado temporario
- **Impacto em UX/operacao**:
  - misto exige estados como `pendente`, `concluida`, `falhou`, `revisao`
- **Impacto em custo**:
  - assincrono e misto ajudam a controlar retries e lotes
- **Recomendacao inicial**: misto, com request leve on-demand e processamento pesado assincrono
- **Reversibilidade**: alta
- **O que fica bloqueado sem decidir isso**:
  - desenho das rotas
  - entidades de job
  - UX de processamento

### A4. Fallback e controle de custo da IA

- **Nome da decisao**: politica de fallback e quotas
- **Por que ela existe**: sem isso a Fase 3 pode virar custo invisivel ou indisponibilidade silenciosa
- **Opcoes possiveis**:
  - sem fallback, apenas erro
  - fallback tecnico por provider/modelo
  - fallback tecnico mais quotas por feature e por unidade
- **Pros**:
  - simples: menor codigo
  - fallback: maior resiliencia
  - fallback + quotas: melhor governanca
- **Contras**:
  - sem fallback: experiencia fragil
  - fallback: exige contratos mais cuidadosos
  - quotas: exige painel e telemetria
- **Riscos**:
  - runaway cost
  - uso desigual entre unidades
  - degradacao silenciosa de qualidade
- **Impacto em arquitetura**:
  - precisa de metrica de consumo por unidade e por feature
- **Impacto em dados/LGPD**:
  - baixo, salvo persistencia de payloads para debugging
- **Impacto em UX/operacao**:
  - operador precisa ver indisponibilidade e degradacao de forma clara
- **Impacto em custo**:
  - alto, esta decisao governa o teto financeiro da Fase 3
- **Recomendacao inicial**: quotas por feature e por unidade, com fallback tecnico opcional e degradacao explicita na UI
- **Reversibilidade**: media
- **O que fica bloqueado sem decidir isso**:
  - rollout controlado por unidade
  - aprovacao financeira da Fase 3

### A5. Politica de habilitacao e desligamento da IA

- **Nome da decisao**: politica de feature flags e desligamento operacional da IA
- **Por que ela existe**: a Fase 3 gera custo pago por uso e precisa de controle operacional para ligar, desligar e limitar consumo sem depender da UI
- **Opcoes possiveis**:
  - habilitacao implicita por deploy
  - chave global apenas
  - chave global + chave por modulo
  - chave global + chave por modulo + chave por unidade
- **Pros**:
  - global apenas: simples de operar
  - global + modulo: permite rollout progressivo por frente
  - global + modulo + unidade: melhor governanca de custo e rollout controlado
- **Contras**:
  - implicita por deploy: perigosa e pouco auditavel
  - global apenas: grosseira demais
  - global + modulo + unidade: exige contratos e observabilidade mais disciplinados
- **Riscos**:
  - custo silencioso quando a IA deveria estar desligada
  - job de IA continuar rodando em background
  - inconsistencias entre UI e backend
  - uso desigual entre unidades sem teto financeiro claro
- **Impacto em arquitetura**:
  - exige leitura centralizada de flags no servidor;
  - exige enforcement server-side antes de chamar provider ou enfileirar job;
  - exige desenho compativel com quotas por modulo e por unidade.
- **Impacto em dados/LGPD**:
  - reduz exposicao desnecessaria de dados quando a IA estiver desligada;
  - ajuda a provar que nao houve envio externo quando o recurso estava desabilitado.
- **Impacto em UX/operacao**:
  - a UI precisa informar claramente quando a feature estiver indisponivel;
  - operacao ganha desligamento rapido por incidente de custo ou governanca.
- **Impacto em custo**:
  - altissimo impacto positivo na governanca financeira;
  - e a principal barreira contra consumo pago indevido.
- **Recomendacao inicial**:
  - IA desligada por padrao;
  - chave global obrigatoria `ai.enabled`;
  - chave por modulo obrigatoria, no minimo `ai.imageAnalysis.enabled` e `ai.predictiveInsights.enabled`;
  - chave por unidade prevista desde a fundacao;
  - backend como autoridade;
  - fail-closed;
  - nenhuma chamada paga nem job de IA quando desligada.
- **Reversibilidade**: alta para nomenclatura, baixa para a necessidade da politica em si
- **O que fica bloqueado sem decidir isso**:
  - desenho do modulo `features/ai`
  - rollout controlado da Fase 3
  - aprovacao financeira da IA
  - governanca por unidade
  - observabilidade de custo
  - seguranca operacional para desligar IA em caso de custo excessivo

### B1. Consentimento para analise de imagem

- **Nome da decisao**: consentimento obrigatorio ou opt-in por fluxo
- **Por que ela existe**: imagens de pets e resultados de IA elevam risco de privacidade, contestacao e uso indevido
- **Opcoes possiveis**:
  - consentimento geral no cadastro
  - opt-in por fluxo de uso de imagem
  - opt-in por fluxo com finalidade explicita
- **Pros**:
  - geral: mais simples operacionalmente
  - por fluxo: mais preciso
  - por fluxo + finalidade: melhor postura LGPD
- **Contras**:
  - geral: fraco juridicamente para usos avancados
  - por fluxo: mais friccao operacional
  - por finalidade: exige UX mais cuidadosa
- **Riscos**:
  - uso de imagem fora da expectativa do tutor
  - consentimento generico demais
- **Impacto em arquitetura**:
  - requer modelagem de consentimento por finalidade
- **Impacto em dados/LGPD**:
  - alto
- **Impacto em UX/operacao**:
  - aumenta passos de aceite, mas reduz risco juridico
- **Impacto em custo**:
  - baixo a moderado
- **Recomendacao inicial**: opt-in por fluxo com finalidade explicita
- **Reversibilidade**: baixa a media
- **O que fica bloqueado sem decidir isso**:
  - analise de imagem
  - exibicao de resultados ao tutor
  - politica de retencao associada

### B2. Retencao de imagem e resultados de IA

- **Nome da decisao**: politica de retencao e descarte
- **Por que ela existe**: a Fase 3 aumenta o volume de dados sensiveis e o custo de armazenar resultado tecnico pouco util
- **Opcoes possiveis**:
  - reter tudo por prazo indefinido
  - reter imagem original e resultado interpretado, descartando payload bruto
  - reter minimo necessario com expiracao automatica
- **Pros**:
  - tudo: facilita depuracao
  - original + interpretado: bom equilibrio de rastreio
  - minimo com expiracao: menor risco e menor custo
- **Contras**:
  - tudo: alto risco LGPD e custo
  - original + interpretado: ainda exige governanca
  - minimo: menos material para debugging
- **Riscos**:
  - retencao excessiva
  - vazamento de payload bruto
  - dependencia de dado que nao deveria existir
- **Impacto em arquitetura**:
  - exige politicas de TTL, arquivamento e purge
- **Impacto em dados/LGPD**:
  - altissimo
- **Impacto em UX/operacao**:
  - baixo na UI; alto em auditoria e suporte
- **Impacto em custo**:
  - alto em storage e debugging
- **Recomendacao inicial**: reter imagem original quando operacionalmente necessaria, reter resultado interpretado e descartar payload bruto por padrao, com expiracao automatica para artefatos tecnicos
- **Reversibilidade**: media
- **O que fica bloqueado sem decidir isso**:
  - desenho de storage
  - tabela de metadados de IA
  - governanca de suporte e auditoria

### B3. Visibilidade dos resultados de IA

- **Nome da decisao**: quem ve o resultado e em qual nivel
- **Por que ela existe**: protege contra interpretacao indevida e limita exposicao de informacao sensivel
- **Opcoes possiveis**:
  - operador interno apenas
  - operador e auditoria
  - operador, auditoria e tutor
- **Pros**:
  - operador apenas: menor risco
  - operador + auditoria: melhor trilha de conformidade
  - incluir tutor: maior transparencia
- **Contras**:
  - operador apenas: menos transparencia externa
  - incluir tutor: risco de leitura clinica indevida
- **Riscos**:
  - tutor interpretar resultado como diagnostico
  - vazamento de metadado sensivel
- **Impacto em arquitetura**:
  - exige nivel de visibilidade por resultado
- **Impacto em dados/LGPD**:
  - medio a alto
- **Impacto em UX/operacao**:
  - alto, principalmente no portal do tutor
- **Impacto em custo**:
  - baixo
- **Recomendacao inicial**: operador e auditoria no primeiro corte; tutor apenas em casos explicitamente aprovados e com linguagem restritiva
- **Reversibilidade**: media
- **O que fica bloqueado sem decidir isso**:
  - regras de exibicao no portal
  - escopo do primeiro corte de analise de imagem

### C1. Compartilhamento de cliente e pet entre unidades

- **Nome da decisao**: cliente/pet compartilhado ou segregado
- **Por que ela existe**: afeta ownership, historico, UX de busca e risco de vazamento cross-unit
- **Opcoes possiveis**:
  - totalmente segregado por unidade
  - compartilhado com visibilidade controlada
  - modelo mestre com vinculo por unidade
- **Pros**:
  - segregado: menor risco de acesso indevido
  - compartilhado controlado: experiencia melhor para rede
  - mestre + vinculo: melhor equilibrio entre identidade unica e operacao local
- **Contras**:
  - segregado: duplica cadastro
  - compartilhado: aumenta complexidade de autorizacao
  - mestre + vinculo: exige modelagem mais cuidadosa
- **Riscos**:
  - duplicidade de dados
  - vazamento entre unidades
  - historico fragmentado
- **Impacto em arquitetura**:
  - alto no dominio central
- **Impacto em dados/LGPD**:
  - alto
- **Impacto em UX/operacao**:
  - muito alto na recepcao e no tutor
- **Impacto em custo**:
  - moderado
- **Recomendacao inicial**: modelo mestre com vinculo por unidade
- **Reversibilidade**: baixa
- **O que fica bloqueado sem decidir isso**:
  - multiunidade operacional
  - dashboards consolidados
  - experiencia cross-unit do tutor

### C2. Compartilhamento de estoque, equipe e servicos

- **Nome da decisao**: ativos operacionais compartilhados ou segregados
- **Por que ela existe**: define consistencia operacional e evita consolidacao artificial entre unidades
- **Opcoes possiveis**:
  - tudo segregado
  - tudo compartilhado
  - servicos com catalogo base e parametrizacao por unidade; equipe e estoque segregados
- **Pros**:
  - segregado: clareza operacional
  - compartilhado: menos administracao
  - misto: equilibrio pragmatica
- **Contras**:
  - segregado: manutencao repetitiva
  - compartilhado: mascara diferencas reais entre unidades
  - misto: exige regras claras por entidade
- **Riscos**:
  - saldo de estoque errado
  - agenda/equipe incoerentes
  - servicos com preco/duracao fora do contexto local
- **Impacto em arquitetura**:
  - alto nas entidades operacionais
- **Impacto em dados/LGPD**:
  - baixo a medio
- **Impacto em UX/operacao**:
  - muito alto
- **Impacto em custo**:
  - moderado
- **Recomendacao inicial**: servicos com catalogo base + parametros por unidade; equipe e estoque segregados por unidade
- **Reversibilidade**: media
- **O que fica bloqueado sem decidir isso**:
  - escopo do Bloco 2 da Fase 3
  - dashboards e relatorios por unidade

### C3. Visao global, papeis globais e troca de contexto

- **Nome da decisao**: modelo de sessao e dashboards multiunidade
- **Por que ela existe**: sem isso multiunidade vira apenas filtro visual inconsistente
- **Opcoes possiveis**:
  - sessao fixa por unidade
  - sessao com troca manual de contexto
  - sessao multi-contexto com papeis globais
- **Pros**:
  - fixa: mais simples e segura
  - troca manual: melhor para operacao de rede pequena
  - multi-contexto: melhor para supervisao central
- **Contras**:
  - fixa: ruim para gestor
  - troca manual: pode induzir erro de contexto
  - multi-contexto: maior complexidade e risco
- **Riscos**:
  - operacao no contexto errado
  - dashboard global expor dado demais
- **Impacto em arquitetura**:
  - alto em auth, RBAC e cache
- **Impacto em dados/LGPD**:
  - alto em autorizacao
- **Impacto em UX/operacao**:
  - muito alto
- **Impacto em custo**:
  - moderado
- **Recomendacao inicial**: troca manual de contexto com papeis globais explicitamente limitados
- **Reversibilidade**: media
- **O que fica bloqueado sem decidir isso**:
  - dashboards globais
  - filtros cross-unit
  - design de sessao multiunidade

### D1. Primeiro corte de casos de uso de analise de imagem

- **Nome da decisao**: qual caso de uso entra primeiro
- **Por que ela existe**: evita abrir visao computacional em muitos pontos sem validar valor real
- **Opcoes possiveis**:
  - identificacao de raca/caracteristicas
  - organizacao de galeria e metadata
  - verificacao assistida pre/post-servico
  - analise preliminar de saude
- **Pros**:
  - raca/caracteristicas: valor moderado e menor risco
  - galeria/metadata: baixo risco e utilidade operacional clara
  - pre/post-servico: valor operacional e de qualidade
  - saude preliminar: alto potencial de valor
- **Contras**:
  - raca: valor operacional menor
  - galeria: menos "wow factor"
  - pre/post: precisa UX e aprovacao humana
  - saude preliminar: maior risco juridico e interpretativo
- **Riscos**:
  - abrir logo pelo caso mais sensivel
- **Impacto em arquitetura**:
  - moderado
- **Impacto em dados/LGPD**:
  - medio a alto
- **Impacto em UX/operacao**:
  - alto
- **Impacto em custo**:
  - moderado
- **Recomendacao inicial**: comecar por organizacao de galeria/metadados e verificacao assistida pre/post-servico; nao comecar por saude preliminar
- **Reversibilidade**: alta
- **O que fica bloqueado sem decidir isso**:
  - backlog do Bloco 3
  - selecao do provider/modelo inicial

### D2. Revisao humana em analise de imagem

- **Nome da decisao**: resultado automatico vs revisao/aprovacao humana
- **Por que ela existe**: reduz risco de erro operacional e interpretacao clinica
- **Opcoes possiveis**:
  - sem revisao
  - revisao humana obrigatoria
  - revisao humana apenas para resultados sensiveis
- **Pros**:
  - sem revisao: fluxo mais rapido
  - obrigatoria: maior seguranca
  - por sensibilidade: equilibrio
- **Contras**:
  - sem revisao: alto risco
  - obrigatoria: mais friccao
  - por sensibilidade: exige boa classificacao de risco
- **Riscos**:
  - operador confiar demais na IA
  - uso clinico indevido
- **Impacto em arquitetura**:
  - exige estado de aprovacao/rejeicao
- **Impacto em dados/LGPD**:
  - baixo a medio
- **Impacto em UX/operacao**:
  - alto
- **Impacto em custo**:
  - baixo
- **Recomendacao inicial**: revisao humana obrigatoria no primeiro corte
- **Reversibilidade**: alta
- **O que fica bloqueado sem decidir isso**:
  - desenho do fluxo final de analise de imagem

### D3. Linguagem obrigatoria de UI para imagem

- **Nome da decisao**: aviso e linguagem de exibicao
- **Por que ela existe**: evita que o sistema seja percebido como diagnostico veterinario
- **Opcoes possiveis**:
  - linguagem neutra sem aviso claro
  - aviso curto
  - aviso curto + rotulo assistivo + CTA de revisao humana
- **Pros**:
  - curto + rotulo + CTA protege melhor juridicamente e operacionalmente
- **Contras**:
  - adiciona friccao visual
- **Riscos**:
  - interpretacao clinica
  - uso indevido pelo tutor
- **Impacto em arquitetura**:
  - baixo
- **Impacto em dados/LGPD**:
  - baixo
- **Impacto em UX/operacao**:
  - medio
- **Impacto em custo**:
  - baixo
- **Recomendacao inicial**: aviso curto + rotulo assistivo + exigencia explicita de revisao humana
- **Reversibilidade**: alta
- **O que fica bloqueado sem decidir isso**:
  - texto final de UI
  - publicacao do primeiro fluxo assistido

### E1. Primeiro insight preditivo

- **Nome da decisao**: qual insight entra primeiro
- **Por que ela existe**: previsao ampla demais cedo demais gera ruido e baixa confianca
- **Opcoes possiveis**:
  - previsao de demanda de agenda
  - risco de churn de cliente
  - recomendacao de estoque
  - recomendacao de preco
- **Pros**:
  - demanda: dado ja existe e impacto operacional e claro
  - churn: valor comercial
  - estoque: valor para operacao
  - preco: potencial financeiro
- **Contras**:
  - demanda: menos "sofisticado"
  - churn: exige historico e definicao de rotulo
  - estoque: depende de maturidade do PDV/estoque
  - preco: maior sensibilidade e risco
- **Riscos**:
  - pouca base historica
  - insight sem acao clara
- **Impacto em arquitetura**:
  - moderado
- **Impacto em dados/LGPD**:
  - medio
- **Impacto em UX/operacao**:
  - alto
- **Impacto em custo**:
  - moderado
- **Recomendacao inicial**: primeiro insight em previsao de demanda de agenda por unidade
- **Reversibilidade**: alta
- **O que fica bloqueado sem decidir isso**:
  - backlog do Bloco 4
  - criterios de dataset e dashboard inicial

### E2. Escopo, janela historica e frequencia dos insights

- **Nome da decisao**: consolidado vs por unidade, janela minima e frequencia
- **Por que ela existe**: sem isso a previsao nasce sem base comparavel
- **Opcoes possiveis**:
  - consolidado geral
  - por unidade
  - ambos
- **Pros**:
  - consolidado: mais volume de dado
  - por unidade: mais aderencia operacional
  - ambos: mais completo
- **Contras**:
  - consolidado: mascara comportamento local
  - por unidade: pode sofrer com amostra pequena
  - ambos: mais complexidade
- **Riscos**:
  - insight errado por agregacao ruim
  - calculo frequente demais sem ganho real
- **Impacto em arquitetura**:
  - moderado
- **Impacto em dados/LGPD**:
  - medio
- **Impacto em UX/operacao**:
  - alto
- **Impacto em custo**:
  - moderado
- **Recomendacao inicial**: insight por unidade como padrao, com minimo de 6 meses de historico util e recalculo diario
- **Reversibilidade**: media
- **O que fica bloqueado sem decidir isso**:
  - definicao do dataset
  - cron de processamento
  - dashboard inicial

### E3. Natureza da saida preditiva

- **Nome da decisao**: recomendacao vs simulacao vs automacao
- **Por que ela existe**: define o limite entre apoio a decisao e acao automatica
- **Opcoes possiveis**:
  - recomendacao
  - simulacao assistida
  - automacao
- **Pros**:
  - recomendacao: menor risco
  - simulacao: ajuda decisao sem executar
  - automacao: maior potencial de ganho futuro
- **Contras**:
  - recomendacao: menor impacto imediato
  - simulacao: exige UX mais rica
  - automacao: alto risco
- **Riscos**:
  - IA passar a definir politica de negocio sem supervisao
  - operador confiar cegamente no score
- **Impacto em arquitetura**:
  - automacao exige governanca e trilha muito mais fortes
- **Impacto em dados/LGPD**:
  - medio
- **Impacto em UX/operacao**:
  - alto
- **Impacto em custo**:
  - recomendacao e simulacao sao mais previsiveis
- **Recomendacao inicial**: comecar em recomendacao, com simulacao opcional em passos posteriores; nao automatizar no primeiro corte
- **Reversibilidade**: alta
- **O que fica bloqueado sem decidir isso**:
  - UX do painel de insights
  - aprovacao de produto para o Bloco 4

---

## Priorizacao executiva

### Decisoes criticas imediatas

- A1. arquitetura de integracao de IA
- A2. modelo de hospedagem da IA
- A5. politica de habilitacao e desligamento da IA
- B1. consentimento para analise de imagem
- B2. retencao de imagem e resultados de IA
- C1. compartilhamento de cliente e pet entre unidades
- C2. compartilhamento de estoque, equipe e servicos
- C3. visao global, papeis globais e troca de contexto

### Decisoes importantes, mas nao bloqueantes do primeiro bloco

- A3. modo de execucao da IA
- A4. fallback e controle de custo da IA
- B3. visibilidade dos resultados de IA
- D2. revisao humana em analise de imagem
- E2. escopo, janela historica e frequencia dos insights

### Decisoes que podem ser adiadas

- D1. primeiro corte exato de casos de uso de imagem, desde que o Bloco 1 deixe a fundacao pronta
- D3. linguagem final de UI, desde que a restricao assistiva ja esteja decidida
- E1. primeiro insight preditivo, se a fundacao e o dataset forem preparados antes
- E3. simulacao futura de insight, desde que o primeiro corte fique apenas em recomendacao

---

## Recomendacoes iniciais para aprovacao

Estas recomendacoes sao iniciais. Elas nao substituem a aprovacao humana formal.

### Caminho inicial recomendado

1. **IA por adaptador interno com provider cloud API no primeiro corte**
- menor risco de arquitetura que integracao direta;
- menor custo inicial e menor atrito que self-hosted;
- preserva caminho de migracao para modelo hibrido depois.

2. **IA desligada por padrao e governada por flags server-side**
- chave global obrigatoria;
- chave por modulo obrigatoria;
- chave por unidade prevista desde a fundacao;
- comportamento fail-closed;
- nenhuma chamada paga, job ou retry quando desligada.

3. **Execucao mista**
- request leve on-demand quando fizer sentido;
- processamento pesado assincrono;
- evita timeout e prepara observabilidade correta.

4. **LGPD e consentimento conservadores**
- opt-in por fluxo e por finalidade;
- retencao minima;
- payload bruto descartado por padrao;
- expiracao automatica para artefatos tecnicos.

5. **Visibilidade inicial restrita**
- resultado de IA visivel para operador e auditoria;
- sem exibicao para tutor no primeiro corte;
- revisao humana obrigatoria nos fluxos de imagem.

6. **Multiunidade com identidade mestra e operacao local**
- cliente/pet em modelo mestre com vinculo por unidade;
- estoque e equipe segregados por unidade;
- servicos com catalogo base mais parametrizacao local;
- troca manual de contexto com papeis globais limitados.

7. **Imagem com foco operacional e baixo risco**
- comecar por galeria/metadados e verificacao assistida pre/post-servico;
- nao iniciar por saude preliminar.

8. **Predicao como recomendacao, nao automacao**
- primeiro insight: demanda de agenda por unidade;
- minimo de 6 meses de historico util;
- recalculo diario;
- sem precificacao automatica no primeiro corte.

### Trade-offs assumidos

- menor sofisticacao inicial em troca de maior auditabilidade;
- menos automacao inicial em troca de menor risco juridico;
- mais disciplina de contexto em multiunidade em troca de menor risco de vazamento cross-unit;
- menor flexibilidade imediata em UX para o tutor em troca de menor risco de interpretacao clinica indevida.

---

## Resultado pronto para decisao

Este documento deve permitir uma aprovacao humana em um destes estados:

- `aprovado`
- `aprovado com ajustes`
- `pendente de definicao adicional`
- `rejeitado`

---

## Referencias externas usadas nesta matriz

Estas referencias oficiais foram usadas apenas para calibrar a comparacao de provider, custo e capacidades tecnicas:

- OpenAI image model and multimodal docs: [GPT Image 1 model](https://developers.openai.com/api/docs/models/gpt-image-1)
- OpenAI Responses/Image docs: [Image generation](https://platform.openai.com/docs/guides/images/image-generation)
- OpenAI pricing: [API pricing](https://platform.openai.com/docs/pricing/) e [pricing overview](https://openai.com/api/pricing/)
- OpenAI data controls/privacy: [How we use your data](https://platform.openai.com/docs/models/how-we-use-your-data) e [Enterprise privacy](https://openai.com/policies/api-data-usage-policies/)
- Gemini image understanding: [Gemini API vision](https://ai.google.dev/gemini-api/docs/vision)
- Gemini pricing/billing: [Gemini pricing](https://ai.google.dev/pricing) e [Gemini billing](https://ai.google.dev/gemini-api/docs/billing/)
- Google Cloud Vision capabilities and pricing: [Cloud Vision docs](https://cloud.google.com/vision/docs), [images.annotate](https://docs.cloud.google.com/vision/docs/reference/rest/v1/images/annotate) e [Cloud Vision pricing](https://cloud.google.com/vision/pricing)
