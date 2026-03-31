# Arquitetura do PetOS

## 1. Objetivo deste documento

Este documento descreve a arquitetura inicial do **PetOS** em nível alto e médio, com foco em:

- alinhar o time técnico ao **PRD**;
- guiar decisões de implementação sem engessar a evolução do sistema;
- documentar a separação entre camadas, domínios e responsabilidades;
- reduzir inconsistências entre frontend, backend, dados, segurança e integrações.

Este documento complementa, mas **não substitui**:

- `PetOS_PRD.md`
- `AGENTS.md`
- `README.md`
- `CONTRIBUTING.md`
- `SECURITY.md`

Se houver conflito entre este documento e o **PRD**, o **PRD vence**.

---

## 2. Visão arquitetural

O **PetOS** será construído como uma aplicação **fullstack web** baseada em:

- **Next.js** com **App Router**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **Node.js**
- **MySQL**
- **Prisma ORM**
- **Route Handlers**
- **Auth.js / NextAuth.js**
- **Zod**

A arquitetura foi pensada para suportar:

- operação de banho e tosa;
- fluxo administrativo e operacional;
- portal do tutor;
- integrações financeiras;
- auditoria e segurança;
- futura expansão para IA, multiunidade e integrações adicionais.

---

## 3. Princípios arquiteturais

## 3.1. Fonte única de verdade
- O **PRD** define produto, escopo, fases e regras de negócio.
- O **AGENTS.md** define como agentes de IA devem atuar.
- A arquitetura deve respeitar ambos.

## 3.2. Separação de responsabilidades
- **UI** apresenta informação e coleta interação.
- **Camada de aplicação** orquestra fluxos.
- **Camada de domínio** concentra regras de negócio.
- **Camada de persistência** interage com banco via Prisma.
- **Integrações externas** devem ser isoladas em adaptadores/serviços.

## 3.3. Regras críticas no servidor
Nenhuma regra crítica deve depender somente do frontend.  
Validação, autorização, cálculo financeiro, transições de status e lógica de pagamentos devem ser garantidos no servidor.

## 3.4. Evolução por fases
A arquitetura deve permitir expansão por fases sem reescrita desnecessária:
- MVP
- Fase 2
- Fase 3
- Roadmap Futuro

## 3.5. Simplicidade com extensibilidade
No MVP, a implementação deve ser simples e clara.  
Ao mesmo tempo, o desenho estrutural não deve bloquear recursos futuros como:
- pagamentos mais robustos;
- IA;
- multiunidade;
- documentos;
- integrações adicionais.

---

## 4. Visão por camadas

## 4.1. Camada de apresentação
Responsável por:
- páginas;
- layouts;
- componentes visuais;
- formulários;
- tabelas;
- dashboards;
- feedback ao usuário.

Tecnologias:
- Next.js App Router
- React
- Tailwind CSS
- React Hook Form

### Regras
- componentes de UI não devem concentrar regra crítica;
- validação local é complementar, não substitui validação no servidor;
- preferir Server Components quando fizer sentido;
- usar Client Components apenas quando necessário.

## 4.2. Camada de aplicação
Responsável por:
- orquestrar casos de uso;
- receber chamadas do frontend ou de Route Handlers;
- coordenar validação, autorização, domínio e persistência;
- padronizar fluxos e respostas.

Exemplos:
- criar agendamento;
- alterar status de atendimento;
- registrar pagamento;
- gerar report card;
- enviar template de comunicação.

## 4.3. Camada de domínio
Responsável por:
- regras de negócio;
- estados e transições;
- cálculos;
- decisões operacionais;
- políticas do sistema.

Exemplos:
- fluxo de status do atendimento;
- conflito de agenda;
- comissão;
- no-show;
- cancelamento e reagendamento;
- política de créditos;
- regras de Táxi Dog;
- impacto financeiro da operação.

## 4.4. Camada de persistência
Responsável por:
- leitura e escrita no banco;
- uso do Prisma Client;
- consultas otimizadas;
- transações;
- migrations e evolução de schema.

### Regra obrigatória
Acesso ao banco deve ocorrer via **Prisma**, não por SQL espalhado sem controle.

## 4.5. Camada de integração
Responsável por:
- gateways de pagamento;
- webhooks;
- e-mail;
- WhatsApp operacional;
- storage de arquivos;
- futuros serviços de IA.

Essa camada deve ser desenhada de forma substituível, com contratos claros e sem acoplamento direto à UI.

---

## 5. Organização sugerida do repositório

Estrutura inicial sugerida:

```text
app/
  (public)/
  (auth)/
  admin/
  tutor/
  api/
components/
features/
lib/
server/
prisma/
types/
tests/
docs/
```

## Sugestão por responsabilidade

### `app/`
Rotas, páginas, layouts e Route Handlers.

### `components/`
Componentes visuais reutilizáveis e independentes de domínio ou com baixo acoplamento.

### `features/`
Agrupamento por domínio/capacidade. Exemplo:
- `features/agenda`
- `features/clientes`
- `features/pets`
- `features/financeiro`

### `server/`
Serviços do lado do servidor, casos de uso, autorização, integração, orquestração e regras que não devem ficar na UI.

### `lib/`
Helpers, utilitários, clients, formatações, constantes, validações compartilhadas.

### `prisma/`
`schema.prisma`, migrations, seed e utilitários relacionados ao banco.

### `types/`
Tipos compartilhados que não pertencem naturalmente a um único módulo.

### `tests/`
Testes unitários, integração e, futuramente, e2e.

### `docs/`
Documentação de arquitetura, decisões, regras de domínio e guias de projeto.

---

## 6. Domínios centrais do sistema

O sistema será organizado principalmente em torno destes domínios:

- Agenda e Operação
- Cliente/Pet
- Serviços
- Comunicação
- Financeiro/Fiscal
- Portal do Tutor
- Gestão da Equipe
- Logística/Táxi Dog
- IA e Insights
- Multiunidade

## Estratégia recomendada
No código, preferir organização por **domínio/capacidade** sempre que isso melhorar clareza e manutenção.

Exemplo:
- schemas Zod do domínio próximos do domínio;
- casos de uso do domínio próximos do domínio;
- componentes específicos do domínio próximos do domínio;
- abstrações compartilhadas em `lib/` ou `server/`.

---

## 7. Fluxo de dados de alto nível

## 7.1. Fluxo típico de uma ação
1. Usuário interage com a interface
2. Dados são validados localmente quando necessário
3. Requisição chega ao servidor via Route Handler ou action apropriada
4. Entrada é validada com Zod
5. Autenticação e autorização são verificadas
6. Caso de uso é executado
7. Regras de domínio são aplicadas
8. Banco é consultado/atualizado via Prisma
9. Eventos auxiliares podem ser gerados:
   - auditoria
   - notificação
   - integração externa
10. Resposta padronizada retorna ao cliente

## 7.2. Fluxo de operações críticas
Operações como:
- alteração de status;
- pagamentos;
- reembolsos;
- créditos;
- documentos;
- permissões;
- webhooks

devem considerar:
- idempotência quando necessário;
- transação;
- logs;
- auditoria;
- tratamento explícito de falhas.

---

## 8. Status operacional e status financeiro

O PRD usa o fluxo:

`Agendado -> Confirmado -> Check-in -> Em Atendimento -> Pronto para Retirada -> Concluído -> Faturado`

Arquiteturalmente, recomenda-se tratar:

- **status operacional**
- **status financeiro**

como conceitos distintos quando isso trouxer mais clareza e robustez.

## Exemplo de separação interna
### Status operacional
- Agendado
- Confirmado
- Check-in
- Em Atendimento
- Pronto para Retirada
- Concluído
- Cancelado
- No-Show

### Status financeiro
- Pendente
- Parcial
- Pago
- Reembolsado
- Estornado
- Faturado

Se essa separação for adotada, ela deve ser:
- documentada;
- refletida no domínio e nos dados;
- mapeada de volta ao PRD de forma clara.

---

## 9. Banco de dados e modelagem

O banco relacional em MySQL será a base transacional do sistema.

## Diretrizes
- modelagem orientada ao domínio;
- integridade referencial forte;
- uso explícito de FKs;
- índices adequados;
- migrations pequenas e claras;
- evitar duplicação de dados críticos.

## Entidades centrais já previstas
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
- tabelas auxiliares de gateway, transações e webhook

## Observações arquiteturais
- relações N:N devem ser modeladas de forma relacional;
- JSON deve ser usado com justificativa;
- mudanças críticas devem considerar compatibilidade com dados existentes;
- auditoria deve acompanhar entidades sensíveis.

---

## 10. Autenticação, autorização e segurança

## 10.1. Autenticação
- usar Auth.js / NextAuth.js;
- segredos somente em ambiente;
- sessões e callbacks configurados com cuidado;
- nunca expor credenciais no cliente.

## 10.2. Autorização
Autorização deve ser aplicada no servidor com base em:
- perfil;
- permissão;
- vínculo com unidade;
- vínculo com entidade quando aplicável.

## 10.3. Auditoria
Operações críticas devem gerar logs auditáveis, como:
- login sensível;
- alteração de status;
- mudanças financeiras;
- alterações administrativas;
- mudanças de configuração;
- operações com documentos.

## 10.4. Proteção de dados
- HTTPS obrigatório;
- senhas com hash forte;
- validação de input;
- controle rigoroso de uploads;
- storage seguro para arquivos;
- retenção e descarte compatíveis com LGPD.

## 10.5. Rate limiting e webhooks
Rotas sensíveis e integrações externas devem considerar:
- rate limiting;
- validação por assinatura/segredo;
- idempotência;
- logs de falha;
- reconciliação.

---

## 11. Integrações externas

## 11.1. Pagamentos
Gateways previstos:
- Mercado Pago
- Stripe

### Diretrizes
- tratar webhooks como verdade operacional relevante;
- não confiar apenas na resposta síncrona;
- implementar reconciliação;
- registrar payloads relevantes de forma segura;
- prever retentativas e compensação.

## 11.2. Comunicação
No MVP, a comunicação será focada em:
- WhatsApp operacional;
- e-mail;
- templates de mensagens.

A arquitetura deve permitir crescimento futuro para:
- automações pós-serviço;
- campanhas segmentadas;
- notificações mais sofisticadas.

## 11.3. Storage
Arquivos e mídias devem ser tratados fora do banco como binário principal, com o banco armazenando referências e metadados.

## 11.4. IA
No MVP, o foco é baixo risco e alto valor:
- geração de mensagens;
- apoio operacional;
- prompts internos controlados no backend.

Na Fase 3, a arquitetura deve estar preparada para:
- análise de imagem;
- análise preditiva;
- armazenamento de metadados de IA.

---

## 12. Estratégia para MVP

A arquitetura do MVP deve priorizar:
- clareza;
- segurança;
- velocidade responsável;
- baixo acoplamento;
- evolução futura.

## O que evitar no MVP
- overengineering;
- abstrações excessivas sem uso real;
- engine de workflow complexa sem necessidade;
- arquitetura distribuída prematura;
- automações sofisticadas antes do core estar estável.

## Meta do MVP
Entregar uma base sólida para:
- agendamento;
- operação;
- cliente/pet;
- serviços;
- comunicação básica;
- financeiro básico;
- portal do tutor básico;
- comissões;
- report card simples.

---

## 13. Estratégia de testes

## 13.1. Prioridade
Testar primeiro o que mais afeta:
- dinheiro;
- agenda;
- segurança;
- permissões;
- regras críticas de domínio.

## 13.2. Recomendação
- testes unitários para regras de negócio;
- testes de integração para rotas, banco e fluxos críticos;
- testes específicos para webhooks e idempotência;
- e2e futuramente para fluxos principais do sistema.

---

## 14. Observabilidade e operação

Mesmo no início, a arquitetura deve considerar:
- logs úteis;
- erros estruturados;
- diferenciação entre erro de domínio e erro técnico;
- rastreabilidade mínima de operações críticas.

Futuramente, isso pode evoluir para:
- monitoramento;
- tracing;
- alertas;
- dashboards operacionais.

---

## 15. Decisões arquiteturais já assumidas

- o núcleo do sistema **não será construído em WordPress**;
- a base será **Next.js + TypeScript + Prisma + MySQL**;
- APIs internas serão construídas com **Route Handlers**;
- autenticação será tratada com **Auth.js / NextAuth.js**;
- o sistema será pensado para evolução futura, mas com **foco absoluto no MVP** no início.

---

## 16. Próximos documentos recomendados

Para complementar esta arquitetura, recomenda-se manter e evoluir:

- `docs/domain-rules.md`
- `docs/decisions/`
- `docs/payments.md`
- `docs/security-notes.md`
- `docs/data-model.md`

---

## 17. Resumo final

A arquitetura do PetOS deve equilibrar:

- simplicidade no presente;
- robustez em áreas críticas;
- clareza de responsabilidades;
- capacidade de evolução futura.

O objetivo não é criar uma arquitetura “impressionante”, e sim uma arquitetura:
- compreensível;
- segura;
- sustentável;
- alinhada ao produto;
- boa para humanos e boa para agentes de IA.
