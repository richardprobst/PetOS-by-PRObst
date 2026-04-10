import type { MetadataRoute } from 'next'
import { resolveBrandRuntimeForCurrentRequest } from '@/features/branding/services'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const runtime = await resolveBrandRuntimeForCurrentRequest('TUTOR')

  return {
    name: `${runtime.identity.publicName} Tutor`,
    short_name: runtime.identity.shortName,
    description: runtime.copy.tutorDescription,
    start_url: '/tutor',
    scope: '/tutor',
    display: 'standalone',
    background_color: runtime.theme.backgroundStrongColor,
    theme_color: runtime.theme.primaryColor,
    lang: 'pt-BR',
    categories: ['business', 'lifestyle'],
    icons: [
      {
        src: runtime.assets.pwaIcon192Url ?? runtime.assets.logoPrimaryUrl ?? '/icons/petos-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: runtime.assets.pwaIcon512Url ?? runtime.assets.logoPrimaryUrl ?? '/icons/petos-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
