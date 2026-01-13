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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                Bejelentkezve: <b>{me.username}</b> ({me.role})
              </div>
              <button
                onClick={() => {
                  clearToken()
                  setMe(null)
                }}
              >
                Kilépés
              </button>
            </div>

            <Routes>
              <Route path="/" element={<MatrixPage meRole={me.role} />} />
              <Route path="/users/:id" element={<UserDetailPage meRole={me.role} />} />
              <Route path="/admin" element={<AdminPage meRole={me.role} />} />
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
