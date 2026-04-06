import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, Manrope } from 'next/font/google'
import './globals.css'

const sansFont = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
})

const monoFont = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  applicationName: 'PetOS',
  title: {
    default: 'PetOS',
    template: '%s | PetOS',
  },
  description: 'PetOS - operacao de pet shop com agenda, financeiro, comunicacao e portal do tutor.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'PetOS Tutor',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icons/petos-192.svg',
    apple: '/icons/petos-192.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#1f2a2a',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${sansFont.variable} ${monoFont.variable}`}>{children}</body>
    </html>
  )
}
