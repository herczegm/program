import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { competencyGroupsService } from '../services/competencyGroupsService'
import { competenciesService, type Competency } from '../services/competenciesService'

type Group = { id: string; name: string; sortOrder: number }

function move<T>(arr: T[], from: number, to: number) {
  const copy = arr.slice()
  const [x] = copy.splice(from, 1)
  copy.splice(to, 0, x)
  return copy
}

export function AdminPage({ meRole }: { meRole: 'USER' | 'ADMIN' }) {
  const isAdmin = meRole === 'ADMIN'
  if (!isAdmin) return <div>No access.</div>

  const [groups, setGroups] = useState<Group[]>([])
  const [comps, setComps] = useState<Competency[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'CORE' | 'CUSTOM'>('CUSTOM')

  const groupsSorted = useMemo(() => {
    return groups.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  }, [groups])

  const compsInGroup = useMemo(() => {
    const list = comps.filter((c) => c.groupId === selectedGroupId)
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    return list
  }, [comps, selectedGroupId])

  const selectedGroup = groupsSorted.find((g) => g.id === selectedGroupId) ?? null

  async function load() {
    try {
      setLoading(true)
      setError('')
      const [gs, cs] = await Promise.all([competencyGroupsService.listActive(), competenciesService.list()])
      setGroups(gs)
      setComps(cs)
      setSelectedGroupId((prev) => prev || gs[0]?.id || '')
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function reorderGroups(next: Group[]) {
    setGroups(next) // optimistic
    try {
      setError('')
      const ids = next.map((g) => g.id)
      const res = await competencyGroupsService.reorder(ids)
      setGroups(res)
    } catch (e: any) {
      setError(e?.message ?? String(e))
      load() // rollback egyszerűen
    }
  }

  async function reorderComps(next: Competency[]) {
    // csak a kiválasztott group kompetenciáit rendezzük
    setComps((prev) => {
      const other = prev.filter((c) => c.groupId !== selectedGroupId)
      return [...other, ...next]
    })

    try {
      setError('')
      const ids = next.map((c) => c.id)
      await competenciesService.reorder(ids)
      // visszatöltjük, hogy a backend szerinti sortOrder legyen a forrás
      const cs = await competenciesService.list()
      setComps(cs)
    } catch (e: any) {
      setError(e?.message ?? String(e))
      load()
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Admin</h3>
          <Link to="/" style={{ fontSize: 12, opacity: 0.8 }}>← Matrix</Link>
        </div>
        <button onClick={load} disabled={loading}>Refresh</button>
      </div>

      {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 12 }}>
        {/* LEFT: Groups */}
        <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Competency Groups</div>

          <div style={{ display: 'grid', gap: 6 }}>
            {groupsSorted.map((g, idx) => {
              const selected = g.id === selectedGroupId
              return (
                <div
                  key={g.id}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: 12,
                    padding: 8,
                    background: selected ? 'rgba(0,0,0,0.04)' : '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <button
                    onClick={() => setSelectedGroupId(g.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 700,
                      flex: 1,
                    }}
                    title="Select group"
                  >
                    {g.name}
                  </button>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      disabled={idx === 0}
                      onClick={() => reorderGroups(move(groupsSorted, idx, idx - 1))}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      disabled={idx === groupsSorted.length - 1}
                      onClick={() => reorderGroups(move(groupsSorted, idx, idx + 1))}
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              )
            })}

            {groupsSorted.length === 0 ? (
              <div style={{ fontSize: 12, opacity: 0.7 }}>No groups.</div>
            ) : null}
          </div>
        </div>

        {/* RIGHT: Competencies in selected group */}
        <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <div style={{ fontWeight: 800 }}>
              Competencies {selectedGroup ? <span style={{ opacity: 0.7 }}>• {selectedGroup.name}</span> : null}
            </div>
          </div>

          {!selectedGroup ? (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Select a group on the left.</div>
          ) : (
            <>
              {/* Create */}
              <div style={{ marginTop: 10, border: '1px solid #eee', borderRadius: 12, padding: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>New competency</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="name"
                    style={{ minWidth: 260 }}
                  />
                  <select value={newType} onChange={(e) => setNewType(e.target.value as any)}>
                    <option value="CUSTOM">CUSTOM</option>
                    <option value="CORE">CORE</option>
                  </select>
                  <button
                    disabled={!newName.trim()}
                    onClick={async () => {
                      try {
                        setError('')
                        const created = await competenciesService.create({
                          name: newName,
                          type: newType,
                          groupId: selectedGroupId,
                          sortOrder: compsInGroup.length, // új a végére
                        })
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

              {/* List */}
              <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                {compsInGroup.map((c, idx) => (
                  <CompetencyRow
                    key={c.id}
                    c={c}
                    idx={idx}
                    max={compsInGroup.length}
                    onMoveUp={() => reorderComps(move(compsInGroup, idx, idx - 1))}
                    onMoveDown={() => reorderComps(move(compsInGroup, idx, idx + 1))}
                    onUpdated={(patch) => setComps((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...patch } : x)))}
                    onDeleted={() => setComps((prev) => prev.filter((x) => x.id !== c.id))}
                    onError={setError}
                  />
                ))}

                {compsInGroup.length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>No competencies in this group.</div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CompetencyRow({
  c,
  idx,
  max,
  onMoveUp,
  onMoveDown,
  onUpdated,
  onDeleted,
  onError,
}: {
  c: Competency
  idx: number
  max: number
  onMoveUp: () => void
  onMoveDown: () => void
  onUpdated: (patch: Partial<Competency>) => void
  onDeleted: () => void
  onError: (msg: string) => void
}) {
  const [name, setName] = useState(c.name)

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input value={name} onChange={(e) => setName(e.target.value)} style={{ minWidth: 260 }} />
      <span style={{ fontSize: 12, opacity: 0.7 }}>{c.type}</span>

      <div style={{ display: 'flex', gap: 6 }}>
        <button disabled={idx === 0} onClick={onMoveUp} title="Move up">↑</button>
        <button disabled={idx === max - 1} onClick={onMoveDown} title="Move down">↓</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
        <button
          onClick={async () => {
            try {
              onError('')
              const updated = await competenciesService.update(c.id, { name: name.trim() })
              onUpdated(updated)
            } catch (e: any) {
              onError(e?.message ?? String(e))
            }
          }}
          disabled={!name.trim() || name.trim() === c.name}
        >
          Save
        </button>

        <button
          onClick={async () => {
            if (!confirm('Delete competency?')) return
            try {
              onError('')
              await competenciesService.softDelete(c.id)
              onDeleted()
            } catch (e: any) {
              onError(e?.message ?? String(e))
            }
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
