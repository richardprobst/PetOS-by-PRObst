# PetOS

Sistema SaaS para pet shops, banho e tosa e serviços correlatos, com foco no mercado brasileiro.

O **PetOS** foi concebido para centralizar a operação do negócio, melhorar a experiência do tutor e sustentar a evolução do produto para automações, integrações de pagamento, IA aplicada e expansão futura. O escopo inicial prioriza um **MVP enxuto**, com agenda, cadastro de clientes e pets, serviços, comunicação operacional, financeiro básico, portal do tutor, comissões e report card simples. fileciteturn9file0

## Objetivo do projeto

O projeto busca entregar uma base sólida para a operação diária de banho e tosa, com crescimento planejado em fases. No MVP, o foco está em resolver o núcleo operacional com segurança, consistência de regras de negócio e boa experiência de uso. As fases seguintes expandem o sistema para pagamentos, documentos, automações comerciais, estoque, PDV, multiunidade e IA avançada. fileciteturn9file0

## Escopo resumido

### MVP
- Agenda e operação básicas
- Fluxo de status do atendimento
- Check-in com checklist
- Cadastro de clientes e pets
- Gestão de serviços
- Comunicação manual via WhatsApp/e-mail com templates
- Financeiro básico
- Portal do tutor básico (PWA)
- Controle de comissões
- Report card simples fileciteturn9file0

### Fase 2
- Capacidade por profissional, porte e raça
- Depósito e pré-pagamento
- Bloqueios de agenda e waitlist
- Táxi Dog com roteirização
- Documentos e formulários
- CRM e automações pós-serviço
- NFS-e e NFC-e
- PDV e estoque completos
- Portal do tutor aprimorado
- Time clock, payroll e escalas fileciteturn9file0

### Fase 3
- IA de visão computacional
- Análise preditiva
- Multiunidade operacional completa fileciteturn9file0

## Stack definida

A base técnica oficial do projeto utiliza:
- **Next.js** com **App Router** e **Route Handlers**
- **TypeScript**
- **React**
- **Tailwind CSS**
- **MySQL**
- **Prisma ORM**
- **Auth.js / NextAuth.js**
- **Zod**
- **React Hook Form** fileciteturn9file0turn11file0

## Regras de produto importantes

O fluxo operacional padrão do atendimento é:

`Agendado -> Confirmado -> Check-in -> Em Atendimento -> Pronto para Retirada -> Concluído -> Faturado`

Além disso:
- regras de no-show, cancelamento e reagendamento devem ser configuráveis por unidade;
- comissão deve ser calculada sobre o valor faturado, após descontos, conforme o PRD;
- mudanças críticas precisam preservar auditoria, rastreabilidade e controle de acesso. fileciteturn9file0turn11file0

## Documentos principais do repositório

- **`PetOS_PRD.md`** — documento principal de requisitos do produto
- **`AGENTS.md`** — guia operacional para agentes de IA e automação de desenvolvimento

### Regra de prioridade
Em caso de conflito entre documentos:
1. `PetOS_PRD.md`
2. `AGENTS.md`
3. decisões técnicas já implementadas no repositório
4. instruções explícitas do mantenedor do projeto fileciteturn11file0

## Princípios do desenvolvimento

- foco absoluto no escopo da fase atual;
- segurança desde a concepção;
- validação de entrada obrigatória;
- regra de negócio implementada no servidor, não apenas na interface;
- migrations controladas com Prisma;
- logs e auditoria para ações críticas;
- integrações externas com tratamento de falha, idempotência e reconciliação quando necessário. fileciteturn9file0turn11file0

## Estrutura inicial esperada do repositório

```text
app/
app/api/
components/
features/
lib/
server/
prisma/
types/
tests/
```

Essa estrutura pode evoluir, desde que preserve consistência arquitetural e boa separação entre UI, domínio, integrações e dados. fileciteturn11file0

## Como iniciar o projeto localmente

> Esta seção assume que o repositório ainda está em fase inicial de estruturação. Ajuste os comandos conforme a base real do projeto for criada.

### Pré-requisitos
- Node.js na versão definida pelo projeto
- MySQL disponível localmente ou em ambiente de desenvolvimento
- gerenciador de pacotes adotado pelo projeto

### Passos esperados
1. Clonar o repositório
2. Copiar `.env.example` para `.env`
3. Configurar variáveis de ambiente
4. Instalar dependências
5. Executar migrations do Prisma
6. Iniciar o ambiente de desenvolvimento

Exemplo genérico:

```bash
git clone <repo-url>
cd petos
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

## Variáveis de ambiente esperadas

Os nomes exatos serão definidos em `.env.example`, mas o projeto deverá contemplar ao menos grupos como:
- banco de dados
- autenticação
- Mercado Pago
- Stripe
- storage de arquivos
- e-mail transacional
- serviços de IA

## Segurança

Este projeto lida com dados pessoais, histórico operacional, pagamentos, documentos e trilhas de auditoria. Por isso:
- não subir segredos para o repositório;
- não expor credenciais em código cliente;
- proteger webhooks com validação por assinatura/segredo;
- aplicar RBAC no servidor;
- tratar arquivos sensíveis com storage seguro e controle de acesso. fileciteturn9file0turn11file0

## Status do projeto

Neste estágio, o repositório está sendo organizado com base no **PRD final** e no **AGENTS.md**, para iniciar a implementação do sistema com menor retrabalho e maior consistência. fileciteturn9file0turn11file0

## Próximos arquivos recomendados

Após este `README.md`, os próximos arquivos mais importantes para estruturar o repositório são:
- `.gitignore`
- `.env.example`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CHANGELOG.md`
- `.editorconfig`
- workflow básico de CI

## Licença

Definir a licença oficial do projeto antes da publicação aberta do repositório.
