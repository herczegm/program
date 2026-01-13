import { useState } from 'react'
import { authService } from '../services/authService'
import { setToken } from '../state/authStore'
import type { Me } from '../state/authStore'

export function LoginPage({ onLoggedIn }: { onLoggedIn: (me: Me) => void }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('dev')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
      <h3>Login</h3>

      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />

      <button
        disabled={loading}
        onClick={async () => {
          try {
            setLoading(true)
            setError('')
            const { access_token } = await authService.login(username, password)
            setToken(access_token)
            const me = await authService.me()
            onLoggedIn(me)
          } catch (e: any) {
            setError(e?.message ?? String(e))
          } finally {
            setLoading(false)
          }
        }}
      >
        Bejelentkezés
      </button>

      {error && <div style={{ color: 'crimson' }}>{error}</div>}
    </div>
  )
}
