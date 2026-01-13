import { useEffect, useState } from 'react'
import { auditService, type LevelChange } from '../../services/auditService'

export function UserLevelChanges({ userId }: { userId: string }) {
  const [items, setItems] = useState<LevelChange[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    auditService.userLevelChanges(userId, 80)
      .then((x) => alive && setItems(x))
      .catch((e: any) => alive && setError(e?.message ?? String(e)))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [userId])

  return (
    <div style={{ borderTop: '1px solid #eee', paddingTop: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Változásnapló</div>
      {loading ? <div>Loading…</div> : null}
      {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}

      <div style={{ display: 'grid', gap: 6 }}>
        {items.map((c) => (
          <div key={c.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 600 }}>
                {c.competency.group.name} • {c.competency.name} <span style={{ fontSize: 12, opacity: 0.7 }}>({c.competency.type})</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {new Date(c.createdAt).toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <div>
                <span style={pill}>{c.oldLevel}</span> → <span style={pill}>{c.newLevel}</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {c.actor.displayName ?? c.actor.username}
              </div>
            </div>
          </div>
        ))}
        {(!loading && items.length === 0) ? <div style={{ fontSize: 12, opacity: 0.7 }}>Nincs változás.</div> : null}
      </div>
    </div>
  )
}

const pill: React.CSSProperties = {
  display: 'inline-block',
  minWidth: 26,
  padding: '2px 8px',
  borderRadius: 999,
  border: '1px solid #ddd',
}
