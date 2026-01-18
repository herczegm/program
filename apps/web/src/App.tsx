import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
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
import { RequireAuth } from './components/RequireAuth'

function LoginRoute({
  me,
  onLoggedIn,
}: {
  me: Me | null
  onLoggedIn: (m: Me) => void
}) {
  const loc = useLocation()
  const navigate = useNavigate()

  const from = (loc.state as any)?.from ?? '/'

  if (me) return <Navigate to={from} replace />

  return (
    <LoginPage
      onLoggedIn={(m) => {
        onLoggedIn(m)
        navigate(from, { replace: true })
      }}
    />
  )
}

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

  // ha http.ts 401-et fog -> auth:logout event
  useEffect(() => {
    const h = () => setMe(null)
    window.addEventListener('auth:logout', h)
    return () => window.removeEventListener('auth:logout', h)
  }, [])

  if (!booted) return <Layout>Loading…</Layout>

  return (
    <BrowserRouter>
      <Layout>
        {me ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <NavBar
              me={me}
              onLogout={() => {
                clearToken()
                setMe(null)
              }}
            />
            <Routes>
              <Route
                path="/"
                element={
                  <RequireAuth me={me}>
                    <MatrixPage meRole={me.role} />
                  </RequireAuth>
                }
              />
              <Route
                path="/users/:id"
                element={
                  <RequireAuth me={me}>
                    <UserDetailPage meRole={me.role} />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireAuth me={me}>
                    <RequireAdmin role={me.role}>
                      <AdminPage meRole={me.role} />
                    </RequireAdmin>
                  </RequireAuth>
                }
              />
              <Route path="/login" element={<LoginRoute me={me} onLoggedIn={setMe} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<LoginRoute me={me} onLoggedIn={setMe} />} />
            {/* ha bármi más route-ra megy token nélkül -> dobjuk loginra, és mentsük honnan jött */}
            <Route path="*" element={<RequireAuth me={me}><div /></RequireAuth>} />
          </Routes>
        )}
      </Layout>
    </BrowserRouter>
  )
}