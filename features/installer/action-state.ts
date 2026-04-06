export interface InstallerAccessState {
  status: 'idle' | 'error'
  message?: string
}

export const initialInstallerAccessState: InstallerAccessState = {
  status: 'idle',
}

export interface InstallerDraftSummary {
  admin: {
    email: string
    name: string
  }
  environment: {
    appUrl: string
    databaseHost: string
    emailMode: string
    nextAuthUrl: string
    storageMode: string
  }
  organization: {
    companyName: string
    unitEmail?: string
    unitName: string
    unitPhone?: string
    unitTimezone: string
  }
  warnings: string[]
}

export interface InstallerDraftValidationState {
  status: 'idle' | 'success' | 'error'
  message?: string
  summary?: InstallerDraftSummary
}

export const initialInstallerDraftValidationState: InstallerDraftValidationState = {
  status: 'idle',
}
