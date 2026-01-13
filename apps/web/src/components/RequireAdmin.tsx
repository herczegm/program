import { Navigate } from 'react-router-dom'

export function RequireAdmin({
  role,
  children,
}: {
  role: 'USER' | 'ADMIN'
  children: React.ReactNode
}) {
  if (role !== 'ADMIN') return <Navigate to="/" replace />
  return <>{children}</>
}
