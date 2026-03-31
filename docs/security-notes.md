# Notas de Segurança do PetOS

## 1. Objetivo deste documento

Este documento consolida notas práticas e operacionais de segurança para o desenvolvimento do **PetOS**.

Ele complementa o `SECURITY.md`, mas tem foco mais interno e técnico, servindo para:

- orientar implementação segura;
- apoiar revisão de código;
- reforçar práticas de autenticação, autorização e proteção de dados;
- reduzir erros recorrentes em fluxos sensíveis;
- alinhar humanos e agentes de IA sobre o que merece atenção extra.

Este documento **não substitui**:
- `SECURITY.md`
- `PetOS_PRD.md`
- `AGENTS.md`
- `docs/architecture.md`
- `docs/domain-rules.md`

Se houver conflito com o **PRD** ou com decisão formal registrada, o documento superior prevalece.

---

## 2. Princípios gerais

## 2.1. Segurança desde a implementação
Segurança não deve ser tratada como etapa posterior de acabamento.

Toda feature nova deve considerar desde o início:
- autenticação;
- autorização;
- validação;
- auditoria;
- proteção de dados;
- impacto financeiro e operacional.

## 2.2. Menor privilégio
Todo acesso deve conceder apenas o necessário para a função daquele usuário.

## 2.3. Servidor como autoridade
Regra crítica, permissão real e validação sensível pertencem ao servidor.

## 2.4. Rastreabilidade
Se uma ação pode causar impacto relevante, ela deve poder ser rastreada.

---

## 3. Autenticação

## 3.1. Estratégia oficial
O projeto usa **next-auth v4** como base oficial de autenticação nesta etapa.

## 3.2. Cuidados obrigatórios
- não criar autenticação caseira paralela;
- não expor segredos no cliente;
- usar variáveis de ambiente para segredos;
- evitar sessão com dados excessivos;
- tratar login, expiração, recuperação e callbacks com cuidado.

## 3.3. Sessão
A sessão deve conter apenas o necessário para:
- identificar o usuário;
- reconhecer papel/perfil básico;
- suportar autorização inicial.

Dados sensíveis ou volumosos devem ser buscados no servidor quando necessário.

---

## 4. Autorização

## 4.1. Regra principal
Autorização real deve ocorrer no **servidor**.

### Nunca assumir
- “o botão não aparece” = sem acesso;
- “a tela não mostra” = operação protegida;
- “o frontend já validou” = seguro.

## 4.2. O que verificar
Quando aplicável, o servidor deve verificar:
- identidade do usuário;
- perfil/papel;
- permissões;
- vínculo com unidade;
- vínculo com a entidade acessada;
- contexto da operação.

## 4.3. Áreas sensíveis
Revisar com atenção extra operações como:
- alteração de status;
- gestão de usuários;
- ajustes financeiros;
- reembolsos;
- depósitos;
- documentos;
- uploads;
- configurações;
- permissões;
- auditoria;
- webhooks manuais ou reprocessamento.

---

## 5. Validação de entrada

## 5.1. Camada oficial
Usar **Zod** como camada oficial de contratos e validação.

## 5.2. Regra prática
Todo dado externo é potencialmente inválido até ser validado.

### Fontes externas incluem
- formulários;
- query params;
- body de API;
- cookies;
- headers relevantes;
- webhooks;
- uploads;
- respostas de integrações externas.

## 5.3. O que evitar
- confiar em `any`;
- validar parcialmente e assumir o restante;
- transformar validação em lógica visual apenas;
- aceitar payload “porque veio do próprio sistema”.

---

## 6. Banco de dados e persistência

## 6.1. Prisma como padrão
O acesso ao banco deve seguir o padrão oficial do projeto com Prisma.

## 6.2. Riscos comuns
- update sem filtro seguro;
- deleção indevida;
- escrita parcial sem transação;
- leitura ampla demais de dados sensíveis;
- falta de índice em consultas críticas;
- mistura indevida de regra de negócio com persistência.

## 6.3. Cuidados obrigatórios
- revisar filtros de update/delete;
- usar transação quando houver múltiplos efeitos relacionados;
- não confiar só em ID vindo do cliente;
- validar contexto de entidade antes de persistir;
- considerar auditoria em mudanças críticas.

---

## 7. Segredos e variáveis de ambiente

## 7.1. Regras obrigatórias
- segredos só em ambiente;
- nunca comitar `.env`;
- usar `.env.example` sem valores reais;
- separar valores por ambiente;
- rotacionar segredos quando necessário.
- manter segredos distintos para `dev`, `staging` e `production`;
- não reutilizar o mesmo segredo entre ambientes.

## 7.2. Exemplos de segredo
- `NEXTAUTH_SECRET`
- chaves de gateway
- segredos de webhook
- credenciais de storage
- provedores de e-mail
- tokens internos de integração

---

## 8. Pagamentos e financeiro

## 8.1. Tratar como área crítica
Tudo que toca:
- cobrança,
- depósito,
- reembolso,
- crédito,
- comissão,
- reconciliação

merece revisão de segurança e domínio.

## 8.2. Regras obrigatórias
- não confiar só na resposta síncrona do gateway;
- validar e registrar webhooks;
- manter idempotência;
- limitar quem pode executar ação financeira sensível;
- registrar trilha de auditoria.

## 8.3. Cuidados adicionais
- não logar dados sensíveis sem necessidade;
- não permitir alteração manual silenciosa de estado financeiro;
- não misturar status financeiro com status operacional por conveniência.

---

## 9. Webhooks

## 9.1. Tratar como entrada hostil até prova em contrário
Todo webhook deve ser validado.

## 9.2. Regras mínimas
- validar assinatura/segredo;
- registrar recebimento;
- garantir idempotência;
- evitar efeito duplicado;
- manter rastreabilidade.

## 9.3. O que revisar em PRs
- validação do evento;
- persistência do evento;
- chave de idempotência;
- tratamento de falha;
- logs;
- impacto no domínio.

---

## 10. Uploads, documentos e mídia

## 10.1. Arquivos são superfície de risco
Todo upload deve ser tratado como potencialmente perigoso.

## 10.2. Regras obrigatórias
- validar tipo;
- validar tamanho;
- controlar acesso;
- armazenar binário fora do banco;
- registrar metadados;
- restringir acesso por permissão e vínculo.

## 10.3. O que evitar
- confiar só na extensão do arquivo;
- salvar documentos sensíveis em caminho público sem proteção;
- expor URL previsível sem controle;
- permitir download sem checagem de autorização.

---

## 11. Logs e auditoria

## 11.1. O que logar
Logar o suficiente para:
- suporte;
- diagnóstico;
- auditoria;
- investigação de incidente.

## 11.2. O que evitar
- logar segredo;
- logar cartão ou dado financeiro sensível desnecessário;
- logar documento bruto sem critério;
- logar payload completo se isso gerar vazamento evitável.

## 11.3. Auditoria recomendada para
- login sensível;
- alteração financeira;
- mudança de status;
- edição de configuração;
- permissões;
- uploads relevantes;
- reprocessamento manual;
- ação administrativa crítica.

---

## 12. Erros e respostas da API

## 12.1. Regra principal
A API não deve expor stack trace nem detalhes internos desnecessários ao cliente.

## 12.2. O que fazer
- retornar erro claro e apropriado;
- registrar detalhes técnicos do lado do servidor;
- diferenciar erro de validação, autorização e erro interno.

## 12.3. O que evitar
- mensagens que revelem estrutura interna;
- leaks de SQL, stack, paths ou segredos;
- respostas inconsistentes entre rotas sensíveis.

---

## 13. Revisão de código com foco em segurança

## Checklist curto de revisão
Antes de aprovar algo sensível, revisar:

- validação de entrada existe?
- autorização real existe no servidor?
- há impacto financeiro?
- há necessidade de transação?
- há necessidade de auditoria?
- há risco de acesso indevido a dados?
- há risco de duplicidade em webhook ou pagamento?
- a UI está assumindo responsabilidade que deveria ser do servidor?
- logs estão adequados?
- segredos estão protegidos?

---

## 14. Incidentes e correção

## 14.1. Em caso de problema sensível
Prioridades:
1. conter impacto;
2. preservar rastreabilidade;
3. evitar destruição de evidências;
4. corrigir causa;
5. registrar aprendizado.

## 14.2. Depois da correção
Quando aplicável:
- atualizar documentação;
- revisar `AGENTS.md`;
- revisar regra de domínio;
- revisar testes;
- adicionar ADR se a decisão for estrutural.

---

## 15. O que agentes de IA devem fazer

Agentes devem:
- assumir que segurança é parte da feature;
- sinalizar risco quando perceberem lacuna;
- não “simplificar” removendo validação, permissão ou auditoria;
- priorizar abordagem segura e explicável;
- sugerir mitigação quando identificarem risco.

Agentes **não devem**:
- inventar permissão implícita;
- relaxar validação para “fazer funcionar”;
- ignorar risco financeiro;
- propor atalho inseguro em uploads, pagamentos ou webhooks;
- esconder falha sensível sem registro.

---

## 16. Resumo

No PetOS, segurança deve ser tratada como parte do produto e da arquitetura.

Isso significa:
- autenticação oficial baseada em next-auth v4;
- autorização no servidor;
- validação consistente;
- cuidado com dados;
- webhooks seguros;
- uploads controlados;
- pagamentos rastreáveis;
- logs e auditoria úteis;
- revisão técnica consciente.
