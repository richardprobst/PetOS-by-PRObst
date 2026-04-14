# Installer / Updater Baseline

Baseline operacional da frente installer/updater do PetOS no fechamento do Bloco G.

## O que esta concluido

Esta frente agora cobre, de forma integrada e auditavel:

- preflight do setup protegido por ambiente e token
- sessao temporaria assinada para `/setup`
- wizard assistido de bootstrap inicial
- finalize do setup com lock persistido do instalador
- runtime state e lifecycle explicitos
- maintenance mode e repair mode
- preflight bloqueante do updater
- manifest de release embarcado no build
- politica de compatibilidade `from -> to`
- engine controlada de execucao do update
- persistencia de execucoes, passos e recovery state
- retry seguro quando a propria execucao falhada permitir

## O que esta intencionalmente fora do escopo

Esta frente ainda nao faz:

- deploy automatico de build novo
- integracao com CI/CD, provedor ou host
- escrita automatica de segredos
- rollback universal automatico
- recovery expandido alem do retry seguro e do repair operacional
- provisionamento de banco, DNS, SSL ou infraestrutura externa

## Gates de seguranca

Os gates principais desta camada sao:

- `INSTALLER_ENABLED` e `INSTALLER_BOOTSTRAP_TOKEN` para setup inicial
- lock persistido do instalador depois da primeira instalacao valida
- permissao `sistema.update.operar` para preflight e execucao do updater
- preflight bloqueante antes de qualquer update
- lock de concorrencia para impedir execucoes paralelas
- maintenance e `UPDATE_FAILED` como estados explicitos do runtime
- auditoria de setup, maintenance, repair e update

## Cenarios suportados

Suportados neste marco:

- bootstrap guiado de ambiente novo
- bloqueio de reinstalacao acidental
- manutencao manual e retencao de acesso
- repair manual com incidente auditavel
- planejamento seguro de update
- execucao controlada de update no runtime atual, quando o host suporta `prisma migrate deploy`
- retry seguro para falhas classificadas como reexecutaveis

## Cenarios que continuam manuais

Continuam exigindo acao humana:

- confirmar backup quando a release exigir
- disponibilizar variaveis novas obrigatorias
- garantir host com Prisma CLI quando a migration precisar rodar no runtime
- publicar o novo build/artifacto antes de usar a engine no ambiente real
- corrigir falhas que terminem em `MANUAL_INTERVENTION_REQUIRED`

## Prontidao operacional deste marco

Esta frente pode ser considerada pronta neste marco quando:

1. `npm run check:all` estiver verde, incluindo `ops:check` com banco, migrations, seed e lifecycle coerentes
2. a documentacao desta camada estiver sincronizada
3. o smoke controlado em [docs/installer-updater-smoke-checklist.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/installer-updater-smoke-checklist.md) estiver disponivel
4. nao houver drift obvio entre `/setup`, `/admin/sistema`, runtime state e manifest
5. os limites intencionais permanecerem claros para o operador

## Leitura complementar

- [docs/setup.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/setup.md)
- [docs/operability.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/operability.md)
- [docs/release-readiness.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/release-readiness.md)
- [docs/installer-updater-hosted-rollout.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/installer-updater-hosted-rollout.md)
- [INSTALLER_UPDATER_PLAN.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/INSTALLER_UPDATER_PLAN.md)
