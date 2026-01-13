import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { MatrixPage } from './pages/MatrixPage'
import { UserDetailPage } from './pages/UserDetailPage'
import { authService } from './services/authService'
import { clearToken } from './state/authStore'
import type { Me } from './state/authStore'
import { AdminPage } from './pages/AdminPage'
import { NavBar } from './components/NavBar'
import { RequireAdmin } from './components/RequireAdmin'

export default function App() {
  const [me, setMe] = useState<Me | null>(null)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    authService
      .me()
      .then((m) => setMe(m))
      .catch(() => setMe(null))
      .finally(() => setBooted(true))
  }, [])

  if (!booted) return <Layout>Loading…</Layout>

  return (
    <Layout>
      {me ? (
        <BrowserRouter>
          <div style={{ display: 'grid', gap: 12 }}>
            <NavBar
              me={me}
              onLogout={() => {
                clearToken()
                setMe(null)
              }}
            />

            <Routes>
              <Route path="/" element={<MatrixPage meRole={me.role} />} />
              <Route path="/users/:id" element={<UserDetailPage meRole={me.role} />} />
              <Route path="/admin" element={
                  <RequireAdmin role={me.role}>
                    <AdminPage meRole={me.role} />
                  </RequireAdmin>
                } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      ) : (
        <LoginPage onLoggedIn={setMe} />
      )}
    </Layout>
  )
}
