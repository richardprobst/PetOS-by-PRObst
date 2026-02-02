# 🐾 PetOS By PRObst

**Sistema de Gestão para Banho e Tosa**

> Sistema moderno e exclusivo para gestão de serviços de Banho e Tosa de pets, desenvolvido com Clean Architecture, PHP 8.2+ e React/TypeScript.

---

## 📚 Documentação

Toda a documentação necessária para o desenvolvimento está na pasta `docs/`:

| Documento | Descrição |
|-----------|-----------|
| [📐 PETOS_BLUEPRINT.md](./docs/PETOS_BLUEPRINT.md) | Arquitetura, decisões técnicas e design do sistema |
| [📋 PETOS_PLANO_EXECUCAO.md](./docs/PETOS_PLANO_EXECUCAO.md) | Plano detalhado de execução em 6 fases |
| [🤖 GUIA_COPILOT.md](./docs/GUIA_COPILOT.md) | **Guia principal para GitHub Copilot / Claude Opus 4.5** |
| [📝 PROMPTS_TEMPLATES.md](./docs/PROMPTS_TEMPLATES.md) | Templates prontos de prompts por módulo |
| [📏 CONVENCOES.md](./docs/CONVENCOES.md) | Padrões de código (PHP, TypeScript, SQL, Git) |
| [📖 GLOSSARIO.md](./docs/GLOSSARIO.md) | Termos e conceitos do sistema |

---

## 🎯 Escopo do MVP

O PetOS é **exclusivo para Banho e Tosa** e inclui:

### Funcionalidades Core
1. **Gestão de Clientes (Tutores)** — Cadastro, busca por telefone, histórico
2. **Gestão de Pets** — Informações específicas para B&T (porte, pelagem, agressividade)
3. **Agendamentos de B&T** — Calendário, status de atendimento, serviços
4. **Portal do Cliente** — Acesso via Magic Link para visualizar dados e histórico

### Serviços Suportados
- 🛁 Banho
- ✂️ Tosa Higiênica / Completa
- 💧 Hidratação
- 🔧 Desembaraço
- 💅 Corte de Unha
- �� Limpeza de Ouvido

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Backend** | PHP 8.2+, WordPress (host), Clean Architecture |
| **Frontend Admin** | React 18+, TypeScript, Tailwind CSS, Vite |
| **Frontend Portal** | React 18+, TypeScript, Tailwind CSS, Vite |
| **Banco de Dados** | MySQL (compatível com dados existentes) |
| **Testes** | PHPUnit, PHPStan (nível 6), Vitest |
| **CI/CD** | GitHub Actions |

---

## 📁 Estrutura do Projeto

```
B-T-By-PRObst/
├── 📚 docs/                        # Documentação completa
│   ├── PETOS_BLUEPRINT.md          # Arquitetura e decisões
│   ├── PETOS_PLANO_EXECUCAO.md     # Plano de execução
│   ├── GUIA_COPILOT.md             # Guia para IA assistente
│   ├── PROMPTS_TEMPLATES.md        # Templates de prompts
│   ├── CONVENCOES.md               # Padrões de código
│   └── GLOSSARIO.md                # Termos e conceitos
├── 🔌 plugins/
│   └── petos-core/                 # Plugin WordPress principal
│       ├── petos-core.php          # Bootstrap
│       ├── composer.json
│       ├── src/
│       │   ├── Domain/             # Entidades e regras de negócio
│       │   ├── Application/        # Casos de uso
│       │   ├── Infrastructure/     # Adapters (WP, DB)
│       │   └── UI/                 # Controllers REST
│       ├── resources/
│       │   ├── admin/              # React App Admin
│       │   └── portal/             # React App Portal Cliente
│       └── tests/
├── 🔧 tools/                       # Scripts de desenvolvimento
├── ⚙️ .github/workflows/           # CI/CD
└── 📖 README.md                    # Este arquivo
```

---

## 🚀 Roadmap de Desenvolvimento

| Fase | Descrição | Status |
|------|-----------|--------|
| 0 | Setup & Infraestrutura | 📋 Planejado |
| 1 | Auditoria de Banco de Dados | 📋 Planejado |
| 2 | Núcleo do Domínio (Backend) | 📋 Planejado |
| 3 | API REST v1 | 📋 Planejado |
| 4 | Admin MVP (UI) | 📋 Planejado |
| 5 | Portal do Cliente | 📋 Planejado |
| 6 | Migração & Go-Live | 📋 Planejado |

---

## 🤖 Desenvolvimento com GitHub Copilot

Este projeto é desenvolvido utilizando **GitHub Copilot com Claude Opus 4.5**.

### Para Iniciar
1. Leia o [GUIA_COPILOT.md](./docs/GUIA_COPILOT.md) para entender as regras e padrões
2. Consulte o [PETOS_PLANO_EXECUCAO.md](./docs/PETOS_PLANO_EXECUCAO.md) para ver a fase atual
3. Use os [PROMPTS_TEMPLATES.md](./docs/PROMPTS_TEMPLATES.md) como base para solicitações
4. Siga as [CONVENCOES.md](./docs/CONVENCOES.md) em toda implementação

### Regras Principais
- ✅ Clean Architecture (Domain independente)
- ✅ PHP 8.2+ com strict_types
- ✅ TypeScript strict mode
- ✅ Prepared statements em todo SQL
- ✅ Sanitização de inputs, escape de outputs
- ❌ Nunca alterar tabelas/colunas do banco legado

---

## 📝 Licença

Proprietário — © PRObst

---

**Autor:** PRObst  
**Versão:** 1.0.0  
**Última atualização:** Fevereiro 2026
