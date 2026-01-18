import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { matrixService, type MatrixFast } from '../services/matrixService'
import { UserLevelChanges } from '../components/user/UserLevelChanges'
import { useBeforeUnload } from '../hooks/useBeforeUnload'
import { SaveBar } from '../components/common/SaveBar'

type EditMode = 'inline' | 'bulk'
type DirtyMap = Record<string, number> // key = `${userId}:${competencyId}`

function keyOf(userId: string, competencyId: string) {
  return `${userId}:${competencyId}`
}

function nextLevel(current: number) {
  return current >= 3 ? 0 : current + 1
}

function parseBool(v: string | null | undefined, defaultValue: boolean) {
  if (v == null) return defaultValue
  const s = v.trim().toLowerCase()
  if (s === '1' || s === 'true' || s === 'yes') return true
  if (s === '0' || s === 'false' || s === 'no') return false
  return defaultValue
}

type UserDetailFilters = {
  type: 'ALL' | 'CORE' | 'CUSTOM'
  groupId: 'ALL' | string
  q: string
  includeDeleted: boolean
  includeAdmins: boolean
}

function parseFiltersFromUrl(sp: URLSearchParams): UserDetailFilters {
  const typeRaw = sp.get('type')
  const type: UserDetailFilters['type'] = typeRaw === 'CORE' || typeRaw === 'CUSTOM' ? typeRaw : 'ALL'

  const groupId = (sp.get('groupId') ?? 'ALL').trim() || 'ALL'
  const q = sp.get('q') ?? ''

  const includeDeleted = parseBool(sp.get('includeDeleted'), false)
  const includeAdmins = parseBool(sp.get('includeAdmins'), true)

  return { type, groupId, q, includeDeleted, includeAdmins }
}

function filtersToUrlParams(f: UserDetailFilters): URLSearchParams {
  const sp = new URLSearchParams()
  const q = f.q.trim()
  if (q) sp.set('q', q)
  if (f.type !== 'ALL') sp.set('type', f.type)
  if (f.groupId !== 'ALL') sp.set('groupId', f.groupId)

  // defaultok: includeAdmins=true, includeDeleted=false
  if (f.includeAdmins === false) sp.set('includeAdmins', '0')
  if (f.includeDeleted === true) sp.set('includeDeleted', '1')
  return sp
}

function sameFilters(a: UserDetailFilters, b: UserDetailFilters) {
  return (
    a.type === b.type &&
    a.groupId === b.groupId &&
    a.q === b.q &&
    a.includeDeleted === b.includeDeleted &&
    a.includeAdmins === b.includeAdmins
  )
}

export function UserDetailPage({ meRole }: { meRole: 'USER' | 'ADMIN' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const loc = useLocation()

  const [sp, setSp] = useSearchParams()
  const urlFilters = useMemo(() => parseFiltersFromUrl(sp), [sp.toString()])
  const [filters, setFilters] = useState<UserDetailFilters>(urlFilters)

  const [data, setData] = useState<MatrixFast | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [mode, setMode] = useState<EditMode>('inline')
  const [dirty, setDirty] = useState<DirtyMap>({})
  const [saving, setSaving] = useState(false)

  const editable = meRole === 'ADMIN'

  const user = data?.rows?.[0] ?? null

  const groups = useMemo(() => {
    if (!data) return []
    const needle = filters.q.trim().toLowerCase()

    return data.groupHeaders
      .filter((g) => (filters.groupId === 'ALL' ? true : g.groupId === filters.groupId))
      .map((g) => {
        const cols = data.columns
          .slice(g.start, g.start + g.span)
          .filter((c) => (filters.type === 'ALL' ? true : c.type === filters.type))
          .filter((c) => (needle ? c.name.toLowerCase().includes(needle) : true))

        return { groupId: g.groupId, groupName: g.groupName, columns: cols, start: g.start }
      })
      .filter((g) => g.columns.length > 0)

  }, [data, filters.groupId, filters.type, filters.q])

  useBeforeUnload(mode === 'bulk' && Object.keys(dirty).length > 0)

  async function load() {
    if (!id) return
    try {
      setLoading(true)
      setError('')
      const m = await matrixService.fast({
        userIds: [id],
        includeAdmins: filters.includeAdmins,
        includeDeleted: filters.includeDeleted,
      })
      setData(m)
      setDirty({})
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, filters.includeAdmins, filters.includeDeleted])

  useEffect(() => {
    setFilters((prev) => (sameFilters(prev, urlFilters) ? prev : urlFilters))
  }, [urlFilters])

  useEffect(() => {
    const next = filtersToUrlParams(filters).toString()
    const cur = sp.toString()
    const nextStr = next.toString()
    if (nextStr !== cur) setSp(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  function getLevel(competencyId: string, colIdx: number) {
    if (!user || !data) return 0
    const k = keyOf(user.userId, competencyId)
    const d = dirty[k]
    if (d !== undefined) return d
    return user.levelsDense[colIdx] ?? data.meta.defaultLevel
  }

  function applyLocal(competencyId: string, level: number) {
    if (!data || !user) return
    const colIdx = data.colIndexById[competencyId]
    if (colIdx === undefined) return

    setData({
      ...data,
      rows: data.rows.map((r) => {
        if (r.userId !== user.userId) return r
        const next = r.levelsDense.slice()
        next[colIdx] = level
        return { ...r, levelsDense: next }
      }),
    })
  }

  async function setOne(competencyId: string, level: number) {
    if (!editable || !user) return

    if (mode === 'bulk') {
      setDirty((prev) => ({ ...prev, [keyOf(user.userId, competencyId)]: level }))
      return
    }

    // inline optimistic
    const colIdx = data?.colIndexById?.[competencyId]
    const prev = colIdx !== undefined ? (user.levelsDense[colIdx] ?? 0) : 0

    applyLocal(competencyId, level)
    try {
      await matrixService.setCell(user.userId, competencyId, level)
    } catch (e: any) {
      applyLocal(competencyId, prev)
      setError(e?.message ?? String(e))
    }
  }

  async function saveBulk() {
    if (!editable || !user) return
    const entries = Object.entries(dirty)
    if (entries.length === 0) return

    const cells = entries.map(([k, level]) => {
      const [, competencyId] = k.split(':')
      return { userId: user.userId, competencyId, level }
    })

    setSaving(true)
    setError('')
    try {
      await matrixService.setCells(cells)
      // commit local
      for (const c of cells) applyLocal(c.competencyId, c.level)
      setDirty({})
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setSaving(false)
    }
  }

  function discardBulk() {
    setDirty({})
  }

  if (!id) return <div>Missing user id</div>

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => {
          if (mode === 'bulk' && Object.keys(dirty).length > 0) {
            if (!confirm('Van mentetlen módosításod. Biztos visszamész?')) return
          }
          navigate(-1)
        }}>
          ← Back
        </button>
        
        <Link to={`/${loc.search}`} style={{ fontSize: 12, opacity: 0.8 }}>
          Matrix
        </Link>
        <button onClick={load} disabled={loading}>Refresh</button>

        <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>Mode:</span>
        <button onClick={() => { setMode('inline'); setDirty({}) }} disabled={!editable} style={mode === 'inline' ? btnActive : undefined}>
          Inline
        </button>
        <button onClick={() => setMode('bulk')} disabled={!editable} style={mode === 'bulk' ? btnActive : undefined}>
          Bulk
        </button>

        <label style={{ fontSize: 12, opacity: 0.85 }}>
          Type:{' '}
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value as any})}>
            <option value="ALL">ALL</option>
            <option value="CORE">CORE</option>
            <option value="CUSTOM">CUSTOM</option>
            </select>
        </label>

        <label style={{ fontSize: 12, opacity: 0.85 }}>
          Group:{' '}
          <select value={filters.groupId} onChange={(e) => setFilters({ ...filters, groupId: e.target.value as any})}>
            <option value="ALL">ALL</option>
            {data?.groupHeaders.map((g) => (
              <option key={g.groupId} value={g.groupId}>{g.groupName}</option>
            ))}
          </select>
        </label>

        <input
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value})}
          placeholder="search competency…"
          style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #ddd' }}
        />

        <label style={{ fontSize: 12, opacity: 0.85, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={filters.includeAdmins}
            onChange={(e) => setFilters({ ...filters, includeAdmins: e.target.checked })}
          />
          Include admins
        </label>

        <label style={{ fontSize: 12, opacity: 0.85, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={filters.includeDeleted}
            onChange={(e) => setFilters({ ...filters, includeDeleted: e.target.checked })}
          />
          Include deleted
        </label>

        {mode === 'bulk' && editable ? (
          <>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Dirty: {Object.keys(dirty).length}</span>
            <button onClick={saveBulk} disabled={saving || Object.keys(dirty).length === 0}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={discardBulk} disabled={saving || Object.keys(dirty).length === 0}>
              Discard
            </button>
          </>
        ) : null}
      </div>

      {loading && !data ? <div>Loading…</div> : null}
      {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}

      {user ? (
        <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>{user.username}</h3>
            <span style={{ fontSize: 12, opacity: 0.8 }}>{user.role}</span>
            {user.displayName ? <span style={{ fontSize: 12, opacity: 0.8 }}>{user.displayName}</span> : null}
          </div>

          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {groups.map((g) => (
              <div key={g.groupId} style={{ borderTop: '1px solid #eee', paddingTop: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{g.groupName}</div>

                <div style={{ display: 'grid', gap: 6 }}>
                  {g.columns.map((c) => {
                    const colIdx = data!.colIndexById[c.id]
                    const lvl = getLevel(c.id, colIdx)
                    const isDirty = dirty[keyOf(user.userId, c.id)] !== undefined

                    return (
                      <div
                        key={c.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 8px',
                          border: '1px solid #eee',
                          borderRadius: 10,
                          background: isDirty ? 'rgba(255, 215, 0, 0.12)' : '#fff',
                        }}
                      >
                        <div style={{ display: 'grid' }}>
                          <span style={{ fontWeight: 600 }}>{c.name}</span>
                          <span style={{ fontSize: 12, opacity: 0.7 }}>{c.type}</span>
                        </div>

                        <button
                          disabled={!editable}
                          onClick={() => setOne(c.id, nextLevel(lvl))}
                          onKeyDown={(e) => {
                            if (!editable) return
                            if (e.key === '0' || e.key === '1' || e.key === '2' || e.key === '3') {
                              e.preventDefault()
                              setOne(c.id, Number(e.key))
                            }
                          }}
                          style={{
                            minWidth: 52,
                            borderRadius: 999,
                            border: '1px solid #ddd',
                            padding: '4px 10px',
                            cursor: editable ? 'pointer' : 'default',
                            background: '#fff',
                          }}
                          title={editable ? 'Click: next • Keys: 0-3' : 'Nincs jogosultság'}
                        >
                          {lvl}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <UserLevelChanges userId={user.userId} />
          <SaveBar
            visible={mode === 'bulk' && editable && Object.keys(dirty).length > 0}
            dirtyCount={Object.keys(dirty).length}
            saving={saving}
            onSave={saveBulk}
            onDiscard={discardBulk}
          />
        </div>
      ) : data ? (
        <div>Nincs ilyen user / nincs adat.</div>
      ) : null}
    </div>
  )
}

const btnActive: React.CSSProperties = { border: '1px solid #111' }
