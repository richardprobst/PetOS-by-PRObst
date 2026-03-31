# Contributing to PetOS

Este documento define como contribuir para o projeto **PetOS** de forma consistente, segura e alinhada com o produto.

## Documentos de referência

Antes de abrir uma branch, alterar código ou propor arquitetura, consulte nesta ordem:

1. `PetOS_PRD.md`
2. `AGENTS.md`
3. `README.md`
4. decisões técnicas já implementadas no repositório

Se houver conflito entre arquivos operacionais, o **PRD** prevalece.

## Princípios de contribuição

Toda contribuição deve:

- respeitar o escopo da fase atual do produto;
- manter consistência com a stack oficial do projeto;
- preservar segurança, rastreabilidade e clareza de código;
- evitar antecipação indevida de funcionalidades futuras;
- considerar impactos em banco, APIs, autenticação, pagamentos e auditoria;
- incluir documentação quando a regra de negócio ou a arquitetura forem alteradas.

## Stack oficial

Contribuições devem seguir a stack definida para o PetOS:

- **Next.js** com **App Router**
- **TypeScript** com tipagem estrita
- **React**
- **Tailwind CSS**
- **MySQL**
- **Prisma ORM**
- **Route Handlers** no Next.js
- **Auth.js / NextAuth.js**
- **Zod**
- **React Hook Form**

Não introduza frameworks, ORMs, bibliotecas de autenticação ou padrões concorrentes sem justificativa clara e aprovação do mantenedor.

## Escopo por fase

Antes de implementar qualquer item, confirme se ele pertence à fase correta.

### MVP
Permitido trabalhar em:

- agenda e operação básicos;
- status do atendimento;
- check-in com checklist;
- cadastro de clientes e pets;
- gestão de serviços;
- comunicação manual via WhatsApp/e-mail com templates;
- financeiro básico;
- portal do tutor básico;
- controle de comissões;
- report card simples.

### Fase 2 e além
Itens de Fase 2, Fase 3 e Roadmap Futuro só devem ser implementados quando houver instrução explícita.

## Fluxo de trabalho com branches

Sugestão de convenção:

- `main`: branch estável
- `develop`: branch de integração, se adotada pelo projeto
- branches de trabalho:
  - `feature/<nome-curto>`
  - `fix/<nome-curto>`
  - `refactor/<nome-curto>`
  - `docs/<nome-curto>`
  - `chore/<nome-curto>`

Exemplos:

- `feature/agendamento-checkin`
- `fix/webhook-mercado-pago`
- `refactor/servico-comissao-domain`
- `docs/readme-inicial`

## Commits

Use mensagens claras e objetivas. Uma convenção recomendada:

- `feat:` nova funcionalidade
- `fix:` correção
- `refactor:` refatoração sem mudança funcional
- `docs:` documentação
- `test:` testes
- `chore:` manutenção geral
- `perf:` melhoria de performance
- `security:` correção ou endurecimento de segurança

Exemplos:

- `feat: add pet check-in checklist`
- `fix: prevent overlapping appointment for same professional`
- `docs: update onboarding instructions`

## Regras para mudanças de código

### Regras gerais

Toda contribuição deve buscar:

- código legível e modular;
- funções com responsabilidade clara;
- boa tipagem;
- baixo acoplamento;
- nomes consistentes;
- ausência de duplicação desnecessária.

### O que evitar

Não enviar contribuições com:

- trechos incompletos;
- código placeholder como `TODO` em partes críticas;
- regra de negócio crítica implementada apenas no frontend;
- acesso direto ao banco fora do Prisma;
- inputs sem validação quando puderem ser modelados com Zod;
- lógica financeira sensível em componentes visuais.

## Regras para banco de dados

Toda mudança estrutural deve:

- passar por `schema.prisma`;
- gerar migration correspondente;
- preservar integridade referencial;
- considerar índices, chaves estrangeiras e impacto em dados existentes;
- ser pequena e clara sempre que possível.

### Importante

- não altere o banco manualmente sem justificativa explícita;
- não edite migrations já aplicadas em ambientes compartilhados;
- não agrupe mudanças sem relação em uma única migration grande.

## Regras para APIs

Rotas e handlers devem:

- usar **Route Handlers** do Next.js;
- validar entradas com **Zod**;
- retornar status HTTP corretos;
- não expor stack trace ao cliente;
- tratar falhas externas com robustez;
- registrar eventos críticos quando necessário;
- considerar idempotência em fluxos sensíveis.

## Segurança

Contribuições devem respeitar obrigatoriamente:

- autenticação via **Auth.js / NextAuth.js**;
- autorização real no servidor;
- RBAC conforme PRD e `AGENTS.md`;
- logs de auditoria em operações críticas;
- proteção de segredos via variáveis de ambiente;
- validação de webhooks por assinatura/segredo;
- rate limiting em rotas sensíveis;
- tratamento seguro de arquivos e documentos.

Nunca exponha segredos, chaves de API, tokens ou credenciais em código, logs públicos, fixtures ou exemplos de documentação.

## Pagamentos

Toda contribuição relacionada a pagamentos deve considerar:

- Mercado Pago e Stripe como gateways previstos;
- webhooks como fonte importante de verdade para atualização de status;
- idempotência no processamento;
- reconciliação e logs;
- tratamento de falhas e retentativas;
- rastreabilidade para auditoria.

## Testes

Sempre que aplicável:

- regras de negócio críticas devem ter testes unitários;
- rotas críticas devem ter testes de integração;
- fluxos principais do MVP devem ser cobertos por testes funcionais/e2e quando a infraestrutura existir;
- integrações sensíveis, como pagamento e webhook, devem ter cenários de falha e repetição.

## Documentation updates

Atualize documentação quando houver mudança em:

- regra de negócio;
- comportamento funcional relevante;
- arquitetura;
- variáveis de ambiente;
- fluxo de setup;
- integrações externas;
- decisão estrutural importante.

Arquivos comumente afetados:

- `README.md`
- `PetOS_PRD.md`
- `AGENTS.md`
- `CHANGELOG.md`
- arquivos em `docs/`

## Pull requests

Cada PR deve, idealmente, responder:

- o que mudou;
- por que mudou;
- qual impacto no PRD;
- quais arquivos principais foram alterados;
- se houve migration;
- se houve impacto em segurança, pagamentos, autenticação ou auditoria;
- quais testes foram executados;
- quais riscos permanecem.

### Antes de abrir PR

Revise se:

- o escopo está correto para a fase atual;
- o código compila;
- os tipos estão corretos;
- não há segredo exposto;
- a documentação necessária foi atualizada;
- a mudança não conflita com o PRD.

## Quando sinalizar em vez de implementar

Se houver qualquer uma das situações abaixo, prefira sinalizar antes de seguir:

- ambiguidade no PRD;
- regra de negócio faltando;
- impacto arquitetural relevante;
- necessidade de biblioteca nova;
- alteração grande no banco;
- mudança que empurra escopo de fase futura para o MVP.

## Definition of Done

Uma contribuição é considerada pronta quando, conforme aplicável:

- atende ao PRD e ao `AGENTS.md`;
- está dentro do escopo correto da fase;
- possui implementação completa;
- possui validação e tratamento de erros adequados;
- inclui mudanças de schema/migration quando necessário;
- inclui testes mínimos coerentes com o risco da mudança;
- inclui atualização de documentação relevante;
- não introduz regressões óbvias, atalhos inseguros ou inconsistências de domínio.

## Dúvidas

Na ausência de uma regra clara:

- não invente comportamento silenciosamente;
- sinalize a ambiguidade;
- proponha opções com trade-offs;
- preserve a coerência com o PRD e com a arquitetura já definida.
