# Installer / Updater Smoke Checklist

Checklist objetiva para regressao controlada da frente installer/updater do PetOS.

Use este documento como complemento dos checklists ja existentes:

- [docs/manual-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/manual-smoke-checklist.md)
- [docs/phase2-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/phase2-smoke-checklist.md)

## Pre-requisitos

- [ ] banco com migrations e seed atualizados
- [ ] `npm run ops:check` sem falhas
- [ ] `npm run build` concluido
- [ ] nenhum processo local do PetOS esta segurando `.next` antes de rebuilds adicionais
- [ ] aplicacao iniciando com `npm run start` ou `npm run dev`
- [ ] operador com permissao `sistema.manutencao.operar`, `sistema.reparo.operar` e `sistema.update.operar` quando o smoke incluir o painel administrativo

## Setup inicial

- [ ] `GET /api/setup/preflight` sem token retorna falha fechada
- [ ] `GET /setup` com `INSTALLER_ENABLED=false` nao abre reinstalacao silenciosa
- [ ] ambiente novo com `INSTALLER_ENABLED=true` e token forte consegue abrir sessao temporaria do setup
- [ ] preflight do setup mostra ambiente, banco, migrations e seed com classificacao coerente
- [ ] finalize da instalacao grava `INSTALLING -> INSTALLED`
- [ ] lock do instalador impede reexecucao do setup no mesmo ambiente

## Maintenance e repair

- [ ] entrada manual em maintenance muda o lifecycle para `MAINTENANCE`
- [ ] rotas publicas, tutor e APIs protegidas respeitam a retencao de maintenance
- [ ] operador com permissao de bypass continua acessando a area administrativa
- [ ] saida manual de maintenance devolve o runtime para `INSTALLED`
- [ ] incidente manual de repair cria trilha auditavel
- [ ] resolucao de incidentes so permite destinos coerentes com o lifecycle original

## Updater preflight

- [ ] `GET /api/admin/system/update-preflight` exige `sistema.update.operar`
- [ ] `same version` aparece como no-op seguro, sem permitir execucao
- [ ] `manifest/build mismatch` bloqueia o fluxo
- [ ] versao de origem nao confiavel bloqueia o fluxo
- [ ] env obrigatorio novo ausente bloqueia o fluxo
- [ ] runtime sem `prisma migrate deploy` bloqueia o fluxo

## Engine de update

- [ ] iniciar update exige preflight compativel
- [ ] segunda execucao concorrente e bloqueada
- [ ] a execucao entra em `UPDATING` antes de migrations/tasks
- [ ] falha de migration interrompe o fluxo e deixa `UPDATE_FAILED`
- [ ] task critica falhando bloqueia conclusao
- [ ] retry seguro cria nova execucao ligada a anterior
- [ ] sucesso finaliza runtime em `INSTALLED` com versao persistida atualizada
- [ ] falha controlada preserva resumo, passos e recovery state

## Encerramento

- [ ] registrar qualquer desvio com rota, papel, passo de reproducao e mensagem
- [ ] atualizar [docs/installer-updater-baseline.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/installer-updater-baseline.md) somente se o comportamento suportado mudar
- [ ] atualizar [CHANGELOG.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/CHANGELOG.md) somente se houver ajuste relevante no runtime installer/updater
