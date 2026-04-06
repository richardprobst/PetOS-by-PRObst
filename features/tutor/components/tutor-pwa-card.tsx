'use client'

import { useEffect, useState } from 'react'
import { FeedbackMessage } from '@/components/ui/feedback-message'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

export function TutorPwaCard() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => setServiceWorkerReady(true))
        .catch(() => setServiceWorkerReady(false))
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function handleInstallClick() {
    if (!installPrompt) {
      return
    }

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice

    if (choice.outcome === 'accepted') {
      setIsInstalled(true)
    }

    setInstallPrompt(null)
  }

  return (
    <div className="surface-panel rounded-[1.75rem] p-6">
      <p className="section-label">PWA do tutor</p>
      <p className="mt-4 text-lg font-semibold text-[color:var(--foreground)]">
        Base PWA pronta para a jornada ampliada do tutor.
      </p>
      <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
        O portal pode ser instalado como app leve no navegador compativel. O service worker fica
        restrito aos ativos publicos do PWA e nao cacheia rotas privadas nem APIs protegidas do tutor.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {isInstalled ? (
          <span className="ui-button-secondary">Ja instalado</span>
        ) : installPrompt ? (
          <button className="ui-button-primary" onClick={handleInstallClick} type="button">
            Instalar portal
          </button>
        ) : (
          <span className="ui-button-secondary">Use &quot;Adicionar a tela inicial&quot; no navegador</span>
        )}
        <span className="ui-button-secondary">
          {serviceWorkerReady ? 'Modo app habilitado' : 'Instalacao aguardando navegador'}
        </span>
      </div>

      <FeedbackMessage
        className="mt-5"
        description="Documentos, alertas, financeiro proprio, waitlist e pre-check-in continuam dependentes do servidor, mesmo no uso em modo app."
        title="Escopo desta fase"
        tone="info"
      />
    </div>
  )
}
