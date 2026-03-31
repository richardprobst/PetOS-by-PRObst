# ADR 005 — next-auth v4 com RBAC aplicado no servidor será a estratégia oficial de autenticação e autorização (estado atual)

- **Status:** Aceito
- **Data:** 2026-03-30
- **Decisores:** Mantenedor do projeto / definição arquitetural inicial
- **Relacionados:** `PetOS_PRD.md`, `AGENTS.md`, `docs/architecture.md`, `docs/domain-rules.md`, `docs/decisions/002-nextjs-app-router-route-handlers.md`, `docs/decisions/003-server-side-business-rules.md`

---

## 1. Contexto

O PetOS é um sistema multiusuário com perfis e responsabilidades diferentes, incluindo:

- administradores;
- recepção / equipe administrativa;
- banhistas / tosadores;
- motoristas / Táxi Dog;
- tutores / clientes;
- futuros cenários com multiunidade.

O sistema precisa controlar:

- quem pode entrar;
- o que cada usuário pode ver;
- o que cada usuário pode fazer;
- como permissões se relacionam com perfis, unidade e domínio de dados;
- como garantir isso de forma segura e consistente em toda a aplicação.

Na base técnica do projeto, também era necessário decidir qual estratégia oficial será usada para autenticação e como a autorização será aplicada.

---

## 2. Problema

Era necessário responder:

> Qual será a estratégia oficial de autenticação e autorização do PetOS, de forma alinhada à stack, ao PRD e à necessidade de segurança do produto?

A decisão precisava evitar:

- autenticação caseira e inconsistente;
- autorização baseada apenas em interface;
- permissões espalhadas sem padrão;
- fragilidade em rotas, páginas e APIs;
- dificuldade de evolução para cenários mais complexos.

---

## 3. Alternativas consideradas

## A. next-auth v4 com RBAC aplicado no servidor
Uso de **next-auth v4** para autenticação, combinado com autorização baseada em papéis e permissões garantida no servidor.

### Vantagens
- alinhamento com a stack do projeto;
- boa integração com Next.js;
- solução consolidada para sessões e autenticação;
- permite extensão para papéis e permissões;
- reduz risco de autenticação improvisada;
- favorece consistência arquitetural.

### Desvantagens
- exige modelagem e callbacks bem desenhados;
- requer disciplina para não limitar a segurança à sessão básica.

## B. Autenticação própria do zero
Construção integral da autenticação, sessões, recuperação de senha e autorização sem base consolidada.

### Vantagens
- liberdade total de implementação.

### Desvantagens
- custo alto;
- maior risco de erro de segurança;
- mais tempo gasto em infraestrutura em vez de produto;
- desalinhamento com a base tecnológica já escolhida.

## C. Biblioteca de autenticação alternativa sem relação direta com a decisão de stack atual
Uso de outra estratégia com acoplamento diferente ao framework.

### Vantagens
- possíveis recursos específicos em alguns cenários.

### Desvantagens
- quebra de consistência da stack;
- maior atrito de integração;
- menos previsibilidade para o projeto neste momento.

---

## 4. Decisão

## Decisão aceita
O PetOS usará **next-auth v4** como estratégia oficial de autenticação nesta etapa.

A autorização será baseada em:

- **RBAC** (Role-Based Access Control);
- perfis e permissões previstos no domínio;
- validação de autorização no **servidor**;
- vínculo com unidade e/ou entidade quando aplicável.

---

## 5. Justificativa

A decisão foi tomada pelos seguintes motivos:

### 5.1. Alinhamento com a stack
next-auth v4 se integra bem ao ecossistema já definido para o projeto, especialmente Next.js.

### 5.2. Redução de risco
Autenticação é área sensível. Usar uma base consolidada reduz a chance de soluções frágeis ou improvisadas.

### 5.3. Compatibilidade com RBAC
O PRD e a modelagem do sistema já preveem:
- `PerfisAcesso`
- `Permissoes`
- `PerfilPermissao`
- `UsuarioPerfil`

A estratégia de autenticação e autorização precisa conversar naturalmente com esse desenho.

### 5.4. Segurança e escalabilidade
O PetOS precisa crescer mantendo controle sobre:
- rotas protegidas;
- APIs internas;
- áreas administrativas;
- portal do tutor;
- multiunidade futura.

---

## 6. Consequências práticas

A partir desta decisão:

- autenticação não deve ser implementada “na mão” como padrão;
- sessões e identidade do usuário devem seguir a estratégia oficial do projeto;
- autorização deve ser aplicada no servidor;
- papéis e permissões devem existir como parte do domínio;
- esconder botão na UI não substitui permissão real.

---

## 7. Regras decorrentes desta decisão

## 7.1. Autenticação
- usar **next-auth v4**;
- segredos devem ficar em variáveis de ambiente;
- credenciais nunca devem ser expostas ao cliente;
- fluxos sensíveis devem ser tratados com cuidado (login, sessão, recuperação, expiração, callbacks).

## 7.2. Autorização
A autorização deve verificar, quando aplicável:

- identidade do usuário;
- papel/perfil;
- permissões explícitas;
- vínculo com unidade;
- vínculo com a entidade consultada/alterada.

## 7.3. Servidor como autoridade
A decisão final sobre permissão deve ocorrer no servidor, não apenas em:
- componentes visuais;
- navegação;
- renderização condicional;
- estado de frontend.

## 7.4. Auditoria
Operações críticas envolvendo acesso e administração devem poder gerar auditoria.

---

## 8. O que é esperado do RBAC no projeto

O RBAC do PetOS deve permitir, entre outras coisas:

- diferenciar tutor de usuário interno;
- limitar acesso por função;
- restringir operações administrativas;
- controlar edição, leitura e exclusão de entidades sensíveis;
- suportar evolução futura por unidade e por contexto.

### Exemplo conceitual
Um usuário pode:
- ter um ou mais perfis;
- herdar permissões do(s) perfil(is);
- estar vinculado a uma unidade;
- ter restrições adicionais conforme contexto da entidade.

---

## 9. O que esta decisão não significa

Esta decisão **não significa** que next-auth v4 resolverá sozinho toda a autorização do sistema.

Ele resolve a base de autenticação e sessão.  
A autorização do domínio do PetOS ainda precisa ser implementada com:

- regras claras;
- verificações no servidor;
- integração com tabelas de perfis e permissões;
- contexto de unidade e entidade.

---

## 10. Riscos conhecidos e mitigação

## Risco 1: assumir que “estar logado” é suficiente
### Mitigação
- distinguir autenticação de autorização;
- exigir checagem de permissão no servidor.

## Risco 2: permissões tratadas só na UI
### Mitigação
- reforçar em `AGENTS.md` e revisão de PRs;
- sempre validar no servidor.

## Risco 3: callbacks e sessão carregando dados demais
### Mitigação
- manter sessão enxuta;
- buscar detalhes adicionais no servidor quando necessário;
- evitar expor mais dados do que o necessário.

## Risco 4: crescimento desordenado das regras de acesso
### Mitigação
- centralizar helpers e políticas de autorização;
- documentar papéis e permissões;
- manter coerência com o PRD e com a modelagem do banco.

---

## 11. Exemplos práticos

## Exemplo 1: tutor autenticado
O tutor autenticado pode acessar apenas seus próprios pets, agendamentos e histórico, nunca dados de outros clientes.

## Exemplo 2: recepção
Usuário da recepção pode criar agendamentos e operar fluxo administrativo, mas não necessariamente acessar configurações globais ou dados financeiros completos.

## Exemplo 3: usuário sem permissão de editar
Mesmo que a UI mostre uma rota ou botão por erro, o servidor deve negar a operação.

## Exemplo 4: multiunidade futura
Quando multiunidade estiver ativa, autorização poderá considerar não só perfil e permissão, mas também vínculo com a unidade correta.

---

## 12. Revisão futura

Esta decisão só deve ser revista se houver mudança relevante em:

- estratégia de framework;
- necessidades de autenticação incompatíveis com a solução atual;
- restrições técnicas concretas;
- mudança formal da arquitetura.

Sem isso, a decisão permanece válida.

---

## 13. Resumo

No PetOS:

- **next-auth v4** será a base oficial de autenticação nesta etapa;
- **RBAC** será a base oficial de autorização;
- a autorização real será garantida no **servidor**;
- sessão e login são apenas parte da solução;
- segurança depende de autenticação + permissão + contexto.
