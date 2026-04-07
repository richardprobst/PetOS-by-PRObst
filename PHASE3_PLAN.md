# PHASE3_PLAN.md

## 1. Objetivo da Fase 3

A Fase 3 do PetOS existe para abrir, de forma consciente e controlada, os itens do PRD que hoje continuam fora da baseline operacional:

- analise de imagem;
- analise preditiva;
- multiunidade operacional completa.

Esta fase nao existe para reabrir o MVP nem para continuar estabilizacao tardia da Fase 2.
Ela parte da baseline ja publicada e funcional, tratando IA avancada e escalabilidade como uma frente propria, com planejamento, gates e riscos explicitos.

Para a matriz pronta para aprovacao antes de qualquer implementacao, use tambem:

- [docs/phase3-decision-matrix.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase3-decision-matrix.md)
- [docs/phase3-approval-board.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase3-approval-board.md)

---

## 2. Escopo da Fase 3

Entram explicitamente na Fase 3, conforme o PRD:

- **Analise de Imagem (Visao Computacional)**:
  - identificacao de racas e caracteristicas;
  - analise preliminar de saude em olhos, pele e pelagem;
  - verificacao de condicao pre/pós-servico;
  - organizacao de galeria de fotos com metadados.
- **Analise Preditiva**:
  - previsao de demanda de servicos;
  - recomendacoes para estoque;
  - identificacao de clientes em risco de churn;
  - apoio a politica comercial e de precos.
- **Suporte a Multiunidade Operacional Completa**:
  - escopo operacional por unidade;
  - segregacao consistente de acesso e dados;
  - visao consolidada ou filtrada quando o papel permitir;
  - configuracoes, fluxo e reporting coerentes entre multiplas unidades.

---

## 3. Itens fora da Fase 3

### 3.1. Continuam em roadmap futuro

- wearables para pets;
- gamificacao;
- mercado de produtos personalizados;
- assistente virtual por voz.

### 3.2. Continuam fora desta abertura

- reabrir blocos ja fechados do MVP ou da Fase 2 sem evidencia de gap real;
- transformar IA em substituta de regra de negocio;
- diagnostico veterinario automatico;
- execucao autonoma de campanha, precificacao ou mudanca operacional sem supervisao humana;
- troca de stack ou reescrita arquitetural ampla sem necessidade objetiva.

---

## 4. Gate de entrada da Fase 3

A Fase 3 so deve sair do planejamento para implementacao quando estes pontos estiverem atendidos:

1. homologacao operacional do sistema publicado concluida ou suficientemente estabilizada;
2. gaps remanescentes do MVP e da Fase 2 classificados e sem bloqueantes graves para a operacao atual;
3. baseline de dados confiavel para analise:
   - agendamentos;
   - status;
   - financeiro;
   - estoque;
   - comunicacao;
   - report cards;
   - midia;
4. politica minima de LGPD, consentimento e retencao definida para uso de IA;
5. provider ou estrategia tecnica de IA escolhidos de forma explicita;
6. decisao clara sobre custo, observabilidade e rollback de features de IA.

Se esses gates nao estiverem satisfeitos, o correto e continuar em homologacao operacional e nao abrir implementacao da Fase 3.

---

## 5. Principios de execucao

- Preservar a baseline atual. Fase 3 cresce sobre o sistema operacional existente, nao contra ele.
- IA deve ser assistiva, explicavel e auditavel. Nunca deve virar fonte automatica de verdade em decisao critica.
- Manter o servidor como autoridade. Predicoes, classificacoes e recomendacoes podem informar a UI, mas regras criticas continuam no backend.
- Toda feature de IA deve nascer sob **feature flags server-side**, com custo controlado e desligamento operacional rapido.
- Deve existir, no minimo:
  - chave global `ai.enabled`;
  - chave por modulo, como `ai.imageAnalysis.enabled` e `ai.predictiveInsights.enabled`;
  - previsao de chave por unidade quando o modelo multiunidade estiver pronto.
- O comportamento deve ser **fail-closed**:
  - flag ausente, invalida ou inconsistente significa `desabilitado`;
  - o sistema nunca deve assumir IA habilitada por padrao.
- Com IA desligada, o sistema nao pode:
  - chamar provider pago;
  - enfileirar job de IA;
  - processar retry automatico;
  - consumir custo silenciosamente em background.
- Comecar por superficies read-only ou assistidas sempre que possivel, antes de qualquer acao semi-automatica.
- Garantir feature flags por modulo e, quando fizer sentido, por unidade.
- Tratar multiunidade como problema de dominio, autorizacao, consulta e operacao, nao apenas como filtro visual.
- Separar claramente:
  - inferencia de IA;
  - persistencia de metadados;
  - apresentacao da recomendacao;
  - acao humana subsequente.
- Preservar rastreabilidade:
  - input usado;
  - provider/modelo;
  - resultado bruto relevante;
  - resultado interpretado;
  - usuario que aprovou ou descartou a recomendacao.

---

## 6. Ambiguidades que precisam de decisao antes da implementacao

Estas decisoes nao estao detalhadas o suficiente no PRD e precisam ser fechadas antes de codar:

### 6.1. Analise de imagem

- quais tipos de imagem entram no fluxo inicial;
- se a analise sera sob demanda, assíncrona ou mista;
- quais resultados serao mostrados ao operador e quais ficarao apenas como metadado;
- como deixar explicito que a leitura de saude e preliminar e nao substitui veterinario.

### 6.2. Analise preditiva

- se o primeiro corte sera por unidade ou consolidado;
- horizonte minimo de historico para cada previsao;
- se a politica de preco sera apenas recomendacao ou simulacao;
- quais insights entram primeiro no painel para nao gerar ruido.

### 6.3. Multiunidade

- se cliente e pet podem ser compartilhados entre unidades ou apenas visualizados entre elas;
- se estoque, equipe, servicos e agenda serao estritamente segregados por unidade ou parcialmente compartilhados;
- quais perfis terao visao global;
- como sera a troca de contexto de unidade na sessao.

---

## 7. Ordem recomendada de implementacao

### Bloco 1 - Fundacao da Fase 3
### Bloco 2 - Multiunidade operacional completa
### Bloco 3 - Analise de imagem
### Bloco 4 - Analise preditiva e insights
### Bloco 5 - Fechamento, observabilidade e governanca

Essa ordem e recomendada porque:

- a fundacao reduz risco de acoplamento errado;
- multiunidade afeta escopo, RBAC, consultas e dashboards que a IA tambem usara;
- analise de imagem depende de storage, midia, metadados e governanca;
- analise preditiva depende de base historica e segmentacao corretas;
- fechamento exige validar custo, valor real e riscos antes de ampliar uso.

---

## 8. Detalhamento dos blocos

### Bloco 1 - Fundacao da Fase 3

**Objetivo**

Abrir a Fase 3 pela fundacao necessaria para IA e multiunidade, sem ainda entregar a experiencia final ao usuario.

**Modulos, arquivos e sistemas impactados**

- `prisma/schema.prisma`
- `prisma/migrations/`
- `server/env.ts`
- `server/authorization/`
- `server/audit/`
- `server/http/`
- `server/storage/`
- novos dominios provaveis em `features/ai/`, `features/insights/` e `features/multiunit/`
- `app/admin/`
- `docs/`

**Dependencias**

- baseline atual funcional;
- gate de entrada da Fase 3 atendido;
- decisao inicial de provider ou adaptador de IA.

**Riscos**

- modelar tabelas demais antes de ter fluxo real;
- misturar backlog residual com estrutura de Fase 3;
- criar metadados de IA sem politica de retencao ou auditoria.

**Criterios de conclusao**

- feature flags e gating definidos;
- politica formal de habilitacao da IA definida com flag global, flag por modulo e previsao de flag por unidade;
- backend preparado para bloquear chamadas e jobs de IA quando a feature estiver desligada;
- contratos iniciais de IA e multiunidade desenhados;
- estrategia de persistencia para resultados de IA definida;
- trilha minima de auditoria e observabilidade prevista;
- documentacao de riscos, limites e hipoteses sincronizada.

### Bloco 2 - Multiunidade operacional completa

**Objetivo**

Fechar o que hoje ainda e apenas preparacao de modelagem por unidade e transformar isso em operacao multiunidade coerente.

**Modulos, arquivos e sistemas impactados**

- `features/appointments/`
- `features/clients/`
- `features/pets/`
- `features/services/`
- `features/finance/`
- `features/inventory/`
- `features/pos/`
- `features/messages/`
- `features/team-operations/`
- `server/authorization/`
- `server/auth/`
- `app/admin/`
- `app/tutor/`
- `app/api/`

**Entidades mais afetadas**

- `Unidades`
- `ConfiguracoesUnidade`
- `Usuarios`
- `Clientes`
- `Pets`
- `Servicos`
- `Funcionarios`
- `Agendamentos`
- `TransacoesFinanceiras`
- `Produtos`
- `EstoquesProduto`
- `LogsAuditoria`

**Dependencias**

- Bloco 1 concluido;
- decisoes de compartilhamento entre unidades fechadas.

**Riscos**

- vazamento de dados entre unidades;
- filtros inconsistentes entre UI, API e dominio;
- dashboards consolidados sem autorizacao adequada;
- regressao em fluxos hoje estaveis de unidade unica.

**Criterios de conclusao**

- contexto de unidade claro na sessao e nas rotas;
- RBAC e ownership por unidade consistentes;
- operacoes e relatorios respeitam escopo correto;
- perfis globais versus perfis locais ficam explicitamente separados;
- smoke multiunidade cobre agenda, financeiro, estoque, comunicacao e tutor.

### Bloco 3 - Analise de imagem

**Objetivo**

Entregar a primeira camada de visao computacional da Fase 3 como apoio operacional auditavel.

**Modulos, arquivos e sistemas impactados**

- `features/documents/`
- `features/report-cards/`
- `features/ai/vision/`
- `server/storage/`
- `server/integrations/`
- `app/admin/pets/`
- `app/admin/report-cards/`
- `app/tutor/`
- `app/api/admin/`

**Entidades mais afetadas**

- `Midia`
- `ReportCards`
- `Pets`
- `Agendamentos`
- tabelas novas, ainda nao definidas, para jobs, analises e metadados de IA

**Dependencias**

- Bloco 1 concluido;
- politica de consentimento e retencao definida;
- storage e upload operacionais;
- provider de visao computacional escolhido.

**Riscos**

- apresentar sugestao de IA como diagnostico;
- custo alto por volume de imagem;
- armazenamento excessivo de payload bruto;
- acoplamento forte a um provider especifico.

**Criterios de conclusao**

- o sistema consegue disparar analise de imagem de forma controlada;
- resultados ficam registrados com metadado suficiente para auditoria;
- UI mostra claramente que o resultado e assistivo;
- o fluxo cobre ao menos um caso de uso real do PRD sem ambiguidade perigosa.

### Bloco 4 - Analise preditiva e insights

**Objetivo**

Abrir os primeiros insights preditivos da Fase 3 sem transformar o sistema em caixa-preta.

**Modulos, arquivos e sistemas impactados**

- `features/insights/`
- `features/finance/`
- `features/inventory/`
- `features/messages/`
- `features/appointments/`
- `app/admin/financeiro/`
- `app/admin/estoque/`
- `app/admin/comunicacao/`
- `app/admin/agenda/`
- `app/api/admin/`

**Dados mais afetados**

- `Agendamentos`
- `HistoricoStatusAgendamento`
- `TransacoesFinanceiras`
- `Produtos`
- `MovimentacoesEstoque`
- `LogsMensagens`
- `CampanhasCRM`
- `ExecucoesCampanhaCRM`

**Dependencias**

- Bloco 1 concluido;
- recomendavel Bloco 2 concluido;
- base historica minimamente confiavel;
- definicao do modo de inferencia: lote, agendado ou on-demand.

**Riscos**

- previsoes com pouca base historica;
- recomendacoes opacas;
- confundir recomendacao comercial com regra obrigatoria;
- tentar automatizar preco ou acao comercial cedo demais.

**Criterios de conclusao**

- ao menos um painel de insight preditivo util e auditavel;
- saidas explicadas por unidade e por janela temporal;
- recomendacoes claramente separadas de acao automatica;
- medicacao minima de utilidade operacional coletada.

### Bloco 5 - Fechamento, observabilidade e governanca

**Objetivo**

Consolidar a Fase 3 de forma segura, observavel e economicamente controlada.

**Modulos, arquivos e sistemas impactados**

- `docs/`
- `tests/`
- `server/audit/`
- `server/http/`
- `server/integrations/`
- `features/ai/`
- `features/insights/`
- `features/multiunit/`

**Dependencias**

- blocos anteriores concluidos.

**Riscos**

- custo operacional de IA sem controle;
- pouca explicabilidade;
- ausencia de fallback quando provider falhar;
- falta de criterio para desligar uma feature que nao entregou valor.

**Criterios de conclusao**

- smoke e regressao especificos da Fase 3 definidos;
- logging, auditoria e alertas minimos previstos;
- limites de custo e fallback documentados;
- baseline da Fase 3 marcada sem contaminar o recorte anterior.

---

## 9. Entidades e estruturas provaveis da Fase 3

Sem fechar schema antes da hora, a Fase 3 provavelmente exigira estruturas novas para:

- jobs de IA;
- resultados de analise de imagem;
- metadados e versoes de provider/modelo;
- snapshots de insight preditivo;
- configuracao de feature flag por unidade;
- contexto de sessao multiunidade e trilha de aprovacao humana.

Essas estruturas devem nascer apenas no bloco apropriado, com migrations pequenas e sem antecipar o bloco seguinte.

---

## 10. Seguranca e governanca obrigatorias

Na Fase 3, revisar com atencao extra:

- consentimento para uso de imagem;
- retencao de resultados e midia sensivel;
- segregacao de dados entre unidades;
- auditoria de recomendacoes aceitas ou descartadas;
- protecao contra vazamento de dados cross-unit;
- protecao de segredos e credenciais de providers de IA;
- limitacao de custo e taxa de chamadas externas;
- linguagem de UI para nao sugerir diagnostico clinico definitivo.

---

## 11. Estrategia de testes

Prioridade de testes na Fase 3:

1. autorizacao e isolamento por unidade;
2. integridade dos dados usados para inferencia;
3. contratos de entrada e saida dos adaptadores de IA;
4. auditoria e rastreabilidade;
5. fallback quando provider externo falhar;
6. smoke dos paineis e fluxos assistidos;
7. regressao dos modulos ja estaveis do MVP e da Fase 2.

---

## 12. Regra de decisao para implementacao

Se um item da Fase 3 puder ser entregue primeiro como:

- leitura;
- sugestao;
- recomendacao;
- classificacao assistida;

esse caminho deve ser preferido antes de qualquer automacao ativa.

Em especial:

- analise de imagem deve começar como apoio operacional;
- analise preditiva deve começar como insight;
- multiunidade deve priorizar isolamento correto antes de consolidacao sofisticada.

---

## 13. Sinal de saida do planejamento

O planejamento explicito da Fase 3 pode ser considerado pronto quando:

- o escopo estiver separado da homologacao atual;
- as ambiguidades principais estiverem listadas;
- a ordem de implementacao estiver definida;
- os gates de entrada estiverem claros;
- os riscos e limites estiverem documentados;
- o inicio da implementacao puder acontecer bloco a bloco, sem contaminar a baseline ja entregue.
