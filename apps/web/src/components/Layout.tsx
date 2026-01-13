import type { ReactNode } from 'react'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: 'system-ui', padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0 }}>Program</h2>
      {children}
    </div>
  )
}
