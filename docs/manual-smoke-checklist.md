# Manual Smoke Checklist

Checklist objetiva usada na validacao manual do MVP em ambiente real e mantida como referencia para futuras rodadas de regressao manual.

Para a baseline da Fase 2, use tambem [docs/phase2-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase2-smoke-checklist.md).

## Pre-requisitos do ambiente

- [ ] `.env.local` configurado com `DATABASE_URL`, `DIRECT_DATABASE_URL`, `NEXTAUTH_SECRET` e `NEXTAUTH_URL`
- [ ] MySQL de desenvolvimento acessivel pela aplicacao
- [ ] `npm run prisma:migrate:dev` ou `npm run prisma:migrate:deploy` executado com sucesso
- [ ] `npm run prisma:seed` executado com sucesso
- [ ] ao menos um usuario administrativo e um tutor de teste disponiveis
- [ ] aplicacao iniciando com `npm run dev` ou `npm run start` sem erro fatal

## Bootstrap e autenticacao

- [ ] acessar `/` e confirmar carregamento da landing sem erro visual ou de console
- [ ] acessar `/entrar` e confirmar renderizacao do formulario
- [ ] tentar abrir `/admin` sem sessao e confirmar redirecionamento para `/entrar?callbackUrl=%2Fadmin`
- [ ] tentar abrir `/tutor` sem sessao e confirmar redirecionamento para `/entrar?callbackUrl=%2Ftutor`
- [ ] autenticar como usuario interno e confirmar acesso apenas a rotas permitidas pelo perfil
- [ ] autenticar como tutor e confirmar bloqueio de rotas administrativas

## Administrativo: agenda e operacao

- [ ] criar agendamento valido com cliente, pet, servico e profissional
- [ ] tentar criar overbooking do mesmo profissional no mesmo horario e confirmar bloqueio server-side
- [ ] tentar criar agendamento no passado e confirmar bloqueio server-side
- [ ] confirmar criacao de historico inicial de status
- [ ] alterar status em ordem valida e confirmar persistencia do historico
- [ ] tentar salto de status invalido e confirmar bloqueio server-side
- [ ] executar check-in em agendamento confirmado e confirmar geracao do registro de check-in
- [ ] tentar repetir check-in do mesmo agendamento e confirmar bloqueio
- [ ] cancelar e reagendar respeitando janelas da unidade

## Administrativo: financeiro e comissao

- [ ] registrar transacao financeira de receita vinculada ao atendimento
- [ ] confirmar que `AUTHORIZED` nao marca o atendimento como quitado
- [ ] confirmar que apenas `PAID` consolida `financialStatus`
- [ ] confirmar que a comissao permanece zerada antes de `PAID`
- [ ] confirmar que a comissao e calculada apos `PAID`
- [ ] validar que cancelamento/no-show nao liberam comissao indevida

## Administrativo: comunicacao manual

- [ ] abrir comunicacao manual por WhatsApp Web com cliente que possua telefone valido
- [ ] abrir comunicacao manual por e-mail com cliente que possua e-mail valido
- [ ] confirmar criacao de `LogsMensagens` para os dois canais
- [ ] tentar usar WhatsApp sem telefone e confirmar erro coerente
- [ ] tentar usar e-mail sem endereco valido e confirmar erro coerente

## Portal do tutor e PWA

- [ ] autenticar como tutor e abrir `/tutor`
- [ ] confirmar exibicao de dados proprios, pets, historico e agendamentos permitidos
- [ ] confirmar que o tutor nao visualiza dados de outro cliente
- [ ] acessar `manifest.webmanifest` e verificar carregamento sem erro
- [ ] validar instalabilidade basica do PWA no navegador-alvo
- [ ] confirmar carregamento de `sw.js`
- [ ] confirmar superficie de notificacoes/historico do tutor sem erro

## Regressao tecnica minima

- [ ] revisar logs da aplicacao apos os fluxos principais
- [ ] confirmar ausencia de erro 500 nas rotas usadas
- [ ] confirmar ausencia de divergencia entre status operacional e financeiro
- [ ] confirmar ausencia de inconsistencias entre seed, banco real e RBAC

## Encerramento

- [ ] registrar bugs encontrados com rota, papel do usuario e passo de reproducao
- [ ] atualizar `docs/mvp-status.md` apenas se o estado do MVP mudar de forma relevante
