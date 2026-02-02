# B-T-By-PRObst

## 🐾 Sistema de Banho e Tosa - DPS v2

Sistema moderno de gestão para **Banho e Tosa**, desenvolvido com Clean Architecture, PHP 8.2+ e React/TypeScript.

### 📚 Documentação

- **[DPS_v2_BLUEPRINT_MODERNO.md](./DPS_v2_BLUEPRINT_MODERNO.md)** - Blueprint técnico e arquitetural do sistema
- **[PLANO_EXECUCAO_DPS_V2.md](./PLANO_EXECUCAO_DPS_V2.md)** - Plano detalhado de execução em 6 fases

### 🎯 Escopo do MVP

O sistema é **exclusivo para Banho e Tosa** e inclui:

1. **Gestão de Clientes (Tutores)** - Cadastro, busca por telefone, histórico
2. **Gestão de Pets** - Informações específicas para B&T (porte, pelagem, agressividade)
3. **Agendamentos de B&T** - Calendário, status de atendimento, serviços
4. **Portal do Cliente** - Acesso via Magic Link para visualizar dados e histórico

### 🛠️ Stack Tecnológica

- **Backend:** PHP 8.2+, WordPress como host, Clean Architecture
- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Banco:** MySQL (compatível com dados existentes)
- **CI/CD:** GitHub Actions

### 📁 Estrutura do Projeto

```
├── docs/                    # Documentação técnica
├── plugins/
│   └── dps-core-v2/         # Plugin WordPress principal
│       ├── src/
│       │   ├── Domain/      # Entidades e regras de negócio
│       │   ├── Application/ # Casos de uso
│       │   ├── Infrastructure/ # Adapters WordPress, DB
│       │   └── UI/          # Controllers
│       ├── resources/
│       │   ├── admin/       # React App Admin
│       │   └── portal/      # React App Portal Cliente
│       └── tests/           # Testes automatizados
└── tools/                   # Scripts de desenvolvimento
```

### 🚀 Roadmap

| Fase | Descrição | Status |
|------|-----------|--------|
| 0 | Setup & Infraestrutura | 📋 Planejado |
| 1 | Auditoria de Banco de Dados | 📋 Planejado |
| 2 | Núcleo do Domínio (Backend) | 📋 Planejado |
| 3 | API REST v2 | 📋 Planejado |
| 4 | Admin MVP (UI) | 📋 Planejado |
| 5 | Portal do Cliente | 📋 Planejado |
| 6 | Migração & Go-Live | 📋 Planejado |

---

**Autor:** PRObst