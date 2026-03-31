# ADR 007 — Documentos e mídias terão armazenamento externo, com banco guardando referências e metadados

- **Status:** Aceito
- **Data:** 2026-03-30
- **Decisores:** Mantenedor do projeto / definição arquitetural inicial
- **Relacionados:** `PetOS_PRD.md`, `AGENTS.md`, `docs/architecture.md`, `docs/domain-rules.md`, `SECURITY.md`, `docs/decisions/004-prisma-as-single-db-access-layer.md`

---

## 1. Contexto

O PetOS já prevê, no PRD e em sua evolução por fases, o tratamento de arquivos como:

- fotos de pets;
- fotos antes/depois do atendimento;
- documentos;
- vacinas;
- termos;
- assinaturas;
- mídias operacionais relacionadas ao atendimento.

Esses arquivos precisam ser tratados com:

- segurança;
- controle de acesso;
- rastreabilidade;
- boa performance;
- capacidade de crescimento;
- baixo acoplamento com a camada relacional.

Era necessário decidir onde o sistema deve armazenar o **binário principal** desses arquivos e qual papel o banco de dados terá nesse fluxo.

---

## 2. Problema

A decisão precisava responder:

> O PetOS deve armazenar documentos e mídias diretamente no banco de dados como binário principal, ou deve usar storage externo com referências no banco?

Sem uma decisão clara, o projeto correria risco de:

- guardar blobs diretamente no banco de forma inconsistente;
- misturar dados relacionais com binários pesados;
- dificultar backup, performance e escalabilidade;
- complicar controle de acesso a arquivos;
- gerar caminhos improvisados para uploads e downloads.

---

## 3. Alternativas consideradas

## A. Armazenar binários diretamente no banco
Guardar o conteúdo principal dos arquivos como blob/binário no banco relacional.

### Vantagens
- tudo centralizado teoricamente em uma única camada;
- leitura conceitualmente simples em cenários pequenos.

### Desvantagens
- crescimento rápido do banco;
- backups mais pesados;
- pior impacto em performance e manutenção;
- maior atrito para servir arquivos;
- menos flexibilidade para storage e CDN;
- pior separação entre dados transacionais e arquivos.

## B. Usar storage externo e guardar referências/metadados no banco
Guardar o binário principal em storage apropriado, enquanto o banco registra:
- referência do arquivo;
- tipo;
- tamanho;
- data;
- vínculo com entidades;
- permissões e metadados relevantes.

### Vantagens
- melhor separação de responsabilidades;
- banco mais limpo para uso transacional;
- mais flexibilidade para servir arquivos;
- melhor caminho para crescimento;
- melhor aderência a segurança e controle de acesso.

### Desvantagens
- exige coordenação entre banco e storage;
- requer política clara para upload, acesso e exclusão;
- aumenta a importância de rastreabilidade e reconciliação de arquivos.

---

## 4. Decisão

## Decisão aceita
No PetOS, **documentos e mídias não terão o banco relacional como armazenamento principal do binário**.

O banco armazenará:

- referências dos arquivos;
- metadados;
- tipo de arquivo;
- vínculo com entidades;
- autor do upload quando aplicável;
- data/hora;
- dados relevantes de auditoria e autorização.

O conteúdo binário principal ficará em **storage externo apropriado**.

---

## 5. Justificativa

A decisão foi tomada pelos seguintes motivos:

### 5.1. Separação de responsabilidades
O banco do PetOS deve focar em:
- dados relacionais;
- integridade;
- operações transacionais;
- histórico e auditoria.

Storage de binários tem natureza diferente e deve ser tratado como tal.

### 5.2. Performance e manutenção
Evitar blobs pesados no banco ajuda em:
- performance geral;
- manutenção;
- backup;
- restore;
- evolução do schema;
- previsibilidade operacional.

### 5.3. Segurança e controle
Arquivos sensíveis exigem:
- controle de acesso;
- política de retenção;
- links protegidos;
- validação de tipo/tamanho;
- rastreabilidade.

Tudo isso fica mais claro quando o banco registra metadados e o storage serve como camada especializada.

### 5.4. Crescimento futuro
O PetOS pode evoluir para volume maior de:
- fotos;
- report cards;
- documentos;
- mídias de atendimento.

Essa decisão reduz atrito para crescimento futuro.

---

## 6. O que deve ficar no banco

O banco deve guardar, conforme o caso:

- identificador interno do arquivo;
- URL ou chave de storage;
- nome lógico;
- tipo de mídia/documento;
- mime type;
- tamanho;
- data de upload;
- usuário responsável;
- vínculo com pet, cliente, agendamento ou documento;
- status lógico quando aplicável;
- metadados necessários para autorização e auditoria.

Exemplos de entidades relacionadas:
- `Documentos`
- `Midia`
- `ReportCards`
- entidades auxiliares de auditoria e segurança

---

## 7. O que deve ficar fora do banco

Devem ficar fora do banco, como binário principal:

- imagem original;
- vídeo;
- PDF;
- arquivo de documento;
- anexos;
- mídias antes/depois;
- arquivos de assinatura quando houver representação binária.

---

## 8. Regras decorrentes desta decisão

## 8.1. Upload
Todo upload deve considerar:
- validação de tipo;
- validação de tamanho;
- verificação de permissão;
- vínculo claro com entidade do domínio;
- registro no banco.

## 8.2. Acesso
Acesso a arquivos sensíveis não deve ser exposto livremente por padrão.

O sistema deve prever:
- checagem de permissão;
- estratégia de URL protegida ou acesso controlado;
- distinção entre arquivos públicos e privados, se existirem.

## 8.3. Exclusão e retenção
A remoção lógica e/ou física de arquivos deve respeitar:
- regras do domínio;
- LGPD quando aplicável;
- rastreabilidade;
- política de retenção.

## 8.4. Auditoria
Uploads, substituições e remoções de arquivos sensíveis devem poder gerar auditoria.

---

## 9. Segurança

### Regras obrigatórias
- não confiar apenas na extensão do arquivo;
- validar mime type e regras de upload;
- limitar tamanho de arquivo;
- impedir acesso indevido por URL previsível;
- não expor storage sensível sem controle;
- tratar documentos e mídias com política de menor privilégio.

### Observação
Arquivos ligados a:
- dados pessoais;
- documentos;
- histórico do pet;
- comprovantes;
- imagens operacionais sensíveis

devem ser tratados como recursos protegidos.

---

## 10. Exemplos práticos

## Exemplo 1: foto do pet
- Binário: storage externo
- Banco: referência em `Midia` com vínculo ao `Pet`

## Exemplo 2: foto antes/depois do atendimento
- Binário: storage externo
- Banco: referência em `Midia` e/ou vínculo com `ReportCards`

## Exemplo 3: documento de vacina
- Binário: storage externo
- Banco: referência em `Documentos`, com tipo e metadados de acesso

## Exemplo 4: termo assinado
- Binário: storage externo
- Banco: referência em `Documentos` e vínculo com `Assinaturas`

---

## 11. O que esta decisão não exige imediatamente

Esta decisão **não obriga** a escolher agora um único provedor definitivo de storage.

Ela define a arquitetura conceitual:
- binário fora do banco;
- metadados no banco.

O provedor pode ser definido conforme necessidade operacional, custo e compatibilidade.

---

## 12. Provedores e estratégias compatíveis

A decisão é compatível com estratégias como:

- S3 ou compatíveis;
- Google Cloud Storage;
- storage gerenciado equivalente;
- provider compatível com URLs assinadas e controle de acesso.

A escolha concreta do provedor pode ser registrada em ADR separado, se necessário.

---

## 13. Riscos conhecidos e mitigação

## Risco 1: arquivo salvo no storage sem registro consistente no banco
### Mitigação
- criar fluxo controlado de upload;
- usar etapas claras de persistência;
- tratar falhas com compensação e limpeza quando necessário.

## Risco 2: registro no banco apontando para arquivo inexistente
### Mitigação
- validar persistência do upload antes de confirmar registro;
- prever rotinas de reconciliação quando necessário.

## Risco 3: vazamento de arquivos por acesso indevido
### Mitigação
- adotar política de acesso controlado;
- revisar autorização no servidor;
- evitar exposição pública sem necessidade real.

---

## 14. Revisão futura

Esta decisão só deve ser revista se houver motivo forte ligado a:

- mudança estrutural de infraestrutura;
- requisitos operacionais muito específicos;
- volume muito baixo e cenário extremamente controlado que justifique outra abordagem.

No cenário atual do PetOS, a decisão permanece válida.

---

## 15. Resumo

No PetOS:

- o banco guarda **referências e metadados**;
- o storage guarda o **binário principal**;
- segurança, autorização e auditoria continuam obrigatórias;
- essa separação melhora clareza, performance, manutenção e evolução futura.
