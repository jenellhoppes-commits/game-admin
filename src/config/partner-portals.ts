export type PortalKind = 'admin' | 'agent' | 'merchant'

export const PORTAL_ROLES = {
  admin: ['R_SUPER', 'R_ADMIN'],
  agent: ['R_AGENT'],
  merchant: ['R_MERCHANT']
} as const

export const PORTAL_HOMES: Record<PortalKind, string> = {
  admin: '/dashboard',
  agent: '/agent/dashboard',
  merchant: '/merchant/dashboard'
}

export const DEMO_PORTAL_ACCOUNTS = {
  super: { portal: 'admin', userName: 'Super', password: '123456' },
  admin: { portal: 'admin', userName: 'Admin', password: '123456' },
  agent: { portal: 'agent', userName: 'Agent', password: '123456' },
  merchant: { portal: 'merchant', userName: 'Merchant', password: '123456' }
} as const

export function getPortalFromRoles(roles: readonly string[] = []): PortalKind | null {
  if (roles.length === 0) return null

  let resolvedPortal: PortalKind | null = null
  for (const role of roles) {
    const portal = (Object.entries(PORTAL_ROLES) as [PortalKind, readonly string[]][]).find(
      ([, allowedRoles]) => allowedRoles.includes(role)
    )?.[0]

    // 未知角色與跨後台混合角色都必須 fail closed，不能推定為管理者。
    if (!portal || (resolvedPortal && resolvedPortal !== portal)) return null
    resolvedPortal = portal
  }

  return resolvedPortal
}

export function getPortalHome(roles: readonly string[] = []): string | null {
  const portal = getPortalFromRoles(roles)
  return portal ? PORTAL_HOMES[portal] : null
}

export function isPortalPathAllowed(path: string, roles: readonly string[] = []): boolean {
  const portal = getPortalFromRoles(roles)
  const isAgentPath = path === '/agent' || path.startsWith('/agent/')
  const isMerchantPath = path === '/merchant' || path.startsWith('/merchant/')

  if (!portal) return isPublicAppPath(path)
  if (portal === 'agent') return isAgentPath || isPublicAppPath(path)
  if (portal === 'merchant') return isMerchantPath || isPublicAppPath(path)
  return !isAgentPath && !isMerchantPath
}

export function resolvePortalRedirect(
  requestedPath: string | undefined,
  portal: PortalKind
): string {
  const home = PORTAL_HOMES[portal]
  if (!requestedPath || requestedPath === '/') return home

  const roles = [...PORTAL_ROLES[portal]]
  return isPortalPathAllowed(requestedPath, roles) ? requestedPath : home
}

export function isDemoAccountAllowedForPortal(userName: string, portal: PortalKind): boolean {
  const account = Object.values(DEMO_PORTAL_ACCOUNTS).find(
    (item) => item.userName.toLowerCase() === userName.trim().toLowerCase()
  )
  return account?.portal === portal
}

function isPublicAppPath(path: string): boolean {
  return (
    path === '/' ||
    path === '/403' ||
    path === '/login' ||
    path.startsWith('/auth/') ||
    path.startsWith('/exception/') ||
    path.startsWith('/result/')
  )
}
