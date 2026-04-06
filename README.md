# PetOS

Sistema SaaS para pet shops, banho e tosa e servicos correlatos, com foco no mercado brasileiro.

## Status atual

O repositorio implementa o MVP operacional do PetOS com:

- autenticacao em `next-auth v4`;
- RBAC aplicado no servidor;
- Prisma como camada unica de dados;
- agenda operacional com status, check-in e historico;
- cadastro de clientes, pets, servicos e equipe;
- comunicacao manual via WhatsApp Web e e-mail com templates e logs;
- financeiro basico com receitas, despesas e vinculo ao atendimento;
- comissoes calculadas no servidor;
- portal do tutor com perfil, pets, historico, agendamento e base PWA;
- report cards simples;
- auditoria base, rate limiting e validacao com Zod.

Neste ponto, o repositorio preserva a baseline tecnica do MVP validado e concluiu a **Fase 2** no recorte previsto pelo PRD, com:

- financeiro expandido e fiscal minimo;
- documentos, assinaturas e midia protegidos;
- agenda avancada, waitlist e Taxi Dog operacional;
- portal do tutor ampliado;
- CRM e comunicacao ampliada;
- PDV e estoque;
- escalas, ponto e base de payroll.

Fase 3 e roadmap futuro continuam fora do escopo desta baseline.

O repositorio tambem fechou a frente interna de **installer/updater assistido**, com:

- setup protegido por flag, token e sessao temporaria;
- runtime state e lifecycle persistidos;
- maintenance e repair mode;
- preflight e manifest de release do updater;
- engine controlada de update com recovery minimo e retry seguro.

## Stack

- Next.js 15 com App Router
- React 19
- TypeScript com `strict: true`
- Tailwind CSS
- Prisma ORM
- MySQL
- next-auth v4
- Zod
- React Hook Form

## Estrutura principal

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
prisma/
scripts/
server/
tests/
docs/
```

## Setup local rapido

Fluxo recomendado:

1. Instale dependencias com `npm install`.
2. Copie `.env.example` para `.env.local`.
3. Suba o MySQL local com `npm run db:up`.
4. Aplique schema e seed com `npm run prisma:bootstrap`.
5. Valide o ambiente com `npm run ops:check`.
6. Inicie a aplicacao com `npm run dev`.

Guia completo:

- [docs/setup.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/setup.md)
- [docs/deploy-staging.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/deploy-staging.md)
- [docs/hostinger-github-import.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/hostinger-github-import.md)
- [docs/operability.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/operability.md)
- [docs/local-docker-validation.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/local-docker-validation.md)
- [docs/release-baseline.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/release-baseline.md)
- [docs/phase2-baseline.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase2-baseline.md)
- [docs/release-readiness.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/release-readiness.md)
- [docs/manual-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/manual-smoke-checklist.md)
- [docs/phase2-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase2-smoke-checklist.md)
- [docs/installer-updater-baseline.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/installer-updater-baseline.md)
- [docs/installer-updater-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/installer-updater-smoke-checklist.md)

## Scripts principais

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run check:all`
- `npm run db:up`
- `npm run db:down`
- `npm run db:logs`
- `npm run ops:preflight`
- `npm run prisma:check`
- `npm run prisma:bootstrap`
- `npm run prisma:migrate:dev`
- `npm run prisma:migrate:deploy`
- `npm run prisma:seed`
- `npm run ops:check`
- `npm run ops:preflight:staging`
- `npm run ops:check:staging`
- `npm run ops:preflight:staging:file`
- `npm run ops:check:staging:file`
- `npm run start:standalone`

## Arquivos de referencia

- [PetOS_PRD.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/PetOS_PRD.md)
- [AGENTS.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/AGENTS.md)
- [PLANS.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/PLANS.md)
- [docs/architecture.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/architecture.md)
- [docs/domain-rules.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/domain-rules.md)
- [docs/payments.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/payments.md)
- [docs/security-notes.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/security-notes.md)
- [docs/data-model.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/data-model.md)
- [docs/mvp-status.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/mvp-status.md)
- [docs/decisions/README.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/decisions/README.md)

## Convencoes relevantes

- `next.config.ts` e o arquivo de configuracao ativo do Next.js.
- o build de producao usa `output: 'standalone'` para facilitar ambientes hospedados sem amarrar um provedor.
- `npm run start` ja sobe o servidor `standalone` gerado pelo build de producao, carregando `.env.local` e `.env` quando existirem; `start:legacy` ficou apenas para diagnostico local quando necessario.
- `npm run check:all` e o gate automatizado recomendado para a baseline tecnica atual.
- `ops:preflight:staging` e `ops:check:staging` assumem variaveis injetadas pelo ambiente hospedado; os sufixos `:file` servem para ensaio local com `.env.staging`.
- Regras criticas ficam no servidor.
- Route Handlers e server actions usam validacao Zod.
- Prisma concentra schema, migrations e acesso a dados.
- Status operacional e status financeiro permanecem separados.

## Limites intencionais da baseline atual

Nao fazem parte desta etapa:

- RH amplo e modulo trabalhista completo;
- fiscal amplo/autonomo;
- supply chain e compras complexas;
- analise de imagem, analise preditiva e multiunidade operacional completa.
