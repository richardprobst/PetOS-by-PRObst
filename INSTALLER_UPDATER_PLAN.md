# INSTALLER_UPDATER_PLAN

## 1. Objetivo

Este documento define o plano tecnico-operacional para duas novas frentes do PetOS:

- um instalador integrado ao sistema;
- um mecanismo seguro de atualizacao do sistema.

O objetivo nao e transformar o PetOS em um deployer universal nem em um wizard "magico". O objetivo e reduzir atrito para operadores com pouca experiencia tecnica, mantendo:

- seguranca;
- previsibilidade;
- autoridade no servidor;
- trilha de auditoria;
- controle explicito de estado;
- limites claros sobre o que o sistema consegue ou nao consegue fazer sozinho.

### Problema que essa frente resolve

Hoje, instalar ou atualizar o PetOS depende de conhecimento tecnico sobre:

- variaveis de ambiente;
- banco MySQL;
- migrations e seed;
- readiness operacional;
- build e boot;
- verificacao pos-deploy.

Para usuarios nao tecnicos ou operadores pequenos, isso cria risco de:

- ambiente incompleto;
- banco inconsistente;
- segredos mal configurados;
- atualizacao parcial;
- reinstalacao acidental;
- tentativa de rollout em ambiente nao pronto.

O instalador e o atualizador devem reduzir esse risco por meio de uma camada assistida, guiada e segura.

## 2. Principios de produto e seguranca

### 2.1. Experiencia guiada e simples

O fluxo deve ser legivel para usuarios leigos, com linguagem simples, progresso visivel e explicacoes curtas. O sistema deve automatizar o que for seguro e pedir apenas o que realmente precisa ser informado.

### 2.2. Automacao sempre que segura

Automatizar:

- validacoes;
- bootstrap de schema;
- seed base;
- checagens de compatibilidade;
- tarefas idempotentes;
- healthcheck e verificacao final.

Nao automatizar quando:

- a acao depende de privilegio externo nao garantido;
- o risco de quebra supera o ganho de UX;
- nao houver garantias suficientes de reversao ou bloqueio seguro.

### 2.3. Servidor como autoridade

Instalacao e atualizacao sao operacoes criticas. Toda decisao final deve passar por camadas server-side com:

- autenticacao;
- autorizacao;
- validacao com Zod;
- execucao transacional quando aplicavel;
- auditoria.

### 2.4. Estado explicito

Instalacao e update devem operar como maquinas de estado explicitas, nunca como sequencia informal de telas.

Estados minimos recomendados:

- `NOT_INSTALLED`
- `INSTALLING`
- `INSTALLED`
- `INSTALL_FAILED`
- `MAINTENANCE`
- `UPDATING`
- `UPDATE_FAILED`
- `REPAIR`

### 2.5. Prevenir reinstalacao acidental

Depois da instalacao finalizada:

- o modo instalacao deve ser bloqueado;
- o wizard nao deve permanecer publico;
- qualquer reentrada deve exigir gating explicito e privilegio alto.

### 2.6. Prevenir atualizacao destrutiva

Nenhum update deve ser executado sem:

- detectar versao atual;
- detectar versao alvo;
- validar compatibilidade;
- validar banco;
- validar pending migrations ou scripts;
- validar readiness minima;
- registrar auditoria.

### 2.7. Rollback e recovery realistas

Rollback perfeito universal nao e realista em qualquer host. O plano deve priorizar:

- bloqueio preventivo antes da execucao;
- backup logico quando possivel;
- tarefas idempotentes;
- estado de falha recuperavel;
- modo reparo guiado;
- rollback apenas quando realmente suportado.

### 2.8. Separacao de modos

O sistema deve distinguir claramente:

- setup inicial;
- operacao normal;
- modo manutencao;
- modo atualizacao;
- modo reparo.

Cada modo deve ter:

- regras de acesso;
- UI propria;
- logs proprios;
- limites claros do que pode ser feito.

## 3. O que o sistema pode fazer sozinho com seguranca

## 3.1. Pre-checagem automatica

O sistema pode automatizar com seguranca:

- detectar versao do app embarcada no build;
- detectar se o sistema ainda nao foi instalado;
- validar `APP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`;
- validar `DATABASE_URL` e `DIRECT_DATABASE_URL`;
- testar conectividade com o MySQL;
- verificar acesso do Prisma ao banco;
- verificar presenca de `_prisma_migrations`;
- verificar migrations pendentes;
- verificar seed minima;
- verificar provider de storage configurado;
- verificar diretorio local de storage quando esse modo estiver ativo;
- verificar integracoes opcionais quando habilitadas por flag;
- verificar contratos minimos de pagamentos/fiscal/storage;
- verificar permissoes minimas e base RBAC apos instalacao;
- verificar `/api/health` e checks estruturais.

### Limites dessa automacao

O sistema nao deve tentar "adivinhar" nem corrigir automaticamente:

- firewall ou allowlist do banco;
- DNS;
- HTTPS;
- segredos ausentes em painel hospedado;
- criacao de banco em provedor externo sem suporte explicito;
- armazenamento externo sem credenciais validas.

## 3.2. Instalacao automatica

Se o ambiente minimo estiver pronto, o sistema pode automatizar:

- aplicar `prisma migrate deploy`;
- executar seed base idempotente;
- inicializar perfis e permissoes;
- criar unidade base;
- criar configuracoes base da unidade;
- criar o admin inicial com hash seguro;
- gravar estado da instalacao;
- rodar healthcheck final;
- travar o modo instalacao;
- registrar auditoria da instalacao.

### Quando nao automatizar a instalacao

Nao automatizar se:

- o banco estiver inacessivel;
- houver incompatibilidade de versao/schema;
- segredos obrigatorios estiverem ausentes;
- o storage obrigatorio estiver mal configurado;
- o sistema detectar que ja existe uma instalacao valida sem autorizacao explicita de recovery;
- houver falha em preflight critico.

## 3.3. Atualizacao automatica

Se o ambiente suportar, o sistema pode automatizar:

- detectar versao atual instalada;
- detectar manifest/version da release alvo;
- validar compatibilidade de upgrade;
- verificar prerequisitos da release alvo;
- entrar em modo manutencao;
- aplicar `prisma migrate deploy`;
- executar tarefas pos-migracao idempotentes;
- atualizar seed base apenas quando a release exigir dados bootstrap aditivos;
- limpar caches/artefatos internos seguros;
- rodar checks pos-update;
- rodar `/api/health`;
- sair de manutencao;
- registrar auditoria e historico do update.

### Quando nao automatizar a atualizacao

Nao automatizar se:

- a release exigir salto de versao nao suportado;
- a migration for marcada como nao segura sem backup confirmado;
- o banco nao suportar snapshot logico minimo;
- o ambiente hospedado nao permitir aplicar artefato/build por esse canal;
- faltar segredo novo obrigatorio da release;
- a release depender de acao manual de provedor externo;
- o sistema estiver degradado antes de entrar no update.

## 4. O que continua exigindo acao humana

## 4.1. Obrigatorio

O usuario/administrador ainda precisara informar:

- URL publica do sistema;
- `DATABASE_URL`;
- `DIRECT_DATABASE_URL`;
- `NEXTAUTH_SECRET`;
- nome da empresa/unidade inicial;
- fuso horario padrao da unidade;
- nome, e-mail e senha forte do admin inicial;
- decisao sobre storage operacional;
- confirmacao de execucao de instalacao ou update.

## 4.2. Opcional

Podem ser informados na instalacao ou depois:

- integracoes de e-mail;
- integracoes de pagamento;
- integracoes fiscais;
- configuracao de storage externo;
- branding inicial;
- templates e mensagens;
- politicas por unidade;
- chaves de IA;
- configuracoes de CRM e notificacoes.

## 4.3. Pos-instalacao

Faz sentido deixar para depois:

- integracoes avancadas;
- politicas comerciais detalhadas;
- carga operacional real;
- dominios customizados mais complexos;
- onboarding de equipe;
- configuracao fina de agenda, CRM, PDV e payroll.

## 5. Fluxo do instalador integrado

O instalador deve existir como fluxo temporario, guiado e bloqueavel.

### Etapa 1. Boas-vindas e deteccao de modo

- Objetivo: informar o que sera feito e confirmar se o sistema esta realmente em modo instalacao.
- O sistema faz sozinho: detecta se ha instalacao previa, verifica flag de habilitacao e gera `setupSessionId`.
- O usuario informa: nada.
- Validacoes: host permitido, flag ativa, sistema nao instalado ou em recovery autorizado.
- Erros possiveis: instalador desabilitado, instalacao previa detectada, host incoerente.
- Mensagem esperada: "O PetOS ainda nao foi instalado neste ambiente. Vamos preparar a configuracao inicial."
- UI/UX recomendada: tela limpa com checklist curto e CTA unico `Iniciar diagnostico`.

### Etapa 2. Diagnostico automatico

- Objetivo: mostrar se o ambiente atende ao minimo tecnico.
- O sistema faz sozinho: preflight de env, banco, storage, versionamento e readiness minima.
- O usuario informa: nada, salvo clique em `Tentar novamente`.
- Validacoes: URL, segredo, conexao MySQL, migrations, storage, flags opcionais.
- Erros possiveis: banco inacessivel, segredo ausente, contrato invalido.
- Mensagem esperada: "Encontramos 3 itens que precisam ser corrigidos antes da instalacao."
- UI/UX recomendada: cards de status `Aprovado`, `Atencao`, `Bloqueante`, com detalhes tecnicos recolhiveis.

### Etapa 3. Requisitos e ambiente

- Objetivo: capturar e validar configuracao obrigatoria que o sistema nao consegue inferir.
- O sistema faz sozinho: preenche valores detectados quando possivel e valida com Zod.
- O usuario informa: URL publica, segredo de autenticacao, conexao de banco.
- Validacoes: URLs coerentes, segredo forte, strings de conexao parseaveis.
- Erros possiveis: URL privada em ambiente publico, segredo fraco, banco com credencial invalida.
- Mensagem esperada: "Revise os dados basicos do ambiente."
- UI/UX recomendada: formulario guiado, campos essenciais primeiro e bloco `Avancado` separado.

### Etapa 4. Conexao com banco

- Objetivo: confirmar que o PetOS consegue operar no MySQL informado.
- O sistema faz sozinho: testa `DATABASE_URL`, testa `DIRECT_DATABASE_URL`, verifica versao minima do schema.
- O usuario informa: nada adicional, salvo editar credenciais.
- Validacoes: conectividade, permissao de migration, banco vazio ou compativel.
- Erros possiveis: rede, credencial, schema de outro app, permissoes insuficientes.
- Mensagem esperada: "Conexao estabelecida. O banco esta pronto para inicializacao."
- UI/UX recomendada: indicador de teste em tempo real com explicacao simples e detalhe tecnico opcional.

### Etapa 5. Configuracao base da empresa/unidade

- Objetivo: criar a base operacional minima do primeiro tenant/unidade.
- O sistema faz sozinho: oferece defaults seguros de timezone e configuracoes iniciais.
- O usuario informa: nome da empresa, nome da unidade, timezone, telefone/e-mail principal quando aplicavel.
- Validacoes: campos obrigatorios, coerencia basica de fuso e contato.
- Erros possiveis: nome ausente, timezone invalido.
- Mensagem esperada: "Esses dados serao usados como base da primeira unidade."
- UI/UX recomendada: formulario curto com preview resumido.

### Etapa 6. Criacao do admin inicial

- Objetivo: garantir acesso administrativo inicial seguro.
- O sistema faz sozinho: valida forca da senha, aplica hash forte, registra papel administrativo minimo.
- O usuario informa: nome, e-mail e senha do admin.
- Validacoes: e-mail valido, senha forte, confirmacao de senha.
- Erros possiveis: senha fraca, e-mail duplicado em base ja existente.
- Mensagem esperada: "Este usuario sera o primeiro administrador do ambiente."
- UI/UX recomendada: feedback de senha forte, mas sem expor regra em excesso.

### Etapa 7. Integracoes opcionais

- Objetivo: habilitar apenas o que fizer sentido no dia zero.
- O sistema faz sozinho: apresenta blocos opcionais com status `Nao configurado`.
- O usuario informa: storage externo, e-mail, pagamentos, fiscal, IA, quando quiser.
- Validacoes: contratos minimos por integracao.
- Erros possiveis: chave incompleta, endpoint invalido, segredo inconsistente.
- Mensagem esperada: "Voce pode pular esta etapa e configurar depois."
- UI/UX recomendada: toggles por integracao com disclosure progressivo.

### Etapa 8. Revisao final

- Objetivo: resumir tudo antes de executar.
- O sistema faz sozinho: monta resumo e classifica itens em `Obrigatorio`, `Opcional`, `Pendente`.
- O usuario informa: confirmacao final.
- Validacoes: nenhum bloqueante restante.
- Erros possiveis: preflight ficou stale entre etapas.
- Mensagem esperada: "Tudo pronto para instalar o PetOS neste ambiente."
- UI/UX recomendada: resumo em secoes e botao claro `Instalar agora`.

### Etapa 9. Instalacao

- Objetivo: executar bootstrap controlado.
- O sistema faz sozinho:
  - entra em `INSTALLING`;
  - aplica migrations;
  - roda seed base;
  - cria admin;
  - cria unidade e configuracoes base;
  - registra auditoria e logs por etapa.
- O usuario informa: nada.
- Validacoes: transacoes por etapa, locks, idempotencia onde aplicavel.
- Erros possiveis: migration falhou, seed falhou, perda de conexao, conflito de estado.
- Mensagem esperada: "Estamos preparando o ambiente. Nao feche esta tela."
- UI/UX recomendada: barra de progresso por etapa, log humano curto e modo tecnico recolhivel.

### Etapa 10. Validacao final

- Objetivo: confirmar que o ambiente realmente ficou pronto.
- O sistema faz sozinho:
  - roda `ops:check` equivalente interno;
  - chama `/api/health`;
  - valida login do admin de forma segura;
  - verifica base RBAC e seed minima.
- O usuario informa: nada.
- Validacoes: status `ok` em ambiente, banco, migrations e seed.
- Erros possiveis: instalacao concluiu parcialmente, health `503`, seed degradada.
- Mensagem esperada: "Instalacao concluida com sucesso."
- UI/UX recomendada: checklist final com links para entrar no sistema ou baixar relatorio.

### Etapa 11. Conclusao e lock

- Objetivo: encerrar o modo instalacao de forma segura.
- O sistema faz sozinho:
  - marca `INSTALLED`;
  - desliga o instalador publico;
  - registra versao instalada;
  - cria snapshot da configuracao nao sensivel;
  - emite log/auditoria final.
- O usuario informa: nada.
- Validacoes: lock persistido.
- Erros possiveis: lock nao persistiu, sessao expirada.
- Mensagem esperada: "O PetOS esta pronto. O modo instalacao foi desativado."
- UI/UX recomendada: resumo final com proximos passos e link para `/entrar`.

## 6. Fluxo do atualizador integrado

O atualizador deve ser tratado como fluxo assistido para ambientes controlados, com variacao entre manual assistido e semiautomatico.

## 6.1. Fluxo manual assistido

Fluxo recomendado quando o host nao permite automacao completa de deploy:

1. detectar versao atual instalada;
2. detectar manifest da versao alvo no build disponibilizado;
3. checar compatibilidade;
4. validar prerequisitos e segredos novos;
5. orientar backup logico do banco;
6. entrar em modo manutencao;
7. aplicar migrations e tarefas pos-update;
8. validar health e readiness;
9. sair de manutencao;
10. registrar auditoria e conclusao.

Nesse modo, o sistema orienta e executa apenas o que esta sob seu controle. O operador continua responsavel por:

- publicar o novo build;
- atualizar segredos no host;
- confirmar backups;
- liberar infraestrutura externa quando necessario.

## 6.2. Fluxo semiautomatico

Fluxo recomendado quando o ambiente permite que o app rode as etapas internas com seguranca:

1. detectar versao atual;
2. comparar com `targetManifest`;
3. travar novo update concorrente;
4. verificar compatibilidade de schema e seed;
5. criar snapshot logico de configuracao nao sensivel;
6. solicitar confirmacao final;
7. entrar em `MAINTENANCE`;
8. entrar em `UPDATING`;
9. aplicar migrations;
10. executar tasks idempotentes pos-update;
11. validar banco, seed e health;
12. atualizar `currentInstalledVersion`;
13. sair de manutencao;
14. fechar `UpdateExecution`.

## 6.3. Fluxo detalhado por etapa

### Etapa 1. Detectar versao atual

- Objetivo: saber exatamente o ponto de partida.
- O sistema faz sozinho: le `package.json`, `phase2 baseline`, `system-version manifest` e registro persistido.
- O usuario informa: nada.
- Validacoes: versao persistida e versao do build nao podem divergir sem explicacao.
- Erros possiveis: versao atual ausente, drift entre build e banco.

### Etapa 2. Ler release/manifest alvo

- Objetivo: entender o que a release exige.
- O sistema faz sozinho: le um manifest embarcado no build.
- O usuario informa: nada.
- Validacoes: integridade do manifest, compatibilidade de app/schema.
- Erros possiveis: manifest ausente, release invalida.

### Etapa 3. Compatibilidade

- Objetivo: bloquear update inseguro cedo.
- O sistema faz sozinho: verifica `minSupportedFrom`, migrations irreversiveis marcadas, prerequisitos de env e storage.
- O usuario informa: confirmacao apenas se todos os gates passarem.
- Erros possiveis: salto de versao nao suportado, segredo novo ausente, schema inesperado.

### Etapa 4. Avisos e backup

- Objetivo: tornar o risco explicito.
- O sistema faz sozinho: mostra o que sera alterado e se backup logico e recomendado ou obrigatorio.
- O usuario informa: confirmacao do backup quando exigido.
- Erros possiveis: tentativa de seguir sem backup em release que o exige.

### Etapa 5. Modo manutencao

- Objetivo: reduzir risco de escrita concorrente.
- O sistema faz sozinho: ativa lock de manutencao e exibe pagina de indisponibilidade controlada.
- O usuario informa: nada.
- Validacoes: apenas super admin com permissao alta pode acionar/desativar.
- Erros possiveis: manutencao ja ativa por outra sessao.

### Etapa 6. Migrations e tarefas

- Objetivo: aplicar a evolucao necessaria.
- O sistema faz sozinho:
  - roda migrations;
  - executa tarefas pos-update idempotentes;
  - aplica seed aditiva se declarada;
  - registra progresso passo a passo.
- O usuario informa: nada.
- Erros possiveis: migration falhou, task pos-update falhou, perda de conexao.

### Etapa 7. Validacao pos-update

- Objetivo: garantir que a baseline continua integra.
- O sistema faz sozinho:
  - roda checks de banco;
  - valida seed base;
  - chama `/api/health`;
  - valida readiness minima da release.
- O usuario informa: nada.
- Erros possiveis: health degradado, drift de seed, falha em dependencia externa exigida.

### Etapa 8. Saida segura

- Objetivo: concluir ou bloquear com seguranca.
- O sistema faz sozinho:
  - se tudo passou, marca update como `SUCCEEDED` e desliga manutencao;
  - se algo falhou, marca `FAILED`, mantem manutencao ou entra em `REPAIR` conforme politica.
- O usuario informa: eventualmente escolha de recovery guiado.
- Erros possiveis: sistema apto apenas para reparo manual.

## 6.4. Limites do auto-update em ambientes hospedados

O atualizador nao deve assumir que consegue:

- publicar novo build no provedor;
- escrever segredos em painel Netlify, Vercel ou outro host;
- criar banco/usuario em provedor gerenciado;
- manipular DNS/SSL;
- executar rollback universal do banco;
- trocar artefato de container ou imagem em qualquer ambiente.

Em hosts assim, o PetOS deve operar como atualizador assistido, nao como deploy engine.

## 6.5. Quando exigir intervencao humana

Exigir intervencao humana quando houver:

- versao fora da janela suportada;
- banco inacessivel;
- prerequisito externo ausente;
- necessidade de backup fora do controle do app;
- variavel nova obrigatoria nao configurada;
- falha parcial de migration;
- drift entre build instalado e estado persistido;
- ambiente degradado antes do update.

## 7. Modelo de dados necessario

Novas estruturas recomendadas:

### 7.1. Persistir no banco

- `SystemInstallations`
  - estado atual da instalacao
  - timestamps
  - lock de instalacao
  - versao instalada inicial
- `InstallationExecutions`
  - execucoes do wizard
  - status por etapa
  - operador responsavel
  - resumo do resultado
- `SystemVersions`
  - versao atual instalada
  - versao anterior
  - manifest hash
  - data de ativacao
- `UpdateExecutions`
  - versao origem
  - versao alvo
  - status
  - iniciou em
  - finalizou em
  - operador
  - modo manual ou semiautomatico
- `UpdateExecutionSteps`
  - passo
  - status
  - duracao
  - erro resumido
  - payload nao sensivel
- `SystemMaintenanceLocks`
  - ativo/inativo
  - motivo
  - iniciado por
  - expira em
- `RecoveryIncidents`
  - tipo
  - severidade
  - ambiente afetado
  - resolucao
- `ConfigurationSnapshots`
  - snapshot nao sensivel de configuracoes estruturais e flags

### 7.2. Nao persistir no banco

Nao deve ir para o banco:

- segredos brutos;
- credenciais de provedor;
- senha do banco;
- chaves de API;
- tokens temporarios em claro.

Se algum token de sessao/setup precisar ser persistido, armazenar apenas:

- hash;
- expiracao;
- escopo;
- origem;
- metadados de uso.

### 7.3. Reuso do que ja existe

Reaproveitar:

- `LogsAuditoria` para trilha sensivel;
- `ConfiguracoesUnidade` para defaults iniciais;
- `EventosIntegracao` apenas quando houver interacao externa relevante do update;
- readiness checks existentes como base do preflight.

## 8. Arquitetura tecnica recomendada

### 8.1. Modulos novos

- `features/installer/`
- `features/updater/`
- `features/maintenance/`
- `features/recovery/`
- `server/versioning/`
- `server/bootstrap/`
- `server/readiness/` expandido

### 8.2. Componentes principais

#### Installer preflight

- route handler server-side;
- executa validacoes de ambiente;
- retorna diagnostico estruturado;
- nao altera estado critico.

#### Installer wizard

- UI guiada no App Router;
- cada etapa com schema Zod proprio;
- salva progresso parcial nao sensivel;
- exige `setupSession` curta e rotacionavel.

#### Installer finalize

- endpoint server-side exclusivo;
- executa transicoes `NOT_INSTALLED -> INSTALLING -> INSTALLED`;
- usa transacoes Prisma por etapa;
- escreve auditoria.

#### Updater preflight

- compara versao atual e alvo;
- valida contratos novos;
- verifica migrations e prerequisitos;
- produz plano de update antes da execucao.

#### Updater execution engine

- pequeno orquestrador server-side;
- passos explicitos, idempotentes e reentrantes quando seguro;
- estado persistido por `UpdateExecution`.

#### Maintenance mode

- middleware/controlador que bloqueia acessos nao permitidos;
- exibe pagina de manutencao para usuarios comuns;
- permite acesso restrito a operadores autorizados.

#### Repair/recovery mode

- fluxo separado do update;
- mostra incidente atual;
- oferece passos seguros de reparo;
- impede que o sistema volte ao modo normal sem readiness minima.

### 8.3. Coerencia com a arquitetura atual

Esta proposta segue a arquitetura atual do projeto:

- Next.js App Router para UI e Route Handlers;
- Zod para contratos dos passos;
- Prisma como camada oficial de persistencia;
- RBAC server-side;
- storage externo para binarios;
- logs estruturados e auditoria como base de observabilidade.

## 9. Seguranca

## 9.1. Como evitar rota publica de instalacao permanente

- gating por env, por exemplo `INSTALLER_ENABLED=true` apenas no bootstrap;
- bloqueio automatico apos `INSTALLED`;
- acesso adicional por token temporario de setup;
- invalidacao imediata desse token ao concluir ou falhar definitivamente;
- opcionalmente restringir por host/origem esperados.

## 9.2. Como evitar reinstalacao acidental

- detectar seed/base valida existente;
- manter `installation lock` persistido;
- exigir modo `REPAIR` ou `RESET` explicito para qualquer reentrada;
- nunca mostrar CTA de instalacao se o sistema ja estiver instalado.

## 9.3. Como evitar update sem autorizacao

- update apenas para usuarios com permissao administrativa alta;
- confirmacao secundaria;
- `maintenance lock` e `update lock`;
- auditoria completa de quem iniciou, aprovou, executou e finalizou.

## 9.4. Como evitar update parcial sem recuperacao

- preflight duro antes da execucao;
- passos idempotentes;
- estado persistido por passo;
- trava de manutencao durante update;
- entrada automatica em `REPAIR` quando a saida segura nao for possivel.

## 9.5. Como evitar exposicao de segredos

- nunca renderizar segredos completos de volta na UI;
- armazenar apenas referencias ou hashes quando necessario;
- usar mascaramento em logs;
- nunca persistir senha do banco ou chaves em tabelas de auditoria.

## 9.6. Como evitar bypass por usuario comum

- instalador com gating proprio;
- updater sob RBAC forte;
- middleware para negar acesso sem sessao/papel;
- validacoes server-side independentes da UI.

## 9.7. Desligamento automatico do modo instalacao

A instalacao final deve:

- remover flag temporaria quando o ambiente permitir;
- no minimo persistir lock no banco;
- negar rota mesmo se o frontend ainda tentar acessa-la;
- exigir reativacao manual consciente para qualquer uso futuro.

## 10. Estrategia de atualizacao

### 10.1. Como saber a versao atual

Combinar:

- versao do build em arquivo/manifest embarcado;
- registro persistido em `SystemVersions`;
- validacao de consistencia na subida.

### 10.2. Como saber a versao alvo

Usar um manifest de release embarcado com:

- `version`;
- `releaseDate`;
- `minSupportedFrom`;
- `requiresMaintenance`;
- `requiresBackup`;
- `postUpdateTasks`;
- `seedPolicy`;
- `newRequiredEnvKeys`;
- `breakingNotes`.

### 10.3. Politica de compatibilidade

Regras recomendadas:

- suportar apenas upgrades aprovados de `from -> to`;
- bloquear saltos nao homologados;
- marcar migrations irreversiveis;
- exigir backup quando a release marcar alto risco.

### 10.4. Migrations seguras

- pequenas e revisaveis;
- executadas por `prisma migrate deploy`;
- sem logica oculta fora do fluxo de release;
- acompanhadas de `postUpdateTasks` quando precisarem de backfill ou fixup.

### 10.5. Scripts pos-update

Devem ser:

- idempotentes;
- explicitos no manifest;
- auditaveis;
- bloqueados se falharem.

### 10.6. Seed em update

So atualizar seed em producao quando for:

- adicao de permissoes;
- bootstrap de configuracao nova;
- dados base estritamente necessarios;
- operacao idempotente.

Nunca usar seed de update para:

- sobrescrever dados do cliente;
- reconfigurar negocio silenciosamente;
- preencher massa de teste.

### 10.7. Checks antes e depois

Antes:

- banco acessivel;
- env completo;
- versao suportada;
- manifest valido;
- backup confirmado quando exigido.

Depois:

- migrations aplicadas;
- seed base coerente;
- `/api/health` em `200`;
- checks estruturais essenciais;
- manutencao desligada apenas se tudo estiver verde.

### 10.8. Quando bloquear a atualizacao

Bloquear se:

- faltar segredo obrigatorio;
- banco estiver degradado;
- houver divergencia grave de versao;
- backup obrigatorio nao tiver sido confirmado;
- post-update critico falhar;
- health continuar `503`.

## 11. UX e interface

### 11.1. Instalador

Recomendacoes:

- layout em steps com barra lateral de progresso;
- cards claros com status `Pronto`, `Atencao`, `Bloqueante`;
- linguagem simples para leigos;
- painel tecnico recolhivel para diagnostico;
- resumo final com proximos passos.

### 11.2. Atualizador

Recomendacoes:

- dashboard curto com `Versao atual`, `Versao alvo`, `Risco`, `Impacto`;
- comparativo claro do que muda;
- aviso visivel quando houver manutencao;
- logs por etapa com timestamps;
- CTA principal unico: `Validar update` e depois `Aplicar update`.

### 11.3. Modo manutencao

Recomendacoes:

- pagina simples e profissional;
- explicar que o sistema esta em manutencao programada;
- nao expor stack traces;
- mostrar estimativa apenas se conhecida;
- permitir acesso tecnico somente a operador autenticado e autorizado.

### 11.4. Modo reparo

Recomendacoes:

- explicar que houve falha controlada;
- mostrar o ultimo passo bem-sucedido;
- oferecer `Revalidar ambiente`, `Retentar etapa`, `Baixar diagnostico`;
- separar claramente usuario comum de operador tecnico.

## 12. Escopo por etapas de implementacao

### Bloco A. Preflight, estado de instalacao e locks

- Objetivo: criar a base segura para installer/update.
- Dependencias: schema novo, env gating, readiness expandido.
- Riscos: expor rota cedo demais, confundir estado local com estado persistido.
- Criterio de conclusao: sistema detecta `not installed`, `installed`, `maintenance`, `updating` e bloqueia reentrada indevida.

### Bloco B. Wizard de setup inicial

- Objetivo: entregar o fluxo de instalacao guiada.
- Dependencias: Bloco A.
- Riscos: UX fragil, validacoes incompletas.
- Criterio de conclusao: instalacao inicial completa com admin, unidade base, seed e lock final.

### Bloco C. Finalize, auditoria e bloqueio do modo instalacao

- Objetivo: endurecer o fechamento do bootstrap.
- Dependencias: Bloco B.
- Riscos: lock nao persistir, rota continuar acessivel.
- Criterio de conclusao: instalador desativado apos sucesso e auditado do inicio ao fim.

### Bloco D. Maintenance mode e repair mode

- Objetivo: preparar o sistema para updates e falhas controladas.
- Dependencias: Bloco A.
- Riscos: bloquear operadores legitimos ou deixar bypass.
- Criterio de conclusao: manutencao e reparo funcionam com gating e UX dedicados.

### Bloco E. Updater core e manifest de release

- Objetivo: detectar versoes, compatibilidade e prerequisitos.
- Dependencias: Blocos A e D.
- Riscos: drift entre build e estado persistido.
- Criterio de conclusao: sistema gera plano de update antes de executar qualquer alteracao.

### Bloco F. Update execution engine, pos-migracao e recovery

- Objetivo: executar update controlado com passos auditaveis.
- Dependencias: Bloco E.
- Riscos: falha parcial, backfill nao idempotente.
- Criterio de conclusao: update semiautomatico com manutencao, validacao final e entrada em repair quando necessario.

### Bloco G. Fechamento, testes, docs e baseline

- Objetivo: estabilizar a frente nova.
- Dependencias: Blocos A a F.
- Riscos: lacunas em smoke e readiness.
- Criterio de conclusao: checks verdes, smoke controlado, docs sincronizadas e baseline propria dessa frente pronta.

## 13. O que deve ficar fora do escopo inicial

Ficam explicitamente fora do escopo inicial:

- provisionamento automatico universal de infraestrutura externa;
- criacao automatica de banco em qualquer provedor;
- escrita irrestrita de segredos em paines hospedados;
- auto-update total sem supervisao;
- rollback universal perfeito em qualquer ambiente;
- engine multi-cloud de deploy;
- orquestracao de containers/Kubernetes;
- atualizacao silenciosa sem downtime em qualquer host;
- qualquer item de Fase 3;
- qualquer expansao funcional fora do tema instalador/atualizador.

## 14. Proximo passo recomendado

O primeiro bloco a ser implementado deve ser o **Bloco A - Preflight, estado de instalacao e locks**.

### Por que ele vem primeiro

Porque ele cria a fundacao de seguranca e previsibilidade para todo o resto:

- define quando o sistema esta ou nao instalado;
- impede wizard publico permanente;
- cria gating para manutencao e update;
- prepara o modelo de dados e o readiness;
- reduz retrabalho nos blocos seguintes.

Sem esse bloco, qualquer wizard ou updater correria alto risco de virar fluxo fragil, dificil de auditar e facil de contornar.
