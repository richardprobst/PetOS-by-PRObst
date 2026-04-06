import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PetOS Tutor',
    short_name: 'PetOS',
    description: 'Portal do tutor do PetOS com perfil, pets, agenda e notificacoes basicas.',
    start_url: '/tutor',
    scope: '/tutor',
    display: 'standalone',
    background_color: '#f8f5ef',
    theme_color: '#1f2a2a',
    lang: 'pt-BR',
    categories: ['business', 'lifestyle'],
    icons: [
      {
        src: '/icons/petos-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/petos-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
