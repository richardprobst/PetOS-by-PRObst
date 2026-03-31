import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PetOS',
  description: 'Base inicial do sistema PetOS',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
