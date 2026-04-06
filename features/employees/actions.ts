'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createEmployeeInputSchema,
  updateEmployeeInputSchema,
} from '@/features/employees/schemas'
import { createEmployee, updateEmployee } from '@/features/employees/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { buildActionRedirectPath, getActionErrorMessage } from '@/server/http/action-feedback'
import { getFormValueList, hasCheckedFormValue, getOptionalFormValue } from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const redirectPath = '/admin/equipe'

export async function saveEmployeeAction(formData: FormData) {
  const actor = await requireInternalAreaUser(redirectPath)
  assertPermission(actor, 'funcionario.editar')
  enforceMutationRateLimit(actor, 'admin.employees.form')

  const employeeUserId = getOptionalFormValue(formData, 'employeeUserId')
  const profileNames = getFormValueList(formData, 'profileNames')
  let destination: ReturnType<typeof buildActionRedirectPath>

  try {
    if (employeeUserId) {
      const input = updateEmployeeInputSchema.parse({
        name: getOptionalFormValue(formData, 'name'),
        email: getOptionalFormValue(formData, 'email'),
        password: getOptionalFormValue(formData, 'password'),
        phone: getOptionalFormValue(formData, 'phone'),
        role: getOptionalFormValue(formData, 'role'),
        specialty: getOptionalFormValue(formData, 'specialty'),
        commissionPercentage: getOptionalFormValue(formData, 'commissionPercentage'),
        payrollMode: getOptionalFormValue(formData, 'payrollMode'),
        baseCompensationAmount: getOptionalFormValue(formData, 'baseCompensationAmount'),
        defaultDailyWorkMinutes: getOptionalFormValue(formData, 'defaultDailyWorkMinutes'),
        profileNames: profileNames.length > 0 ? profileNames : undefined,
        active: hasCheckedFormValue(formData, 'active'),
      })

      await updateEmployee(actor, employeeUserId, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'updated')
    } else {
      const input = createEmployeeInputSchema.parse({
        name: getOptionalFormValue(formData, 'name'),
        email: getOptionalFormValue(formData, 'email'),
        password: getOptionalFormValue(formData, 'password'),
        phone: getOptionalFormValue(formData, 'phone'),
        role: getOptionalFormValue(formData, 'role'),
        specialty: getOptionalFormValue(formData, 'specialty'),
        commissionPercentage: getOptionalFormValue(formData, 'commissionPercentage'),
        payrollMode: getOptionalFormValue(formData, 'payrollMode'),
        baseCompensationAmount: getOptionalFormValue(formData, 'baseCompensationAmount'),
        defaultDailyWorkMinutes: getOptionalFormValue(formData, 'defaultDailyWorkMinutes'),
        profileNames: profileNames.length > 0 ? profileNames : undefined,
        active: hasCheckedFormValue(formData, 'active'),
      })

      await createEmployee(actor, input)
      revalidatePath(redirectPath)
      destination = buildActionRedirectPath(redirectPath, 'created')
    }
  } catch (error) {
    destination = buildActionRedirectPath(redirectPath, 'error', getActionErrorMessage(error))
  }

  redirect(destination)
}
