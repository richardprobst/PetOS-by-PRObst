# AGENTS.md — Projeto PetOS

## 1. Objetivo deste arquivo

Este arquivo define como agentes de IA devem atuar no projeto **PetOS**.

Ele existe para garantir que toda sugestão, análise, código, refatoração, teste e documentação:

- siga o **PRD do PetOS** como fonte principal de verdade;
- respeite o **escopo por fase**;
- mantenha **consistência arquitetural**;
- preserve **segurança, rastreabilidade e qualidade**;
- evite improvisos, antecipações indevidas e código desalinhado com o produto.

Se houver conflito entre este arquivo e o PRD, o **PRD vence**.  
Se houver ambiguidade no PRD, o agente deve **sinalizar explicitamente** a ambiguidade antes de inventar uma regra.

---

## 2. Fonte de verdade e ordem de consulta

### Ordem de prioridade
1. **PetOS_PRD.md**
2. **AGENTS.md**
3. **docs/domain-rules.md**
4. **docs/architecture.md**
5. **docs/payments.md**
6. **docs/security-notes.md**
7. **docs/data-model.md**
8. **docs/decisions/README.md** e ADRs relacionados
9. decisões técnicas já implementadas no repositório
10. instruções explícitas do mantenedor do projeto

### Regra obrigatória
Antes de implementar qualquer funcionalidade, o agente deve identificar:
- em qual fase a funcionalidade está: **MVP**, **Fase 2**, **Fase 3** ou **Roadmap Futuro**;
- quais entidades, regras de negócio e dependências do PRD são afetadas;
- se a solicitação altera produto, arquitetura, dados, segurança ou apenas UI.

### Regra de bom senso
O agente **não precisa consultar todos os documentos em toda tarefa**.  
Ele deve consultar os documentos **relevantes ao contexto da tarefa**.

Exemplos:
- tarefa de pagamento → consultar `docs/payments.md`;
- tarefa de modelagem → consultar `docs/data-model.md`;
- tarefa de regra operacional → consultar `docs/domain-rules.md`;
- dúvida estrutural → consultar `docs/architecture.md` e ADRs.

---

## 3. Documentos complementares do repositório

Além das fontes principais, o agente deve conhecer os seguintes documentos de apoio:

- `README.md` → visão geral do projeto, setup e estrutura inicial do repositório
- `CONTRIBUTING.md` → fluxo de contribuição, branches, revisão e documentação
- `SECURITY.md` → política geral de segurança e reporte responsável
- `CHANGELOG.md` → histórico de mudanças relevantes do projeto

### Observação
Esses arquivos **não substituem** PRD, regras de domínio ou decisões arquiteturais.  
Eles servem como apoio de contexto e workflow.

---

## 4. Visão geral do projeto PetOS

O PetOS é um sistema SaaS para pet shops, banho e tosa e serviços correlatos, focado no mercado brasileiro.

### Contextos principais
- Agenda e Operação
- Cliente/Pet
- Serviços
- Comunicação
- Financeiro/Fiscal
- Portal do Tutor
- Gestão da Equipe
- IA e Insights
- Logística/Táxi Dog
- Multiunidade

### Objetivo do produto
Centralizar a operação, melhorar a experiência do tutor, organizar o fluxo do atendimento e permitir evolução futura para automações, IA, pagamentos e expansão multiunidade.

---

## 5. Regra de ouro de escopo

## O agente NÃO deve antecipar funcionalidades de fases futuras

Se algo estiver fora do **MVP**, não implementar no MVP sem instrução explícita.

### MVP atual
Implementar somente o que estiver dentro de:
- agendamento e operação básicos;
- status do atendimento;
- check-in com checklist;
- cadastro de clientes e pets;
- gestão de serviços;
- comunicação manual via WhatsApp/e-mail com templates;
- financeiro básico;
- portal do tutor básico;
- controle de comissões;
- report card simples.

### Fase 2
Somente quando solicitado explicitamente:
- capacidade por profissional/porte/raça;
- depósito/pré-pagamento;
- bloqueios de agenda;
- waitlist;
- otimização de rotas Táxi Dog;
- documentos e formulários;
- review booster;
- campanhas segmentadas;
- recuperação de clientes inativos;
- ofertas por perfil;
- gatilhos pós-serviço;
- NFS-e/NFC-e;
- no-show protection;
- PDV completo;
- estoque completo;
- portal do tutor aprimorado;
- time clock, payroll e escalas.

### Fase 3
Somente quando solicitado explicitamente:
- análise de imagem;
- análise preditiva;
- multiunidade operacional completa.

### Roadmap futuro
Não implementar sem autorização expressa:
- wearables;
- gamificação;
- mercado de produtos personalizados;
- assistente por voz.

### Regra prática
Pensar em evolução futura é desejável.  
**Implementar escopo futuro sem necessidade é proibido.**

---

## 6. Stack obrigatória

## Base técnica
- **Next.js** com **App Router**
- **TypeScript** com `strict: true`
- **React**
- **Tailwind CSS**
- **MySQL**
- **Prisma ORM**
- **Route Handlers** no Next.js para APIs
- **next-auth v4** para autenticação (migração futura para Auth.js/NextAuth v5 é possível, mas fora desta etapa)
- **Zod** para validação
- **React Hook Form** para formulários interativos

## Decisões obrigatórias
- Não usar WordPress como base do sistema.
- Não introduzir framework alternativo sem aprovação.
- Não misturar padrões concorrentes sem necessidade real.
- Não criar acesso direto ao banco fora do Prisma como padrão.
- Não validar input crítico “na mão” se puder ser modelado com Zod.

---

## 7. Princípios de implementação

### 7.1. Código
Todo código deve ser:
- legível;
- modular;
- tipado;
- testável;
- previsível;
- sem duplicação desnecessária.

### 7.2. Estrutura
Preferir organização por domínio/feature quando isso melhorar manutenção, sem quebrar a convenção do App Router.

Estrutura típica aceitável:
- `app/`
- `app/api/`
- `components/`
- `features/`
- `lib/`
- `server/`
- `prisma/`
- `types/`
- `tests/`
- `docs/`

### 7.3. Convenções
- nomes claros e consistentes;
- sem abreviações obscuras;
- sem comentários redundantes;
- comentários apenas onde a regra de negócio ou a decisão técnica não forem óbvias;
- funções pequenas e com responsabilidade clara;
- evitar arquivos gigantes.

### 7.4. Flexibilidade controlada
O agente **pode** propor:
- melhorias de organização;
- refatorações que reduzam acoplamento;
- abstrações leves e justificadas;
- nomes melhores;
- pequenos ajustes técnicos que melhorem clareza ou segurança.

O agente **não deve**:
- reescrever estrutura sem necessidade;
- introduzir complexidade precoce;
- trocar padrão consolidado do projeto sem justificativa;
- “melhorar” o sistema adicionando escopo fora da fase.

### 7.5. O que evitar
- código placeholder do tipo `TODO: completar depois` em entregas principais;
- trechos incompletos com `rest of code here`;
- múltiplas formas de resolver o mesmo problema no mesmo projeto;
- lógica de negócio escondida em componente visual;
- regra crítica implementada apenas no frontend.

---

## 8. Regras duras de domínio

## 8.1. Status do atendimento
O fluxo operacional padrão é:

`Agendado -> Confirmado -> Check-in -> Em Atendimento -> Pronto para Retirada -> Concluído -> Faturado`

### Regras obrigatórias
- não permitir transições inválidas sem justificativa administrativa;
- registrar mudança de status em histórico;
- manter rastreabilidade de quem alterou o status;
- refletir corretamente os impactos em agenda, financeiro e comunicação.

### Observação importante
Sempre que possível, tratar **status operacional** e **status financeiro** como conceitos distintos, mesmo quando o PRD cite `Faturado` no fluxo final.
Se a implementação exigir essa separação, documentar a decisão claramente.

## 8.2. Agenda
- impedir overbooking do mesmo profissional no mesmo horário, salvo regra configurada;
- validar agendamento no passado;
- validar duração do serviço;
- validar conflito de recurso quando houver modelagem para recurso;
- preservar integridade entre agenda, serviço, profissional e pet.

## 8.3. No-show, cancelamento e reagendamento
- respeitar janelas configuráveis por unidade;
- não hardcodar `X`, `Y` e `Z` no código;
- centralizar essas regras em configuração por unidade;
- refletir impacto financeiro e de comunicação.

## 8.4. Comissão
- comissão calculada sobre valor faturado, após descontos, conforme PRD;
- vínculo por profissional e/ou serviço quando aplicável;
- lógica de cálculo deve ficar em camada de domínio, não em componente de UI.

## 8.5. Táxi Dog
- tratar transporte como parte do agendamento quando aplicável;
- refletir custo do transporte no financeiro;
- preparar estrutura para futura roteirização;
- não criar solução “mágica” de rotas no MVP.

---

## 9. Banco de dados e modelagem

## Regras obrigatórias
- toda alteração estrutural deve passar por **Prisma schema + migration**;
- não alterar banco manualmente sem justificativa explícita;
- migrations devem ser pequenas, claras e reversíveis quando possível;
- garantir chaves estrangeiras, índices e integridade referencial adequados.

## Entidades críticas já previstas no PRD
O agente deve respeitar a modelagem do PRD, incluindo entidades como:
- `Usuarios`
- `Clientes`
- `Pets`
- `Servicos`
- `Funcionarios`
- `Agendamentos`
- `AgendamentoServicos`
- `StatusAtendimento`
- `HistoricoStatusAgendamento`
- `Documentos`
- `Assinaturas`
- `Midia`
- `TransacoesFinanceiras`
- `Depositos`
- `Reembolsos`
- `Planos`
- `AssinaturasPlanos`
- `CreditosCliente`
- `UsoCredito`
- `ListaEspera`
- `ReportCards`
- `TemplatesMensagem`
- `LogsMensagens`
- `PerfisAcesso`
- `Permissoes`
- `PerfilPermissao`
- `UsuarioPerfil`
- `LogsAuditoria`
- `Unidades`
- `ConfiguracoesUnidade`
- tabelas financeiras auxiliares para gateway e webhooks

## Regras adicionais
- preferir tabelas relacionais em vez de campos textuais agregados quando houver relação N:N;
- usar JSON apenas quando houver justificativa clara e controlada;
- não duplicar informação crítica sem necessidade;
- toda mudança em dados críticos deve considerar auditoria.

---

## 10. APIs e Route Handlers

## Regras obrigatórias
- usar Route Handlers do App Router;
- validar entrada com Zod;
- retornar HTTP status corretos;
- não expor stack trace ao cliente;
- padronizar respostas de erro;
- garantir idempotência em operações sensíveis quando necessário.

## Para rotas críticas
Implementar atenção extra em:
- autenticação;
- autorização;
- agendamento;
- pagamentos;
- webhooks;
- documentos;
- uploads;
- histórico de status.

## O agente deve sempre considerar
- o que precisa ser transacional;
- o que precisa de lock lógico ou prevenção de corrida;
- o que pode falhar externamente e exige retentativa;
- o que precisa gerar auditoria.

---

## 11. Autenticação, autorização e segurança

## 11.1. Autenticação
- usar **next-auth v4**;
- não criar autenticação caseira;
- armazenar segredos via ambiente;
- nunca expor credenciais no cliente.

## 11.2. RBAC
- usar perfis e permissões conforme PRD;
- autorização deve existir no servidor, não apenas na UI;
- esconder botão não substitui validação real de permissão.

## 11.3. Logs de auditoria
Gerar auditoria em operações como:
- login sensível;
- criação/edição/exclusão de entidades críticas;
- alterações financeiras;
- alterações de status do atendimento;
- mudanças de configuração;
- eventos administrativos sensíveis.

## 11.4. Arquivos sensíveis
- não salvar documentos sensíveis em local inseguro;
- usar estratégia de storage segura;
- controlar acesso por permissão e vínculo da entidade;
- validar tipo e tamanho do arquivo.

## 11.5. Boas práticas obrigatórias
- HTTPS sempre;
- validação de webhook por assinatura/segredo;
- rate limiting em rotas sensíveis;
- senhas com hash forte;
- sanitização e validação de input;
- princípio do menor privilégio.

---

## 12. Pagamentos e webhooks

## Gateways previstos
- Mercado Pago
- Stripe

## Regras obrigatórias
- tratar integração financeira como parte crítica do sistema;
- processar webhooks com segurança e idempotência;
- registrar payloads e eventos relevantes para reconciliação;
- não assumir que resposta síncrona do gateway é a verdade final;
- registrar tentativas e falhas de comunicação com gateways;
- usar compensação e consistência local para garantir confiabilidade;
- proteger chaves de API e segredos de webhook.

---

## 13. Integração de IA no PetOS (features do produto)

O PetOS terá funcionalidades de IA integradas para os usuários. Ao desenvolver essas features, o agente de IA deve:

- **MVP**: focar em integrações simples e de alto valor, como geração de templates de mensagens personalizadas para WhatsApp/E-mail usando APIs como OpenAI.
- **Fase 3**: preparar a arquitetura para suportar integrações mais pesadas, como análise de imagem e análise preditiva, garantindo extensibilidade sem antecipar implementação desnecessária.

## Regras importantes
- IA não substitui regra de negócio;
- IA não substitui validação do servidor;
- IA não substitui autorização;
- IA deve ser tratada como apoio, não como fonte automática de verdade em decisões críticas.

---

## 14. Definition of Done (DoD)

Uma entrega relevante só deve ser considerada pronta quando, conforme aplicável:

- o código estiver completo;
- a tipagem estiver consistente;
- validações necessárias existirem;
- regras sensíveis estiverem protegidas no servidor;
- erros estiverem tratados de forma adequada;
- schema/migration estiverem atualizados quando houver impacto em dados;
- testes essenciais existirem para regras críticas;
- documentação impactada estiver atualizada;
- não houver dependência de placeholder para a entrega principal funcionar.

### Regra prática
Nem toda tarefa precisa alterar tudo.  
Mas toda tarefa deve sair **coerente, explicável e consistente** com o projeto.

---

## 15. Formato esperado das respostas dos agentes

Quando a tarefa envolver análise, proposta técnica ou implementação relevante, o agente deve preferir responder de forma estruturada, cobrindo quando aplicável:

1. objetivo da mudança;
2. fase do produto impactada;
3. módulos/entidades afetados;
4. riscos ou ambiguidades;
5. abordagem proposta;
6. arquivos a criar/editar;
7. validações/testes importantes;
8. impactos em documentação.

### Observação
Esse formato não precisa ser usado de forma mecânica em tarefas pequenas, mas deve servir como padrão para mudanças relevantes.

---

## 16. O que o agente nunca deve fazer

- alterar escopo do produto silenciosamente;
- inventar regra ausente no PRD sem marcar hipótese;
- implementar Fase 2/Fase 3 no contexto do MVP sem autorização;
- relaxar segurança ou autorização “para simplificar”;
- remover auditoria de área crítica por conveniência;
- criar dependência nova sem justificar;
- mudar arquitetura consolidada sem explicar impacto;
- esconder inconsistência com workaround visual;
- tratar protótipo frágil como solução final.

---

## 17. Backlog e priorização

A regra de ouro para o desenvolvimento é o **foco absoluto no MVP**.

- **Não antecipar funcionalidades**: se algo estiver listado na Fase 2 ou 3 do PRD, não implementar durante o MVP sem instrução explícita.
- **Manter simples**: buscar a solução mais simples e eficaz que atenda aos requisitos da fase atual.
- **Consultar o PRD**: em caso de dúvida sobre fase, consultar a seção correspondente do `PetOS_PRD.md`.

---

## 18. Glossário

- **PRD**: Product Requirements Document
- **MVP**: Minimum Viable Product
- **SaaS**: Software as a Service
- **PWA**: Progressive Web App
- **ORM**: Object-Relational Mapper
- **RBAC**: Role-Based Access Control
- **NFS-e**: Nota Fiscal de Serviço eletrônica
- **NFC-e**: Nota Fiscal de Consumidor eletrônica
- **PDV**: Ponto de Venda
- **UI**: User Interface
- **UX**: User Experience
- **IA**: Inteligência Artificial
- **API**: Application Programming Interface
- **Route Handlers**: forma de criar APIs no Next.js App Router
- **next-auth v4**: biblioteca de autenticação atualmente adotada para Next.js
- **Zod**: biblioteca de validação TypeScript-first
- **React Hook Form**: biblioteca para gerenciamento de formulários em React
- **Tailwind CSS**: framework CSS utilitário
- **Prisma**: ORM moderno para Node.js e TypeScript
- **ADR**: Architecture Decision Record

---

## 19. Referências

### Documentos internos do projeto
- `PetOS_PRD.md`
- `README.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CHANGELOG.md`
- `docs/architecture.md`
- `docs/domain-rules.md`
- `docs/payments.md`
- `docs/security-notes.md`
- `docs/data-model.md`
- `docs/decisions/README.md`

### Referências técnicas principais
- Next.js Documentation — https://nextjs.org/docs
- TypeScript Documentation — https://www.typescriptlang.org/docs/
- React Documentation — https://react.dev/
- Tailwind CSS Documentation — https://tailwindcss.com/docs
- MySQL Documentation — https://dev.mysql.com/doc/
- Prisma ORM Documentation — https://www.prisma.io/docs
- NextAuth.js v4 Documentation — https://next-auth.js.org/
- Zod Documentation — https://zod.dev/
- React Hook Form Documentation — https://react-hook-form.com/
- Mercado Pago Developers — https://www.mercadopago.com.br/developers/en/reference
- Stripe API Reference — https://docs.stripe.com/api
- Google Cloud Vision AI — https://cloud.google.com/vision
- Google Gemini API — https://ai.google.dev/
- OpenAI API — https://platform.openai.com/docs/api-reference
