import { Navigate } from 'react-router-dom'
import { useAuth, getSessionArea, AREA_HOME, type SessionArea } from '@/lib/auth'

export function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />

  const area = getSessionArea()
  if (area && hasAreaRole(user.roles, area)) return <Navigate to={AREA_HOME[area]} replace />

  if (user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN')) return <Navigate to={AREA_HOME.admin} replace />
  if (user.roles.includes('SHOPKEEPER')) return <Navigate to={AREA_HOME.shop} replace />
  return <Navigate to={AREA_HOME.customer} replace />
}

function hasAreaRole(roles: string[], area: SessionArea): boolean {
  if (area === 'admin') return roles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r))
  if (area === 'shop') return roles.includes('SHOPKEEPER') || roles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r))
  return true
}
