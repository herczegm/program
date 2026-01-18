import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Me } from '../state/authStore'

export function RequireAuth({
  me,
  children,
}: {
  me: Me | null
  children: React.ReactNode
}) {
  const loc = useLocation()
  if (!me) {
    const from = loc.pathname + loc.search
    return <Navigate to="/login" replace state={{ from }} />
  }
  return <>{children}</>
}
