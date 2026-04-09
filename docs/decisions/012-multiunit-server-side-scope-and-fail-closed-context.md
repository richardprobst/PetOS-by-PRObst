# ADR 012 - Multiunidade usa contexto server-side com escopo fail-closed

- **Status:** Aceito
- **Data:** 2026-04-09
- **Decisores:** Mantenedor do projeto / consolidacao da Fase 3
- **Relacionados:** `docs/architecture.md`, `docs/domain-rules.md`, `docs/phase3-maintenance-guide.md`, `docs/phase3-block1-multiunit-impact-map.md`

---

## 1. Contexto

O Bloco 1 da Fase 3 abriu a fundacao de contexto multiunidade e o Bloco 2 propagou esse escopo para modulos operacionais.

Era necessario evitar:

- filtros cegos por `actor.unitId`;
- leitura cross-unit acidental;
- UI determinando sozinha o contexto de unidade;
- escrita estrutural global liberada por conveniencia.

## 2. Problema

A decisao precisava responder:

> Como o PetOS deve resolver escopo multiunidade sem abrir vazamento cross-unit por padrao?

## 3. Alternativas consideradas

### A. Resolver contexto principalmente no cliente

Desvantagens:

- inseguro;
- facil de burlar;
- dificil de manter coerencia entre paginas, APIs e services.

### B. Resolver contexto no servidor, com estados explicitos e fail-closed

Vantagens:

- coerencia entre UI, API e dominio;
- melhor controle de leitura global versus local;
- menor risco de vazamento.

## 4. Decisao

O PetOS adota contexto multiunidade resolvido no servidor, com distincao explicita entre:

- `LOCAL`;
- `GLOBAL_AUTHORIZED`.

Invariantes:

- ausencia de contexto falha fechado;
- leitura global depende de papel autorizado;
- escrita estrutural cross-unit continua mais restrita;
- superficies administrativas apenas expõem diagnostico do contexto, nao o substituem.

## 5. Consequencias praticas

- services precisam consumir wrappers centrais de escopo;
- novas aberturas multiunidade devem seguir mapa de impacto;
- ownership e unidade precisam ser considerados juntos;
- testes de isolamento cross-unit sao obrigatorios em mudancas relevantes.
