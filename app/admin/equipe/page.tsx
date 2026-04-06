import Link from 'next/link'
import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { saveEmployeeAction } from '@/features/employees/actions'
import { listEmployees } from '@/features/employees/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface TeamPageProps {
  searchParams: Promise<{
    status?: string
    message?: string
    edit?: string
  }>
}

const profileOptions = ['Administrador', 'Recepcionista', 'Tosador'] as const
const payrollModeLabels = {
  COMMISSION_ONLY: 'Somente comissao',
  HOURLY: 'Por hora',
  MONTHLY: 'Mensal',
} as const

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const actor = await requireInternalAreaUser('/admin/equipe')
  assertPermission(actor, 'funcionario.visualizar')
  const params = await searchParams
  const employees = await listEmployees(actor, {})
  const selectedEmployee = params.edit
    ? employees.find((employee) => employee.userId === params.edit)
    : undefined

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Equipe"
        title="Profissionais internos usados por agenda, comissao e operacao."
        description="A Fase 2 amplia a base da equipe com modo de folha, valor base e jornada padrao por profissional, sem virar modulo amplo de RH."
        actions={
          selectedEmployee ? (
            <Link className="ui-button-secondary" href="/admin/equipe">
              Novo profissional
            </Link>
          ) : null
        }
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form action={saveEmployeeAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <input name="employeeUserId" type="hidden" value={selectedEmployee?.userId ?? ''} />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nome">
              <input className="ui-input" defaultValue={selectedEmployee?.user.name ?? ''} name="name" />
            </FormField>
            <FormField label="E-mail">
              <input
                className="ui-input"
                defaultValue={selectedEmployee?.user.email ?? ''}
                name="email"
                type="email"
              />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Senha inicial ou nova senha">
              <input className="ui-input" name="password" type="password" />
            </FormField>
            <FormField label="Telefone">
              <input className="ui-input" defaultValue={selectedEmployee?.user.phone ?? ''} name="phone" />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Cargo">
              <input className="ui-input" defaultValue={selectedEmployee?.role ?? ''} name="role" />
            </FormField>
            <FormField label="Especialidade">
              <input className="ui-input" defaultValue={selectedEmployee?.specialty ?? ''} name="specialty" />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Comissao (%)">
              <input
                className="ui-input"
                defaultValue={
                  selectedEmployee?.commissionPercentage
                    ? Number(selectedEmployee.commissionPercentage)
                    : ''
                }
                name="commissionPercentage"
              />
            </FormField>
            <FormField label="Modo de folha">
              <select
                className="ui-input"
                defaultValue={selectedEmployee?.payrollMode ?? 'MONTHLY'}
                name="payrollMode"
              >
                <option value="MONTHLY">Mensal</option>
                <option value="HOURLY">Por hora</option>
                <option value="COMMISSION_ONLY">Somente comissao</option>
              </select>
            </FormField>
            <FormField label="Jornada padrao (min)">
              <input
                className="ui-input"
                defaultValue={selectedEmployee?.defaultDailyWorkMinutes ?? 480}
                name="defaultDailyWorkMinutes"
              />
            </FormField>
          </div>
          <FormField label="Valor base da folha">
            <input
              className="ui-input"
              defaultValue={
                selectedEmployee?.baseCompensationAmount
                  ? Number(selectedEmployee.baseCompensationAmount)
                  : ''
              }
              name="baseCompensationAmount"
            />
          </FormField>
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-[color:var(--foreground)]">Perfis de acesso</legend>
            <div className="grid gap-2 md:grid-cols-3">
              {profileOptions.map((profileName) => {
                const checked =
                  selectedEmployee?.user.profiles.some((profile) => profile.profile.name === profileName) ??
                  profileName === 'Tosador'

                return (
                  <label
                    className="flex items-center gap-3 rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm"
                    key={profileName}
                  >
                    <input defaultChecked={checked} name="profileNames" type="checkbox" value={profileName} />
                    {profileName}
                  </label>
                )
              })}
            </div>
          </fieldset>
          <label className="flex items-center gap-3 text-sm font-medium text-[color:var(--foreground)]">
            <input defaultChecked={selectedEmployee?.user.active ?? true} name="active" type="checkbox" />
            Profissional ativo
          </label>
          <button className="ui-button-primary" type="submit">
            {selectedEmployee ? 'Salvar profissional' : 'Criar profissional'}
          </button>
        </form>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <DataTable
            columns={[
              {
                id: 'name',
                header: 'Profissional',
                render: (employee) => (
                  <div>
                    <p className="font-semibold text-[color:var(--foreground)]">{employee.user.name}</p>
                    <p>{employee.role}</p>
                  </div>
                ),
              },
              {
                id: 'profiles',
                header: 'Perfis',
                render: (employee) =>
                  employee.user.profiles.map((profile) => profile.profile.name).join(', '),
              },
              {
                id: 'commission',
                header: 'Comissao',
                render: (employee) =>
                  employee.commissionPercentage ? `${employee.commissionPercentage}%` : 'Nao definida',
              },
              {
                id: 'payroll',
                header: 'Folha',
                render: (employee) => (
                  <div>
                    <p>{payrollModeLabels[employee.payrollMode]}</p>
                    <p>
                      Base:{' '}
                      {employee.baseCompensationAmount
                        ? `R$ ${Number(employee.baseCompensationAmount).toFixed(2)}`
                        : 'Nao definida'}
                    </p>
                  </div>
                ),
              },
              {
                id: 'action',
                header: 'Acao',
                render: (employee) => (
                  <Link
                    className="ui-link text-sm font-semibold"
                    href={{ pathname: '/admin/equipe', query: { edit: employee.userId } }}
                  >
                    Editar
                  </Link>
                ),
              },
            ]}
            rows={employees}
          />
        </div>
      </section>
    </div>
  )
}
