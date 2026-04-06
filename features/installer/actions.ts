'use server'

import type { Route } from 'next'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  initialInstallerAccessState,
  type InstallerAccessState,
  type InstallerDraftValidationState,
} from '@/features/installer/action-state'
import { installerBootstrapInputSchema, installerSetupDraftSchema } from '@/features/installer/schemas'
import { finalizeInstallerSetup, validateInstallerSetupDraft } from '@/features/installer/services'
import { prisma } from '@/server/db/prisma'
import { getEnv } from '@/server/env'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { getOptionalFormValue } from '@/server/http/form-data'
import {
  assertInstallerSessionAccess,
  clearInstallerSession,
  establishInstallerSession,
  verifyInstallerBootstrapToken,
} from '@/server/system/installer-session'

export async function startInstallerSessionAction(
  _previousState: InstallerAccessState = initialInstallerAccessState,
  formData: FormData,
): Promise<InstallerAccessState> {
  void _previousState
  const environment = getEnv()

  try {
    const input = installerBootstrapInputSchema.parse({
      bootstrapToken: getOptionalFormValue(formData, 'bootstrapToken'),
    })

    if (!verifyInstallerBootstrapToken(input.bootstrapToken, environment)) {
      return {
        status: 'error',
        message: 'Token de bootstrap invalido ou expirado para este ambiente.',
      }
    }

    await establishInstallerSession(environment)
    revalidatePath('/setup')
  } catch (error) {
    return {
      status: 'error',
      message: getActionErrorMessage(error),
    }
  }

  redirect('/setup')
}

export async function endInstallerSessionAction() {
  await clearInstallerSession()
  revalidatePath('/setup')
  redirect('/setup')
}

export async function validateInstallerDraftAction(
  _previousState: InstallerDraftValidationState,
  formData: FormData,
): Promise<InstallerDraftValidationState> {
  void _previousState
  try {
    const environment = getEnv()
    await assertInstallerSessionAccess(environment)
    const intent = getOptionalFormValue(formData, 'intent') ?? 'validate'

    const input = installerSetupDraftSchema.parse({
      adminEmail: getOptionalFormValue(formData, 'adminEmail'),
      adminName: getOptionalFormValue(formData, 'adminName'),
      adminPassword: getOptionalFormValue(formData, 'adminPassword'),
      adminPasswordConfirmation: getOptionalFormValue(formData, 'adminPasswordConfirmation'),
      companyName: getOptionalFormValue(formData, 'companyName'),
      unitEmail: getOptionalFormValue(formData, 'unitEmail'),
      unitName: getOptionalFormValue(formData, 'unitName'),
      unitPhone: getOptionalFormValue(formData, 'unitPhone'),
      unitTimezone: getOptionalFormValue(formData, 'unitTimezone'),
    })

    if (intent === 'finalize') {
      await finalizeInstallerSetup(prisma, input, environment)
      await clearInstallerSession()
      revalidatePath('/setup')
      redirect(
        buildActionRedirectPath(
          '/entrar' as Route,
          'created',
          'O PetOS foi instalado com sucesso. Use o admin inicial para entrar.',
        ),
      )
    }

    const summary = await validateInstallerSetupDraft(prisma, input, environment)

    return {
      status: 'success',
      message:
        'Draft inicial validado com sucesso. O proximo bloco pode usar este resumo para executar o finalize da instalacao.',
      summary,
    }
  } catch (error) {
    return {
      status: 'error',
      message: getActionErrorMessage(error),
    }
  }
}
