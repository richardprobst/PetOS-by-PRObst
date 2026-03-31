# Resumo

Descreva de forma objetiva o que esta pull request faz.

## Tipo de mudança

Marque o que se aplica:

- [ ] feature
- [ ] correção de bug
- [ ] refatoração
- [ ] melhoria de performance
- [ ] segurança
- [ ] testes
- [ ] documentação
- [ ] chore/infraestrutura
- [ ] migration/schema de banco

## Contexto do produto

- Módulo afetado:
  - [ ] Agenda e Operação
  - [ ] Cliente/Pet
  - [ ] Serviços
  - [ ] Comunicação
  - [ ] Financeiro/Fiscal
  - [ ] Portal do Tutor
  - [ ] Gestão da Equipe
  - [ ] IA e Insights
  - [ ] Logística/Táxi Dog
  - [ ] Multiunidade

- Fase do PRD:
  - [ ] MVP
  - [ ] Fase 2
  - [ ] Fase 3
  - [ ] Roadmap Futuro

- Esta PR altera regra de negócio?
  - [ ] Não
  - [ ] Sim

Se sim, explique qual regra foi alterada e em qual seção do `PetOS_PRD.md` ela está baseada.

## Referências obrigatórias

Informe os documentos e arquivos-base considerados nesta PR:

- PRD consultado:
- AGENTS.md consultado:
- Issue relacionada:
- ADR/documentação relacionada:

## O que foi alterado

Liste os principais pontos desta PR.

- 
- 
- 

## Arquivos e áreas impactadas

Liste os arquivos ou diretórios mais importantes alterados.

- 
- 
- 

## Banco de dados e migrations

- Houve alteração no `schema.prisma`?
  - [ ] Não
  - [ ] Sim

- Houve nova migration?
  - [ ] Não
  - [ ] Sim

- Houve alteração em dados sensíveis, integridade referencial, índices ou constraints?
  - [ ] Não
  - [ ] Sim

Se sim, descreva o impacto e riscos:

## APIs, autenticação e autorização

Marque o que se aplica:

- [ ] altera Route Handlers
- [ ] altera contratos de API
- [ ] altera autenticação
- [ ] altera autorização/RBAC
- [ ] altera webhooks
- [ ] não se aplica

Explique brevemente se houver impacto externo ou mudança de contrato.

## Financeiro, pagamentos e webhooks

Marque o que se aplica:

- [ ] não se aplica
- [ ] altera pagamentos
- [ ] altera Mercado Pago
- [ ] altera Stripe
- [ ] altera reconciliação
- [ ] altera reembolsos
- [ ] altera idempotência
- [ ] altera processamento de webhook

Se aplicável, explique o impacto.

## Segurança e privacidade

Verifique antes de solicitar revisão:

- [ ] não expõe segredos, tokens ou credenciais
- [ ] respeita RBAC no servidor
- [ ] não depende apenas de validação no frontend
- [ ] considera auditoria quando necessário
- [ ] considera LGPD e dados sensíveis quando aplicável
- [ ] valida payloads externos quando aplicável
- [ ] aplica tratamento seguro de erros

## Testes realizados

Marque o que foi feito:

- [ ] lint
- [ ] typecheck
- [ ] testes unitários
- [ ] testes de integração
- [ ] testes end-to-end
- [ ] testes manuais
- [ ] não se aplica

Descreva os testes realizados:

- 
- 
- 

## Checklist final

- [ ] a mudança respeita o `PetOS_PRD.md`
- [ ] a mudança respeita o `AGENTS.md`
- [ ] não antecipa escopo de fase futura sem autorização explícita
- [ ] a implementação está completa, sem placeholders críticos
- [ ] há tratamento de erro adequado
- [ ] há tipagem coerente
- [ ] a documentação foi atualizada, se necessário
- [ ] changelog foi atualizado, se necessário

## Riscos e pontos de atenção

Descreva riscos, trade-offs, pendências ou pontos que merecem revisão mais cuidadosa.

- 
- 
- 

## Evidências

Inclua prints, gravações, payloads de teste, exemplos de request/response ou observações úteis para revisão.
