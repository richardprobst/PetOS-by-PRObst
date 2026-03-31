## Resumo
- O que mudou?
- Por que mudou?

## Alinhamento com produto
- [ ] A mudança está alinhada ao `PetOS_PRD.md`
- [ ] A mudança respeita a fase atual (MVP/Fase 2/Fase 3)
- [ ] Não antecipa escopo futuro sem autorização explícita

## Áreas impactadas
- [ ] Agenda/Operação
- [ ] Cliente/Pet
- [ ] Serviços
- [ ] Comunicação
- [ ] Financeiro/Pagamentos
- [ ] Autenticação/Autorização
- [ ] Banco de dados/Prisma
- [ ] Documentação

## Segurança e conformidade
- [ ] Não há segredos expostos
- [ ] Validação server-side foi mantida (quando aplicável)
- [ ] Autorização server-side foi mantida (quando aplicável)
- [ ] Logs/auditoria foram considerados para operações críticas

## Banco de dados (se aplicável)
- [ ] Houve alteração em `schema.prisma`
- [ ] Migration criada e validada localmente
- [ ] Impactos de integridade referencial avaliados

## Testes e verificações
Liste os comandos executados e resultados.

```bash
# exemplo
npm run lint
npm run typecheck
npm run build
```

## Riscos / pendências
- Há algum risco residual?
- Há decisão técnica pendente de confirmação do mantenedor?
