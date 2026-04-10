import type {
  BrandAssetRole,
  DomainBindingStatus,
  DomainSurface,
} from '@prisma/client'

export const brandFontPresets = ['MANROPE', 'SYSTEM', 'SERIF', 'FRIENDLY'] as const
export type BrandFontPreset = (typeof brandFontPresets)[number]

export interface BrandThemeConfig {
  backgroundColor: string
  backgroundStrongColor: string
  fontPreset: BrandFontPreset
  foregroundColor: string
  mutedColor: string
  primaryColor: string
  radiusScale: 'BALANCED' | 'SOFT' | 'SHARP'
  secondaryColor: string
  surfaceColor: string
}

export interface BrandResolvedAssets {
  documentFooterUrl: string | null
  documentHeaderUrl: string | null
  emailHeaderUrl: string | null
  faviconUrl: string | null
  loginImageUrl: string | null
  logoMonochromeUrl: string | null
  logoPrimaryUrl: string | null
  ogImageUrl: string | null
  pwaIcon192Url: string | null
  pwaIcon512Url: string | null
}

export interface BrandRuntimeSnapshot {
  assets: BrandResolvedAssets
  copy: {
    emailFooterText: string
    emailSignatureName: string
    loginDescription: string
    loginHeadline: string
    publicTagline: string
    reportCardFooterText: string
    reportCardHeaderText: string
    tutorDescription: string
    tutorHeadline: string
  }
  domain: {
    hostname: string | null
    source: 'DEFAULT' | 'DOMAIN_BINDING' | 'UNIT_OVERRIDE'
    status: DomainBindingStatus | 'DEFAULT'
    surface: DomainSurface | 'PUBLIC_SITE'
    unitId: string | null
  }
  identity: {
    legalName: string
    primaryDomain: string | null
    publicName: string
    shortName: string
    supportEmail: string | null
    supportPhone: string | null
  }
  source: 'DEFAULT' | 'LIVE' | 'PUBLISHED'
  theme: BrandThemeConfig
}

export const defaultBrandTheme: BrandThemeConfig = {
  backgroundColor: '#f4f0e8',
  backgroundStrongColor: '#f8f5ef',
  fontPreset: 'MANROPE',
  foregroundColor: '#1f2a2a',
  mutedColor: '#4f5c5c',
  primaryColor: '#1f7a72',
  radiusScale: 'BALANCED',
  secondaryColor: '#b8751a',
  surfaceColor: '#fffdf9',
}

export const defaultBrandAssets: BrandResolvedAssets = {
  documentFooterUrl: null,
  documentHeaderUrl: null,
  emailHeaderUrl: null,
  faviconUrl: '/icons/petos-192.svg',
  loginImageUrl: null,
  logoMonochromeUrl: '/icons/petos-192.svg',
  logoPrimaryUrl: '/icons/petos-192.svg',
  ogImageUrl: null,
  pwaIcon192Url: '/icons/petos-192.svg',
  pwaIcon512Url: '/icons/petos-512.svg',
}

export const brandAssetRoleLabels: Record<BrandAssetRole, string> = {
  DOCUMENT_FOOTER: 'Rodape de documento',
  DOCUMENT_HEADER: 'Cabecalho de documento',
  EMAIL_HEADER: 'Cabecalho de e-mail',
  FAVICON: 'Favicon',
  LOGIN_IMAGE: 'Imagem de login',
  LOGO_MONO: 'Logo monocromatico',
  LOGO_PRIMARY: 'Logo principal',
  OG_IMAGE: 'Imagem social',
  PWA_ICON_192: 'Icone PWA 192',
  PWA_ICON_512: 'Icone PWA 512',
}

export const domainSurfaceLabels: Record<DomainSurface, string> = {
  ADMIN: 'Admin',
  AUTH: 'Autenticacao',
  PUBLIC_SITE: 'Publico',
  TUTOR: 'Tutor',
}

export const domainBindingStatusLabels: Record<DomainBindingStatus, string> = {
  DISABLED: 'Desabilitado',
  PENDING: 'Pendente',
  VERIFIED: 'Verificado',
}

export function buildDefaultBrandRuntime(): BrandRuntimeSnapshot {
  return {
    assets: { ...defaultBrandAssets },
    copy: {
      emailFooterText: 'Atendimento oficial da plataforma PetOS.',
      emailSignatureName: 'Equipe PetOS',
      loginDescription:
        'Acesso protegido com validacao server-side, contexto seguro e operacao auditavel.',
      loginHeadline: 'Acesso oficial do PetOS',
      publicTagline:
        'Operacao, agenda, financeiro, portal do tutor e modulos assistivos em uma base unica.',
      reportCardFooterText: 'Report card gerado na plataforma PetOS.',
      reportCardHeaderText: 'Resumo operacional do atendimento',
      tutorDescription:
        'Portal protegido para acompanhar pets, atendimentos, documentos e solicitacoes.',
      tutorHeadline: 'Portal do tutor',
    },
    domain: {
      hostname: null,
      source: 'DEFAULT',
      status: 'DEFAULT',
      surface: 'PUBLIC_SITE',
      unitId: null,
    },
    identity: {
      legalName: 'PetOS',
      primaryDomain: null,
      publicName: 'PetOS',
      shortName: 'PetOS',
      supportEmail: null,
      supportPhone: null,
    },
    source: 'DEFAULT',
    theme: { ...defaultBrandTheme },
  }
}
