# Phase 2 Smoke Checklist

Checklist objetiva para regressao manual e rodada controlada da baseline da Fase 2.

## Pre-requisitos

- [ ] banco com migrations e seed atualizados
- [ ] usuario interno com perfis administrativos e tutor de teste disponiveis
- [ ] `npm run ops:check` ou `npm run ops:check:staging` sem falhas
- [ ] aplicacao iniciando sem erro fatal e `GET /api/health` coerente

## Financeiro expandido e fiscal minimo

- [ ] deposito e pre-pagamento respeitam separacao entre `AUTHORIZED` e `PAID`
- [ ] reembolso e credito do cliente mantem trilha auditavel
- [ ] no-show protection nao libera comissao indevida
- [ ] eventos externos e documentos fiscais minimos aparecem com status e rastreabilidade coerentes

## Documentos, assinaturas e midia

- [ ] upload valida tipo e tamanho de arquivo
- [ ] documento protegido nao fica acessivel por URL previsivel
- [ ] assinatura do tutor fica registrada com metodo e status corretos
- [ ] arquivamento logico preserva historico e bloqueia acesso indevido

## Agenda avancada, waitlist e Taxi Dog

- [ ] capacidade por profissional/porte/raca bloqueia excesso no servidor
- [ ] bloqueios operacionais impedem criacao indevida de agenda
- [ ] waitlist permite criar, cancelar e promover sem inconsistencias
- [ ] Taxi Dog acompanha o agendamento sem quebrar o eixo financeiro do atendimento

## Portal do tutor ampliado

- [ ] tutor visualiza apenas dados proprios de documentos, financeiro, waitlist e Taxi Dog
- [ ] pre-check-in respeita janela configurada por unidade
- [ ] o tutor nao consegue acessar dados de outro cliente por URL ou chamada direta

## CRM e comunicacao ampliada

- [ ] preferencias de contato e consentimento refletem opt-in/opt-out por canal
- [ ] campanha preparada registra criterio, destinatarios descartados e destinatarios lancados
- [ ] review booster, inativos e pos-servico nao disparam sem consentimento valido

## PDV, estoque e equipe

- [ ] venda PDV concluida baixa estoque e gera reflexo financeiro coerente
- [ ] estoque nao aceita saldo negativo quando a unidade nao permite
- [ ] escala impede sobreposicao indevida por funcionario
- [ ] ponto nao permite dois registros abertos para o mesmo funcionario
- [ ] folha nao finaliza com ponto aberto dentro do periodo

## Encerramento

- [ ] registrar qualquer bug com rota, papel, passo de reproducao e mensagem
- [ ] atualizar [docs/mvp-status.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/docs/mvp-status.md) e [CHANGELOG.md](/C:/Users/casaprobst/PetOS-by-PRObst-main/CHANGELOG.md) somente se o estado da baseline mudar
