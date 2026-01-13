import { Link, useLocation } from 'react-router-dom'

export function NavBar({
  me,
  onLogout,
}: {
  me: { username: string; role: 'USER' | 'ADMIN' }
  onLogout: () => void
}) {
  const { pathname } = useLocation()

  const linkStyle = (to: string): React.CSSProperties => ({
    padding: '6px 10px',
    borderRadius: 10,
    textDecoration: 'none',
    border: pathname === to ? '1px solid #111' : '1px solid #eee',
    color: '#111',
    background: '#fff',
    fontSize: 14,
  })

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link to="/" style={linkStyle('/')}>Matrix</Link>
        {me.role === 'ADMIN' ? <Link to="/admin" style={linkStyle('/admin')}>Admin</Link> : null}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 12, opacity: 0.75 }}>
          {me.username} ({me.role})
        </span>
        <button onClick={onLogout}>Logout</button>
      </div>
    </div>
  )
}
