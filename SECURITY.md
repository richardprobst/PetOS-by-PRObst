# SECURITY.md

## Política de Segurança do PetOS

Este documento define como vulnerabilidades de segurança devem ser reportadas, tratadas e acompanhadas no projeto **PetOS**.

O PetOS lida com dados operacionais, dados pessoais, documentos, autenticação, permissões, auditoria e integrações financeiras. Por isso, segurança é um requisito central do projeto, não um item opcional.

---

## Escopo

Esta política se aplica a todo o repositório e, quando existente, também a:

- frontend web do sistema;
- backend e APIs;
- autenticação e autorização;
- banco de dados e migrations;
- armazenamento de arquivos e documentos;
- integrações com gateways de pagamento;
- webhooks;
- rotinas administrativas;
- logs e trilhas de auditoria;
- ambientes locais, staging e produção.

---

## Como reportar uma vulnerabilidade

Se você identificar uma vulnerabilidade, **não abra issue pública** com detalhes exploráveis.

Reporte de forma privada ao mantenedor do projeto pelos canais definidos internamente.

O reporte deve conter, sempre que possível:

- título resumido do problema;
- descrição clara da vulnerabilidade;
- impacto potencial;
- passos para reprodução;
- área afetada;
- evidências técnicas relevantes;
- sugestão de mitigação, se houver.

### Informações úteis no reporte

Inclua, quando aplicável:

- rota, endpoint ou funcionalidade afetada;
- tipo de usuário necessário para exploração;
- payload de exemplo;
- comportamento esperado vs. comportamento observado;
- risco para confidencialidade, integridade ou disponibilidade;
- se o problema afeta dados pessoais, pagamentos, permissões ou documentos.

---

## O que não fazer

Ao reportar ou validar vulnerabilidades:

- não acesse dados de terceiros sem necessidade real de validação;
- não modifique ou apague dados de produção;
- não interrompa serviços intencionalmente;
- não exponha segredos, tokens, credenciais ou dados pessoais em issue, commit ou pull request;
- não publique exploit antes da correção.

---

## Processo interno recomendado de tratamento

Quando uma vulnerabilidade for confirmada, o fluxo recomendado é:

1. classificação de severidade;
2. contenção, quando necessário;
3. correção técnica;
4. revisão de impacto em dados, auditoria e integrações;
5. testes de regressão;
6. publicação controlada da correção;
7. atualização de documentação e registro interno.

### Severidade sugerida

#### Crítica
Exemplos:
- bypass de autenticação;
- bypass de autorização;
- exposição de dados sensíveis em massa;
- execução remota não autorizada;
- fraude em pagamento;
- webhook aceitando requisições não autenticadas com impacto financeiro.

#### Alta
Exemplos:
- leitura indevida de dados de outro cliente;
- alteração indevida de status, financeiro ou permissões;
- upload inseguro com risco real de exploração;
- falha de auditoria em operação sensível.

#### Média
Exemplos:
- vazamento limitado de metadados;
- mensagens de erro excessivamente detalhadas;
- rate limiting ausente em rota importante sem exploração confirmada.

#### Baixa
Exemplos:
- headers de segurança ausentes sem vetor claro de exploração;
- detalhamento excessivo em logs não expostos ao usuário final.

---

## Requisitos mínimos de segurança do projeto

### 1. Autenticação

- utilizar **Auth.js / NextAuth.js** ou evolução compatível aprovada no projeto;
- não criar autenticação caseira;
- segredos devem ficar apenas em variáveis de ambiente;
- nunca expor tokens ou credenciais no cliente;
- proteger sessões, callbacks e fluxos de login.

### 2. Autorização

- toda autorização crítica deve ser validada no servidor;
- UI visível ou escondida não substitui validação real;
- aplicar RBAC conforme PRD e `AGENTS.md`;
- revisar permissões em operações administrativas, financeiras e documentais.

### 3. Dados pessoais e LGPD

- minimizar coleta de dados ao necessário;
- proteger dados pessoais em trânsito e, quando aplicável, em repouso;
- evitar exposição de dados em logs, erros, exports e respostas de API;
- respeitar políticas de retenção e descarte definidas pelo projeto.

### 4. Banco de dados

- alterações estruturais apenas via Prisma schema e migrations;
- manter integridade referencial, índices e restrições;
- evitar queries inseguras ou concatenação manual quando houver alternativa segura;
- revisar impacto de migrations em dados já existentes.

### 5. APIs e Route Handlers

- validar input com Zod;
- retornar erros padronizados sem stack trace para o cliente;
- proteger endpoints sensíveis com autenticação, autorização e rate limiting;
- tratar operações críticas com idempotência quando necessário.

### 6. Pagamentos e webhooks

- validar assinatura/segredo dos webhooks;
- registrar eventos relevantes para reconciliação;
- tratar webhooks como fonte importante de verdade operacional e financeira;
- garantir idempotência no processamento;
- não assumir que resposta síncrona do gateway resolve todo o fluxo;
- proteger segredos de Mercado Pago e Stripe.

### 7. Uploads e documentos

- validar tipo, extensão e tamanho de arquivo;
- impedir acesso indevido a documentos e mídia;
- armazenar arquivos sensíveis com estratégia segura;
- evitar exposição pública não controlada de URLs.

### 8. Logs e auditoria

- gerar logs de auditoria para operações críticas;
- não registrar segredos, senhas, tokens ou dados excessivos;
- garantir rastreabilidade mínima em alterações financeiras, status, permissões e configurações.

### 9. Infraestrutura e ambiente

- usar HTTPS sempre;
- manter dependências atualizadas;
- revisar permissões de storage e banco;
- segregar ambientes local, staging e produção;
- nunca versionar `.env` real ou credenciais.

---

## Áreas sensíveis do PetOS

As seguintes áreas exigem revisão extra em qualquer alteração:

- login, sessão e recuperação de acesso;
- RBAC e permissões;
- agendamento com impacto financeiro;
- controle de comissões;
- no-show, cancelamento e reagendamento;
- integrações com Mercado Pago e Stripe;
- webhooks;
- documentos, arquivos e uploads;
- logs de auditoria;
- configurações por unidade;
- dados do cliente e do pet;
- exportações e relatórios.

---

## Boas práticas para commits e pull requests

Não incluir em commit, PR, issue ou comentário:

- senhas;
- tokens;
- chaves privadas;
- segredos de webhook;
- dados reais de clientes;
- dados reais de pets;
- documentos sensíveis;
- payloads completos contendo informação pessoal desnecessária.

Quando for necessário demonstrar um problema:

- anonimizar os dados;
- mascarar identificadores sensíveis;
- reduzir o payload ao mínimo necessário.

---

## Dependências e atualização

Toda dependência nova deve ser avaliada também sob a ótica de:

- necessidade real;
- manutenção ativa;
- compatibilidade com a stack do projeto;
- superfície de ataque adicionada;
- impacto em bundle, backend e credenciais.

Atualizações de dependência que afetem autenticação, validação, pagamentos, uploads ou banco devem receber atenção redobrada.

---

## Relação com outros arquivos do projeto

Este documento deve ser lido em conjunto com:

- `README.md`
- `PetOS_PRD.md`
- `AGENTS.md`
- `.env.example`
- `CONTRIBUTING.md`

Em caso de conflito sobre comportamento do produto, o **PRD** continua sendo a referência principal. Em caso de conflito sobre conduta de desenvolvimento assistido por IA, o `AGENTS.md` orienta a execução.

---

## Divulgação da correção

Após a correção de uma falha relevante, recomenda-se registrar internamente:

- resumo do problema;
- impacto;
- versão ou commit da correção;
- testes executados;
- necessidade de ações adicionais.

Se houver comunicação externa, ela deve evitar exposição desnecessária de detalhes exploráveis antes da atualização do ambiente afetado.

---

## Status desta política

Esta política pode evoluir com o projeto.

Mudanças relevantes em autenticação, pagamentos, auditoria, storage, infraestrutura ou LGPD devem levar à revisão deste arquivo.
