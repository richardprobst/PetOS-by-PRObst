import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, Manrope } from 'next/font/google'
import type { CSSProperties } from 'react'
import {
  buildBrandCssVariables,
  getBrandBodyClassName,
  resolveBrandRuntimeForCurrentRequest,
} from '@/features/branding/services'
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

export async function generateMetadata(): Promise<Metadata> {
  const runtime = await resolveBrandRuntimeForCurrentRequest('PUBLIC_SITE')

  return {
    applicationName: runtime.identity.publicName,
    title: {
      default: runtime.identity.publicName,
      template: `%s | ${runtime.identity.publicName}`,
    },
    description: runtime.copy.publicTagline,
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      title: runtime.identity.shortName,
      statusBarStyle: 'default',
    },
    icons: {
      icon: runtime.assets.faviconUrl ?? runtime.assets.logoPrimaryUrl ?? '/icons/petos-192.svg',
      apple: runtime.assets.pwaIcon192Url ?? runtime.assets.logoPrimaryUrl ?? '/icons/petos-192.svg',
    },
  }
}

export async function generateViewport(): Promise<Viewport> {
  const runtime = await resolveBrandRuntimeForCurrentRequest('PUBLIC_SITE')

  return {
    themeColor: runtime.theme.primaryColor,
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const runtime = await resolveBrandRuntimeForCurrentRequest('PUBLIC_SITE')

  return (
    <html lang="pt-BR">
      <body
        className={`${sansFont.variable} ${monoFont.variable} ${getBrandBodyClassName(runtime)}`}
        style={buildBrandCssVariables(runtime) as CSSProperties}
      >
        {children}
      </body>
    </html>
  )
}
