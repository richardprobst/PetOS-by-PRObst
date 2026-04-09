import type { Prisma, User } from '@prisma/client'
import type { Environment } from '@/server/env'
import { hashPassword } from '@/server/auth/password'
import {
  phase2CrmPermissions,
  phase2FoundationPermissions,
  phase2FoundationUnitSettings,
  phase2PosInventoryPermissions,
  phase2TeamOperationsPermissions,
  phase2TutorPortalPermissions,
} from '@/server/foundation/phase2'

type BootstrapDatabaseClient = Pick<
  Prisma.TransactionClient,
  | 'accessProfile'
  | 'client'
  | 'clientCommunicationPreference'
  | 'messageTemplate'
  | 'operationalStatus'
  | 'permission'
  | 'profilePermission'
  | 'unit'
  | 'unitSetting'
  | 'user'
  | 'userProfile'
>

export interface InitialUnitBootstrapInput {
  companyName: string
  unitEmail?: string
  unitName: string
  unitPhone?: string
  unitTimezone: string
}

export interface InitialAdministratorBootstrapInput {
  email: string
  name: string
  password: string
}

const operationalStatuses = [
  {
    description: 'Agendamento criado e aguardando confirmacao operacional.',
    displayOrder: 10,
    id: 'SCHEDULED',
    name: 'Agendado',
  },
  {
    description: 'Agendamento confirmado com o cliente.',
    displayOrder: 20,
    id: 'CONFIRMED',
    name: 'Confirmado',
  },
  {
    description: 'Pet recebido e triagem inicial concluida.',
    displayOrder: 30,
    id: 'CHECK_IN',
    name: 'Check-in',
  },
  {
    description: 'Servico em execucao pela equipe.',
    displayOrder: 40,
    id: 'IN_SERVICE',
    name: 'Em Atendimento',
  },
  {
    description: 'Atendimento concluido e aguardando retirada do pet.',
    displayOrder: 50,
    id: 'READY_FOR_PICKUP',
    name: 'Pronto para Retirada',
  },
  {
    description: 'Fluxo operacional encerrado.',
    displayOrder: 60,
    id: 'COMPLETED',
    name: 'Concluido',
  },
  {
    description: 'Agendamento cancelado antes da execucao do servico.',
    displayOrder: 70,
    id: 'CANCELED',
    name: 'Cancelado',
  },
  {
    description: 'Cliente nao compareceu dentro da tolerancia definida.',
    displayOrder: 80,
    id: 'NO_SHOW',
    name: 'No-Show',
  },
] as const

const mvpPermissions = [
  {
    description: 'Permite consultar agendamentos administrativos.',
    name: 'agendamento.visualizar',
  },
  {
    description: 'Permite criar agendamentos administrativos.',
    name: 'agendamento.criar',
  },
  {
    description: 'Permite editar agendamentos existentes.',
    name: 'agendamento.editar',
  },
  {
    description: 'Permite cancelar agendamentos.',
    name: 'agendamento.cancelar',
  },
  {
    description: 'Permite alterar o status operacional do atendimento.',
    name: 'agendamento.atualizar_status',
  },
  {
    description: 'Permite registrar o check-in operacional do atendimento.',
    name: 'checkin.executar',
  },
  {
    description: 'Permite consultar dados de clientes no administrativo.',
    name: 'cliente.visualizar',
  },
  {
    description: 'Permite criar e editar clientes no administrativo.',
    name: 'cliente.editar',
  },
  {
    description: 'Permite ao tutor consultar apenas o proprio cadastro.',
    name: 'cliente.visualizar_proprio',
  },
  {
    description: 'Permite ao tutor atualizar apenas o proprio cadastro.',
    name: 'cliente.editar_proprio',
  },
  {
    description: 'Permite consultar pets vinculados a operacao.',
    name: 'pet.visualizar',
  },
  {
    description: 'Permite criar e editar pets.',
    name: 'pet.editar',
  },
  {
    description: 'Permite ao tutor consultar apenas os proprios pets.',
    name: 'pet.visualizar_proprio',
  },
  {
    description: 'Permite consultar o catalogo de servicos.',
    name: 'servico.visualizar',
  },
  {
    description: 'Permite criar e editar servicos.',
    name: 'servico.editar',
  },
  {
    description: 'Permite consultar profissionais e equipe operacional.',
    name: 'funcionario.visualizar',
  },
  {
    description: 'Permite criar e editar profissionais e equipe operacional.',
    name: 'funcionario.editar',
  },
  {
    description: 'Permite consultar lancamentos financeiros.',
    name: 'financeiro.visualizar',
  },
  {
    description: 'Permite registrar receitas, despesas e ajustes.',
    name: 'financeiro.lancar',
  },
  {
    description: 'Permite consultar dados de comissao.',
    name: 'comissao.visualizar',
  },
  {
    description: 'Permite consultar templates de comunicacao.',
    name: 'template_mensagem.visualizar',
  },
  {
    description: 'Permite criar e editar templates de comunicacao.',
    name: 'template_mensagem.editar',
  },
  {
    description: 'Permite consultar report cards no administrativo.',
    name: 'report_card.visualizar',
  },
  {
    description: 'Permite criar e editar report cards.',
    name: 'report_card.editar',
  },
  {
    description: 'Permite consultar analises assistivas de imagem no administrativo.',
    name: 'ai.imagem.visualizar',
  },
  {
    description: 'Permite disparar analises assistivas de imagem no administrativo.',
    name: 'ai.imagem.executar',
  },
  {
    description: 'Permite revisar e registrar decisao humana sobre analises de imagem.',
    name: 'ai.imagem.revisar',
  },
  {
    description: 'Permite consultar snapshots e recomendacoes preditivas no administrativo.',
    name: 'ai.insights.visualizar',
  },
  {
    description: 'Permite gerar snapshots preditivos controlados no administrativo.',
    name: 'ai.insights.executar',
  },
  {
    description: 'Permite registrar feedback operacional sobre utilidade do insight.',
    name: 'ai.insights.feedback',
  },
  {
    description: 'Permite ao tutor consultar apenas os proprios report cards.',
    name: 'report_card.visualizar_proprio',
  },
  {
    description: 'Permite consultar configuracoes administrativas.',
    name: 'configuracao.visualizar',
  },
  {
    description: 'Permite editar configuracoes administrativas.',
    name: 'configuracao.editar',
  },
  {
    description: 'Permite acesso as areas do portal do tutor.',
    name: 'portal_tutor.acessar',
  },
  {
    description: 'Permite ao tutor consultar os proprios agendamentos.',
    name: 'agendamento.visualizar_proprio',
  },
  {
    description: 'Permite ao tutor solicitar ou criar o proprio agendamento.',
    name: 'agendamento.criar_proprio',
  },
] as const

const systemOperationPermissions = [
  {
    description: 'Permite consultar o estado de runtime, manutencao, repair e update do sistema.',
    name: 'sistema.runtime.visualizar',
  },
  {
    description: 'Permite entrar e sair do modo de manutencao do sistema.',
    name: 'sistema.manutencao.operar',
  },
  {
    description: 'Permite abrir e resolver incidentes de repair do sistema.',
    name: 'sistema.reparo.operar',
  },
  {
    description: 'Permite preparar e executar updates controlados do sistema.',
    name: 'sistema.update.operar',
  },
] as const

const permissions = [
  ...mvpPermissions,
  ...systemOperationPermissions,
  ...phase2FoundationPermissions,
  ...phase2TutorPortalPermissions,
  ...phase2CrmPermissions,
  ...phase2PosInventoryPermissions,
  ...phase2TeamOperationsPermissions,
] as const

const profiles = [
  {
    description: 'Acesso administrativo amplo ao MVP.',
    name: 'Administrador',
    permissions: permissions.map((permission) => permission.name),
  },
  {
    description: 'Opera agenda, cadastro e comunicacao manual do MVP.',
    name: 'Recepcionista',
    permissions: [
      'agendamento.visualizar',
      'agendamento.criar',
      'agendamento.editar',
      'agendamento.cancelar',
      'agendamento.atualizar_status',
      'agenda.capacidade.visualizar',
      'agenda.capacidade.editar',
      'agenda.bloqueio.visualizar',
      'agenda.bloqueio.editar',
      'agenda.waitlist.visualizar',
      'agenda.waitlist.editar',
      'agenda.taxi_dog.visualizar',
      'agenda.taxi_dog.editar',
      'checkin.executar',
      'cliente.visualizar',
      'cliente.editar',
      'pet.visualizar',
      'pet.editar',
      'servico.visualizar',
      'funcionario.visualizar',
      'documento.visualizar',
      'documento.editar',
      'documento.assinar',
      'midia.visualizar',
      'midia.editar',
      'produto.visualizar',
      'estoque.visualizar',
      'pdv.visualizar',
      'pdv.operar',
      'sistema.runtime.visualizar',
      'equipe.escala.visualizar',
      'equipe.escala.editar',
      'equipe.ponto.visualizar',
      'equipe.ponto.editar',
      'equipe.folha.visualizar',
      'template_mensagem.visualizar',
      'template_mensagem.editar',
      'crm.preferencia_contato.visualizar',
      'crm.preferencia_contato.editar',
      'crm.campanha.visualizar',
      'crm.campanha.editar',
        'crm.campanha.executar',
        'report_card.visualizar',
        'ai.imagem.visualizar',
        'ai.imagem.executar',
        'ai.insights.visualizar',
        'ai.insights.executar',
        'ai.insights.feedback',
      ],
    },
  {
    description: 'Atua na execucao do atendimento e no registro operacional.',
    name: 'Tosador',
    permissions: [
      'agendamento.visualizar',
      'agendamento.atualizar_status',
      'agenda.capacidade.visualizar',
      'agenda.bloqueio.visualizar',
      'agenda.waitlist.visualizar',
      'agenda.taxi_dog.visualizar',
      'cliente.visualizar',
      'pet.visualizar',
      'produto.visualizar',
      'estoque.visualizar',
      'equipe.escala.visualizar',
      'equipe.ponto.visualizar',
      'documento.visualizar',
      'midia.visualizar',
      'midia.editar',
      'report_card.visualizar',
      'report_card.editar',
      'ai.imagem.visualizar',
      'ai.imagem.executar',
      'ai.imagem.revisar',
    ],
  },
  {
    description: 'Acesso restrito ao portal e aos proprios dados.',
    name: 'Tutor',
    permissions: [
      'portal_tutor.acessar',
      'cliente.visualizar_proprio',
      'cliente.editar_proprio',
      'pet.visualizar_proprio',
      'agendamento.visualizar_proprio',
      'agendamento.criar_proprio',
      'documento.visualizar_proprio',
      'documento.assinar_proprio',
      'midia.visualizar_propria',
      'financeiro.visualizar_proprio',
      'agenda.waitlist.visualizar_proprio',
      'agenda.waitlist.editar_proprio',
      'agenda.taxi_dog.visualizar_proprio',
      'agendamento.pre_check_in.visualizar_proprio',
      'agendamento.pre_check_in.editar_proprio',
      'report_card.visualizar_proprio',
    ],
  },
] as const

function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase()
}

function normalizeOptionalValue(value: string | undefined) {
  if (!value) {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function resolveDefaultUnitSettings(
  unitId: string,
  environment: Environment,
  input?: InitialUnitBootstrapInput,
) {
  return [
    {
      description: 'Antecedencia minima para cancelamento sem tratamento administrativo.',
      key: 'agenda.cancelamento_antecedencia_horas',
      unitId,
      value: environment.DEFAULT_CANCELLATION_WINDOW_HOURS.toString(),
    },
    {
      description: 'Antecedencia minima para reagendamento automatico no MVP.',
      key: 'agenda.reagendamento_antecedencia_horas',
      unitId,
      value: environment.DEFAULT_RESCHEDULE_WINDOW_HOURS.toString(),
    },
    {
      description: 'Tolerancia operacional para caracterizar no-show.',
      key: 'agenda.tolerancia_no_show_minutos',
      unitId,
      value: environment.DEFAULT_NO_SHOW_TOLERANCE_MINUTES.toString(),
    },
    {
      description: 'Janela, em horas, para o tutor preencher o pre-check-in antes do atendimento.',
      key: 'agenda.pre_check_in_antecedencia_horas',
      unitId,
      value: input?.unitTimezone
        ? environment.DEFAULT_PRE_CHECK_IN_WINDOW_HOURS.toString()
        : environment.DEFAULT_PRE_CHECK_IN_WINDOW_HOURS.toString(),
    },
    {
      description: 'Moeda padrao da unidade.',
      key: 'financeiro.moeda_padrao',
      unitId,
      value: environment.DEFAULT_CURRENCY,
    },
    {
      description: 'Timezone operacional padrao da unidade.',
      key: 'sistema.timezone_padrao',
      unitId,
      value: input?.unitTimezone ?? environment.DEFAULT_TIMEZONE,
    },
    {
      description: 'Nome da empresa informado no setup inicial.',
      key: 'sistema.nome_empresa',
      unitId,
      value: input?.companyName?.trim() || 'PetOS',
    },
    ...phase2FoundationUnitSettings.map((setting) => ({
      description: setting.description,
      key: setting.key,
      unitId,
      value:
        environment[setting.envVarName as keyof Environment]?.toString() ?? setting.defaultValue,
    })),
  ] as const
}

function buildDefaultMessageTemplates(unitId: string) {
  return [
    {
      availableVariables: ['cliente_nome', 'pet_nome', 'horario'],
      body: 'Oi, {{cliente_nome}}. Seu atendimento do pet {{pet_nome}} esta confirmado para {{horario}}.',
      channel: 'WHATSAPP' as const,
      id: `${unitId}-confirmacao-agendamento`,
      name: 'Confirmacao de agendamento',
      subject: null,
      unitId,
    },
    {
      availableVariables: ['cliente_nome', 'pet_nome'],
      body: 'Oi, {{cliente_nome}}. O pet {{pet_nome}} esta pronto para retirada.',
      channel: 'WHATSAPP' as const,
      id: `${unitId}-pronto-retirada`,
      name: 'Pronto para retirada',
      subject: null,
      unitId,
    },
    {
      availableVariables: ['cliente_nome', 'pet_nome', 'horario'],
      body: 'Ola, {{cliente_nome}}. Este e um lembrete do atendimento do pet {{pet_nome}} em {{horario}}.',
      channel: 'EMAIL' as const,
      id: `${unitId}-lembrete-email`,
      name: 'Lembrete por e-mail',
      subject: 'Lembrete do atendimento no PetOS',
      unitId,
    },
    {
      availableVariables: ['cliente_nome', 'pet_nome', 'ultima_visita'],
      body: 'Oi, {{cliente_nome}}. Seu atendimento com {{pet_nome}} foi concluido em {{ultima_visita}}. Se puder, deixe sua avaliacao sobre a experiencia no PetOS.',
      channel: 'WHATSAPP' as const,
      id: `${unitId}-review-booster-whatsapp`,
      name: 'Review booster WhatsApp',
      subject: null,
      unitId,
    },
    {
      availableVariables: ['cliente_nome', 'pet_nome', 'dias_inativo', 'oferta_nome'],
      body: 'Ola, {{cliente_nome}}. Faz {{dias_inativo}} dias desde a ultima visita de {{pet_nome}}. Temos uma condicao especial: {{oferta_nome}}.',
      channel: 'EMAIL' as const,
      id: `${unitId}-recuperacao-inativos-email`,
      name: 'Recuperacao de inativos por e-mail',
      subject: 'Sentimos falta de voce no PetOS',
      unitId,
    },
    {
      availableVariables: ['cliente_nome', 'pet_nome', 'oferta_nome'],
      body: 'Oi, {{cliente_nome}}. Preparamos a oferta {{oferta_nome}} para o perfil do pet {{pet_nome}}.',
      channel: 'WHATSAPP' as const,
      id: `${unitId}-oferta-por-perfil-whatsapp`,
      name: 'Oferta por perfil WhatsApp',
      subject: null,
      unitId,
    },
    {
      availableVariables: ['cliente_nome', 'pet_nome', 'ultima_visita', 'oferta_nome'],
      body: 'Oi, {{cliente_nome}}. Tudo bem com {{pet_nome}} depois do atendimento em {{ultima_visita}}? {{oferta_nome}}',
      channel: 'WHATSAPP' as const,
      id: `${unitId}-gatilho-pos-servico-whatsapp`,
      name: 'Gatilho pos-servico WhatsApp',
      subject: null,
      unitId,
    },
  ] as const
}

export async function ensureOperationalStatuses(client: BootstrapDatabaseClient) {
  for (const status of operationalStatuses) {
    await client.operationalStatus.upsert({
      where: { id: status.id },
      update: {
        description: status.description,
        displayOrder: status.displayOrder,
        name: status.name,
      },
      create: status,
    })
  }
}

export async function ensurePermissions(client: BootstrapDatabaseClient) {
  for (const permission of permissions) {
    await client.permission.upsert({
      where: { name: permission.name },
      update: {
        description: permission.description,
      },
      create: permission,
    })
  }
}

export async function ensureProfiles(client: BootstrapDatabaseClient) {
  for (const profile of profiles) {
    const accessProfile = await client.accessProfile.upsert({
      where: { name: profile.name },
      update: {
        description: profile.description,
      },
      create: {
        description: profile.description,
        name: profile.name,
      },
    })

    for (const permissionName of profile.permissions) {
      const permission = await client.permission.findUniqueOrThrow({
        where: { name: permissionName },
      })

      await client.profilePermission.upsert({
        where: {
          profileId_permissionId: {
            permissionId: permission.id,
            profileId: accessProfile.id,
          },
        },
        update: {},
        create: {
          permissionId: permission.id,
          profileId: accessProfile.id,
        },
      })
    }
  }
}

export async function ensureInitialUnit(
  client: BootstrapDatabaseClient,
  environment: Environment,
  input?: InitialUnitBootstrapInput,
) {
  const normalizedUnitEmail = normalizeOptionalValue(input?.unitEmail)
  const normalizedUnitPhone = normalizeOptionalValue(input?.unitPhone)
  const existingUnit = await client.unit.findFirst({
    orderBy: {
      createdAt: 'asc',
    },
  })

  const unit =
    existingUnit ??
    (await client.unit.create({
      data: {
        active: true,
        email: normalizedUnitEmail,
        name: input?.unitName?.trim() || 'Matriz',
        phone: normalizedUnitPhone,
      },
    }))

  if (existingUnit) {
    await client.unit.update({
      where: {
        id: unit.id,
      },
      data: {
        email: normalizedUnitEmail ?? unit.email,
        name: input?.unitName?.trim() || unit.name,
        phone: normalizedUnitPhone ?? unit.phone,
      },
    })
  }

  for (const setting of resolveDefaultUnitSettings(unit.id, environment, input)) {
    await client.unitSetting.upsert({
      where: {
        unitId_key: {
          key: setting.key,
          unitId: setting.unitId,
        },
      },
      update: {
        description: setting.description,
        value: setting.value,
      },
      create: setting,
    })
  }

  return unit
}

export async function ensureDefaultMessageTemplates(client: BootstrapDatabaseClient, unitId: string) {
  for (const template of buildDefaultMessageTemplates(unitId)) {
    await client.messageTemplate.upsert({
      where: {
        id: template.id,
      },
      update: {
        active: true,
        availableVariables: template.availableVariables,
        body: template.body,
        channel: template.channel,
        name: template.name,
        subject: template.subject,
        unitId: template.unitId,
      },
      create: {
        active: true,
        availableVariables: template.availableVariables,
        body: template.body,
        channel: template.channel,
        id: template.id,
        name: template.name,
        subject: template.subject,
        unitId: template.unitId,
      },
    })
  }
}

export async function ensureClientCommunicationPreferences(client: BootstrapDatabaseClient) {
  const clients = await client.client.findMany({
    include: {
      user: true,
    },
  })

  for (const currentClient of clients) {
    await client.clientCommunicationPreference.upsert({
      where: {
        clientId: currentClient.userId,
      },
      update: {
        emailOptIn: Boolean(currentClient.user.email),
        marketingOptIn: false,
        postServiceOptIn: true,
        reviewOptIn: true,
        source: 'seed_default',
        whatsappOptIn: Boolean(currentClient.user.phone),
      },
      create: {
        clientId: currentClient.userId,
        emailOptIn: Boolean(currentClient.user.email),
        marketingOptIn: false,
        postServiceOptIn: true,
        reviewOptIn: true,
        source: 'seed_default',
        whatsappOptIn: Boolean(currentClient.user.phone),
      },
    })
  }
}

export async function ensureInitialAdministrator(
  client: BootstrapDatabaseClient,
  unitId: string,
  input: InitialAdministratorBootstrapInput,
): Promise<User> {
  const passwordHash = await hashPassword(input.password)
  const administratorProfile = await client.accessProfile.findUniqueOrThrow({
    where: {
      name: 'Administrador',
    },
  })

  const user = await client.user.upsert({
    where: {
      email: normalizeEmailAddress(input.email),
    },
    update: {
      active: true,
      name: input.name.trim(),
      passwordHash,
      unitId,
      userType: 'ADMIN',
    },
    create: {
      active: true,
      email: normalizeEmailAddress(input.email),
      name: input.name.trim(),
      passwordHash,
      unitId,
      userType: 'ADMIN',
    },
  })

  await client.userProfile.upsert({
    where: {
      userId_profileId: {
        profileId: administratorProfile.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      profileId: administratorProfile.id,
      userId: user.id,
    },
  })

  return user
}

export async function bootstrapCorePetOS(
  client: BootstrapDatabaseClient,
  environment: Environment,
  input: {
    admin?: InitialAdministratorBootstrapInput
    includeClientCommunicationPreferences?: boolean
    unit?: InitialUnitBootstrapInput
  },
) {
  await ensureOperationalStatuses(client)
  await ensurePermissions(client)
  await ensureProfiles(client)

  const unit = await ensureInitialUnit(client, environment, input.unit)

  await ensureDefaultMessageTemplates(client, unit.id)

  const adminUser = input.admin
    ? await ensureInitialAdministrator(client, unit.id, input.admin)
    : null

  if (input.includeClientCommunicationPreferences) {
    await ensureClientCommunicationPreferences(client)
  }

  return {
    adminUser,
    unit,
  }
}
