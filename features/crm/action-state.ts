export interface CrmRecipientLaunchState {
  status: 'idle' | 'success' | 'error'
  message?: string
  launchUrl?: string
}

export const initialCrmRecipientLaunchState: CrmRecipientLaunchState = {
  status: 'idle',
}
