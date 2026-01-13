import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { competencyGroupsService } from '../services/competencyGroupsService'
import { competenciesService, type Competency } from '../services/competenciesService'

export function AdminPage({ meRole }: { meRole: 'USER' | 'ADMIN' }) {
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([])
  const [comps, setComps] = useState<Competency[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isAdmin = meRole === 'ADMIN'

  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'CORE' | 'CUSTOM'>('CUSTOM')
  const [newGroupId, setNewGroupId] = useState<string>('')

  const compsByGroup = useMemo(() => {
    const dict: Record<string, Competency[]> = {}
    for (const c of comps) (dict[c.groupId] ??= []).push(c)
    for (const k of Object.keys(dict)) dict[k].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    return dict
  }, [comps])

  async function load() {
    try {
      setLoading(true)
      setError('')
      const [gs, cs] = await Promise.all([
        competencyGroupsService.listActive(),
        competenciesService.list(),
      ])
      setGroups(gs.map((g) => ({ id: g.id, name: g.name })))
      setComps(cs)
      setNewGroupId(gs[0]?.id ?? '')
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (!isAdmin) return <div>Nincs jogosultság.</div>

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Admin</h3>
          <Link to="/" style={{ fontSize: 12, opacity: 0.8 }}>← Matrix</Link>
        </div>
        <button onClick={load} disabled={loading}>Refresh</button>
      </div>

      {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}

      <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: 12, display: 'grid', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Új kompetencia</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="name" />
          <select value={newType} onChange={(e) => setNewType(e.target.value as any)}>
            <option value="CUSTOM">CUSTOM</option>
            <option value="CORE">CORE</option>
          </select>
          <select value={newGroupId} onChange={(e) => setNewGroupId(e.target.value)}>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button
            disabled={!newName.trim() || !newGroupId}
            onClick={async () => {
              try {
                setError('')
                const created = await competenciesService.create({ name: newName, type: newType, groupId: newGroupId })
                setComps((prev) => [...prev, created])
                setNewName('')
              } catch (e: any) {
                setError(e?.message ?? String(e))
              }
            }}
          >
            Create
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {groups.map((g) => (
          <div key={g.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{g.name}</div>

            <div style={{ display: 'grid', gap: 6 }}>
              {(compsByGroup[g.id] ?? []).map((c) => (
                <CompetencyRow
                  key={c.id}
                  c={c}
                  onChange={(patch) => {
                    setComps((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...patch } : x)))
                  }}
                  onDelete={() => setComps((prev) => prev.filter((x) => x.id !== c.id))}
                  onError={setError}
                />
              ))}
              {(compsByGroup[g.id] ?? []).length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.7 }}>Nincs kompetencia.</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CompetencyRow({
  c,
  onChange,
  onDelete,
  onError,
}: {
  c: Competency
  onChange: (patch: Partial<Competency>) => void
  onDelete: () => void
  onError: (msg: string) => void
}) {
  const [name, setName] = useState(c.name)

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ minWidth: 260 }}
      />
      <span style={{ fontSize: 12, opacity: 0.7 }}>{c.type}</span>

      <button
        onClick={async () => {
          try {
            onError('')
            const updated = await competenciesService.update(c.id, { name })
            onChange(updated)
          } catch (e: any) {
            onError(e?.message ?? String(e))
          }
        }}
      >
        Save
      </button>

      <button
        onClick={async () => {
          if (!confirm('Biztos törlöd?')) return
          try {
            onError('')
            await competenciesService.softDelete(c.id)
            onDelete()
          } catch (e: any) {
            onError(e?.message ?? String(e))
          }
        }}
      >
        Delete
      </button>
    </div>
  )
}
