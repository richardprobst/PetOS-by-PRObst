# Modelo de Dados do PetOS

## 1. Objetivo deste documento

Este documento consolida a visão conceitual e estrutural do modelo de dados do **PetOS**.

Ele existe para:
- facilitar leitura e revisão da modelagem;
- conectar o domínio do produto às entidades persistidas;
- orientar implementação no Prisma;
- reduzir ambiguidade entre produto, backend e banco;
- servir como referência rápida para humanos e agentes de IA.

Este documento complementa, mas **não substitui**:
- `PetOS_PRD.md`
- `docs/architecture.md`
- `docs/domain-rules.md`
- `AGENTS.md`
- o `schema.prisma`, que será a representação técnica oficial da modelagem implementada

Se houver conflito:
1. o **PRD** vence em termos de produto;
2. o **schema.prisma** vence em termos de implementação já consolidada;
3. este documento deve então ser atualizado.

---

## 2. Princípios gerais da modelagem

## 2.1. Modelo relacional como base
O PetOS usa **MySQL** com modelagem relacional como base transacional.

## 2.2. Integridade referencial
Entidades críticas devem manter relações claras com:
- chaves estrangeiras;
- constraints adequadas;
- índices relevantes;
- histórico e rastreabilidade quando necessário.

## 2.3. Separação de conceitos
A modelagem deve evitar misturar conceitos distintos por conveniência.  
Exemplo:
- status operacional ≠ status financeiro;
- arquivo binário ≠ metadado do arquivo;
- estimativa ≠ valor efetivamente praticado.

## 2.4. Evolução por fases
A modelagem pode nascer preparada para crescimento, mas a implementação deve respeitar a fase atual do produto.

## 2.5. Auditoria e rastreabilidade
Mudanças críticas devem considerar histórico e/ou logs de auditoria.

---

## 3. Grandes blocos do modelo

O modelo do PetOS pode ser entendido em blocos principais:

- identidade e acesso;
- cliente e pet;
- agenda e operação;
- serviços e execução;
- financeiro e pagamentos;
- documentos, mídia e report cards;
- comunicação;
- equipe e permissões;
- configuração e multiunidade;
- integrações externas e auditoria.

---

## 4. Identidade e acesso

## 4.1. `Usuarios`
Representa a identidade principal de autenticação do sistema.

### Responsabilidades
- login;
- dados básicos do usuário;
- status de ativação;
- vínculo com unidade quando aplicável;
- base para papéis e permissões.

### Observações
Nem todo usuário é igual:
- cliente/tutor;
- funcionário;
- administrador;
- outros perfis internos.

## 4.2. `PerfisAcesso`
Define perfis de acesso de alto nível.

Exemplos:
- administrador;
- recepção;
- tosador;
- cliente;
- motorista.

## 4.3. `Permissoes`
Define permissões granulares.

Exemplos:
- `agendamento.criar`
- `agendamento.editar`
- `financeiro.reembolsar`
- `cliente.visualizar`
- `documento.baixar`

## 4.4. `PerfilPermissao`
Tabela de junção entre perfis e permissões.

## 4.5. `UsuarioPerfil`
Tabela de junção entre usuários e perfis.

### Observação importante
A autorização no PetOS deve considerar:
- identidade;
- perfil;
- permissão;
- vínculo com unidade;
- vínculo com entidade.

---

## 5. Cliente e pet

## 5.1. `Clientes`
Representa o cliente/tutor no domínio comercial e operacional.

### Dados comuns
- endereço;
- cidade;
- estado;
- CEP;
- preferências de contato;
- observações gerais.

### Relações
- 1:1 ou derivada de `Usuarios` no modelo adotado;
- 1:N com `Pets`;
- 1:N com agendamentos;
- 1:N com créditos, depósitos e histórico financeiro.

## 5.2. `Pets`
Entidade central do atendimento.

### Dados comuns
- nome;
- espécie;
- raça;
- data de nascimento;
- peso;
- observações de saúde;
- alergias;
- foto principal.

### Relações
- N:1 com `Clientes`;
- 1:N com `Agendamentos`;
- 1:N com `Midia`;
- 1:N com `Documentos` quando aplicável;
- 1:N com histórico operacional futuro.

### Observação
O histórico do pet deve sobreviver ao tempo e manter contexto de atendimentos anteriores.

---

## 6. Serviços e equipe

## 6.1. `Servicos`
Define os serviços oferecidos pelo estabelecimento.

### Dados comuns
- nome;
- descrição;
- preço base;
- duração estimada;
- ativo/inativo;
- vínculo com unidade quando aplicável.

## 6.2. `Funcionarios`
Define o papel operacional dos usuários internos ligados à execução.

### Dados comuns
- cargo;
- especialidade;
- percentual de comissão;
- vínculo com unidade.

### Relações
- N:1 com `Usuarios`;
- 1:N com `AgendamentoServicos`;
- 1:N com eventos operacionais e de auditoria quando aplicável.

---

## 7. Agenda e operação

## 7.1. `Agendamentos`
Representa o compromisso principal do atendimento.

### Dados comuns
- cliente;
- pet;
- data/hora de início;
- data/hora de fim;
- status atual;
- observações do cliente;
- observações internas;
- valor total estimado;
- unidade.

### Relações
- N:1 com `Clientes`
- N:1 com `Pets`
- 1:N com `AgendamentoServicos`
- 1:N com `HistoricoStatusAgendamento`
- 1:N com `TransacoesFinanceiras`
- 1:N com `Midia`
- 1:N com `Documentos`
- 1:1 ou 1:N com `ReportCards` dependendo da abordagem final

## 7.2. `AgendamentoServicos`
Tabela que vincula serviços específicos a um agendamento.

### Função
Permitir:
- múltiplos serviços por agendamento;
- vínculo do serviço ao profissional executante;
- preço acordado por item;
- comissão por item.

## 7.3. `StatusAtendimento`
Lookup de estados operacionais.

### Exemplo
- Agendado
- Confirmado
- Check-in
- Em Atendimento
- Pronto para Retirada
- Concluído
- Cancelado
- No-Show

> Observação: `Faturado` deve existir no fluxo global do PRD, preferencialmente como status financeiro separado (ADR 006).

## 7.4. `HistoricoStatusAgendamento`
Registra transições de status.

### Função
Garantir:
- rastreabilidade;
- histórico temporal;
- identificação de quem alterou;
- apoio para auditoria e suporte.

---

## 8. Financeiro e pagamentos

## 8.1. Separação conceitual
O modelo deve distinguir:
- andamento operacional;
- situação financeira.

## 8.2. `TransacoesFinanceiras`
Entidade central de movimentação financeira do sistema.

### Pode representar
- receita;
- despesa;
- depósito;
- reembolso;
- ajuste.

### Relações
- opcionalmente com `Agendamentos`;
- opcionalmente com `Transacoes_Pagamento`;
- com métodos e status de pagamento;
- com créditos e reembolsos quando aplicável.

## 8.3. `StatusPagamento`
Lookup de estado financeiro.

### Exemplos
- Pendente
- Aprovado
- Pago
- Parcial
- Recusado
- Reembolsado
- Estornado

## 8.4. `MetodosPagamento`
Lookup de meios de pagamento.

### Exemplos
- dinheiro;
- PIX;
- cartão;
- boleto;
- outro.

## 8.5. `Gateways_Pagamento`
Registra gateways configurados por unidade.

### Exemplos
- Mercado Pago
- Stripe

## 8.6. `Transacoes_Pagamento`
Registra a transação externa ou tentativa de transação junto ao gateway.

### Função
Conectar domínio interno com:
- identificador externo;
- status do gateway;
- método;
- valor;
- data.

## 8.7. `Webhook_Logs`
Registra recebimento e processamento de webhooks.

### Função
Suportar:
- idempotência;
- rastreabilidade;
- reconciliação;
- auditoria.

## 8.8. `Depositos`
Registra depósitos/pre-pagamentos vinculados a cliente e/ou agendamento.

## 8.9. `Reembolsos`
Registra operações de devolução de valor com vínculo à transação correspondente.

## 8.10. `CreditosCliente`
Representa saldo disponível do cliente.

## 8.11. `UsoCredito`
Registra o consumo de créditos em operações financeiras.

---

## 9. Documentos, mídia e report cards

## 9.1. Princípio importante
O banco deve guardar **referências e metadados**, não o binário principal do arquivo.

## 9.2. `Documentos`
Registra documentos vinculados ao domínio.

### Exemplos
- anamnese;
- vacina;
- autorização;
- termo;
- outro documento operacional.

### Relações
- opcionalmente com `Agendamentos`;
- opcionalmente com `Pets`;
- opcionalmente com `Clientes`;
- com `Assinaturas`.

## 9.3. `Assinaturas`
Registra dados de assinatura vinculados ao documento.

### Exemplos
- nome do assinante;
- usuário vinculado;
- método da assinatura;
- data/hora.

## 9.4. `Midia`
Registra referências a mídias.

### Exemplos
- foto do pet;
- foto antes/depois;
- vídeo;
- mídia operacional.

### Relações
- com `Pets`;
- com `Agendamentos`;
- potencialmente com `ReportCards`.

## 9.5. `ReportCards`
Registra o resumo operacional do atendimento.

### Pode conter
- observações gerais;
- comportamento do pet;
- produtos usados;
- recomendação de retorno;
- vínculo com mídias antes/depois.

### Observação
É recomendável que o vínculo com fotos seja modelado de forma flexível via `Midia`, e não apenas por campos fixos de URL.

---

## 10. Comunicação

## 10.1. `TemplatesMensagem`
Define templates reutilizáveis.

### Exemplos
- confirmação de agendamento;
- lembrete;
- retorno pós-serviço;
- comunicação administrativa.

## 10.2. `LogsMensagens`
Registra mensagens enviadas ou disparadas.

### Função
Suportar:
- rastreabilidade;
- histórico;
- suporte;
- auditoria quando aplicável.

### Relações
- opcionalmente com cliente;
- opcionalmente com agendamento;
- com template utilizado;
- com usuário que acionou o envio.

---

## 11. Configuração e multiunidade

## 11.1. `Unidades`
Representa unidade operacional do negócio.

### Função
Preparar o sistema para multiunidade futura sem necessariamente ativar tudo no MVP.

## 11.2. `ConfiguracoesUnidade`
Armazena parâmetros configuráveis por unidade.

### Exemplos
- janela de cancelamento;
- tolerância de no-show;
- regras operacionais;
- credenciais específicas;
- parâmetros de comportamento.

### Observação
Evitar hardcode de regras que o domínio já prevê como configuráveis por unidade.

---

## 12. Auditoria

## 12.1. `LogsAuditoria`
Registra ações críticas realizadas no sistema.

### Exemplos
- alteração de status;
- mudanças financeiras;
- edição de dados sensíveis;
- alterações administrativas;
- mudanças de configuração;
- ações em documentos ou permissões.

### Função
Dar suporte a:
- rastreabilidade;
- investigação;
- conformidade;
- suporte.

---

## 13. Relações importantes do domínio

## 13.1. Cliente → Pets
Um cliente pode ter múltiplos pets.

## 13.2. Pet → Agendamentos
Um pet pode ter múltiplos agendamentos ao longo do tempo.

## 13.3. Agendamento → AgendamentoServicos
Um agendamento pode conter múltiplos serviços.

## 13.4. AgendamentoServico → Funcionario
Cada item de serviço pode ser vinculado ao profissional responsável.

## 13.5. Agendamento → Histórico de status
Um agendamento tem um status atual e um histórico de transições.

## 13.6. Agendamento → Financeiro
Um agendamento pode gerar uma ou mais movimentações financeiras.

## 13.7. Cliente → Créditos / Depósitos
Um cliente pode ter saldo, depósitos e histórico financeiro próprio.

## 13.8. Agendamento / Pet / Cliente → Documentos / Mídia
Documentos e mídias podem se vincular a diferentes entidades do domínio conforme o caso.

---

## 14. Pontos sensíveis da modelagem

Alguns pontos merecem atenção especial:

## 14.1. Status operacional vs status financeiro
Não colapsar tudo em um único campo sem análise cuidadosa.

## 14.2. Report card e mídia
Evitar modelagem rígida demais para fotos e arquivos.

## 14.3. Comissão
A comissão deve ter relação clara com:
- serviço executado;
- profissional;
- valor efetivamente faturado.

## 14.4. Pagamentos e webhooks
Identificadores externos e trilhas de processamento precisam existir.

## 14.5. Configuração por unidade
Parâmetros configuráveis devem nascer em lugar apropriado do modelo.

---

## 15. Relação com o Prisma

Este documento é **conceitual/estrutural**.

A implementação técnica oficial no projeto será refletida em:
- `prisma/schema.prisma`
- migrations
- índices e constraints efetivas

### Regra importante
Quando o modelo implementado evoluir:
- este documento deve ser atualizado;
- divergências relevantes devem ser explicadas;
- ADRs podem ser usados quando a mudança for estrutural.

---

## 16. O que este documento não substitui

Este documento não substitui:
- o PRD;
- regras de negócio;
- ADRs;
- contratos Zod;
- decisões de autorização;
- detalhes de performance e índice em nível de implementação.

Ele serve como **ponte entre domínio e banco**.

---

## 17. Resumo

O modelo de dados do PetOS foi desenhado para sustentar:

- operação;
- agenda;
- cliente/pet;
- financeiro;
- pagamentos;
- documentos;
- comunicação;
- permissões;
- auditoria;
- evolução futura.

A prioridade é manter:
- clareza conceitual;
- integridade relacional;
- rastreabilidade;
- separação correta entre conceitos críticos.
