import { AppRouteRecord } from '@/types/router'
import { gameProviderRoutes } from './gameProvider'
import { partnerPortalRoutes } from './partnerPortals'

/**
 * 导出所有模块化路由
 */
export const routeModules: AppRouteRecord[] = [...gameProviderRoutes, ...partnerPortalRoutes]
