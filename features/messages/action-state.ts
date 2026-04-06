export interface ManualMessageLaunchState {
  status: 'idle' | 'success' | 'error'
  message?: string
  launchUrl?: string
}

export const initialManualMessageLaunchState: ManualMessageLaunchState = {
  status: 'idle',
}
