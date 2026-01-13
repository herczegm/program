import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { matrixService, type MatrixFast } from '../services/matrixService'
import { MatrixTable, type EditMode } from '../components/matrix/MatrixTable'
import { usersService } from '../services/usersService'
import { competencyGroupsService } from '../services/competencyGroupsService'
import { MatrixFilters, type MatrixFiltersState } from '../components/matrix/MatrixFilters'
import { VirtualMatrixTable } from '../components/matrix/VirtualMatrixTable'
import { SaveBar } from '../components/common/SaveBar'
import { useBeforeUnload } from '../hooks/useBeforeUnload'

type DirtyMap = Record<string, number>
type PendingMap = Record<string, true> // cell update loading jelöléshez (opcionális)

function keyOf(userId: string, competencyId: string) {
  return `${userId}:${competencyId}`
}

export function MatrixPage({ meRole }: { meRole: 'USER' | 'ADMIN' }) {
  const navigate = useNavigate()
  const [data, setData] = useState<MatrixFast | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [mode, setMode] = useState<EditMode>('inline')
  const [dirty, setDirty] = useState<DirtyMap>({})
  const [pending, setPending] = useState<PendingMap>({})
  const [saving, setSaving] = useState(false)

  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([])
  const [filters, setFilters] = useState<MatrixFiltersState>({
    q: '',
    type: 'ALL',
    groupId: 'ALL',
    includeAdmins: true,
  })

  const editable = meRole === 'ADMIN'

  const dirtyCount = useMemo(() => Object.keys(dirty).length, [dirty])

  const debouncedQ = useDebounced(filters.q, 250)

  async function loadWith(filtersNow: MatrixFiltersState) {
    try {
      setLoading(true)
      setError('')

      // groups list (csak egyszer töltsük)
      // ezt inkább useEffect-ben egyszer betöltjük, lentebb

      // userIds a q alapján:
      let userIds: string[] | undefined = undefined
      const q = debouncedQ.trim()
      if (q) {
        const found = await usersService.list(q)
        userIds = found.map((u) => u.id)
        // ha nincs találat, akkor üres mátrix:
        if (userIds.length === 0) {
          setData({
            meta: { defaultLevel: 0, levelRange: [0, 1, 2, 3], rowsCount: 0, columnsCount: 0 },
            groupHeaders: [],
            columns: [],
            colIndexById: {},
            rows: [],
          } as any)
          setDirty({})
          setPending({})
          return
        }
      }

      const m = await matrixService.fast({
        userIds,
        groupIds: filtersNow.groupId !== 'ALL' ? [filtersNow.groupId] : undefined,
        type: filtersNow.type !== 'ALL' ? (filtersNow.type as any) : undefined,
        includeAdmins: filtersNow.includeAdmins,
      })

      setData(m)
      setDirty({})
      setPending({})
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  useBeforeUnload(mode === 'bulk' && dirtyCount > 0)

  useEffect(() => {
    competencyGroupsService.listActive()
      .then((gs) => setGroups(gs.map((g) => ({ id: g.id, name: g.name }))))
      .catch(() => setGroups([]))
  }, [])

  useEffect(() => {
    loadWith(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type, filters.groupId, filters.includeAdmins, debouncedQ])

  function applyLocalCell(userId: string, competencyId: string, level: number) {
    if (!data) return
    const colIdx = data.colIndexById[competencyId]
    if (colIdx === undefined) return

    setData({
      ...data,
      rows: data.rows.map((r) => {
        if (r.userId !== userId) return r
        const nextDense = r.levelsDense.slice()
        nextDense[colIdx] = level
        return { ...r, levelsDense: nextDense }
      }),
    })
  }

  async function handleCellClick(userId: string, competencyId: string, nextLevel: number) {
    if (!editable) return
    if (!data) return

    if (mode === 'bulk') {
      // bulk: csak dirty-be tesszük és azonnal UI update (overlay jelöléssel)
      setDirty((prev) => ({ ...prev, [keyOf(userId, competencyId)]: nextLevel }))
      return
    }

    // inline: optimistic update + azonnali mentés
    const colIdx = data.colIndexById[competencyId]
    const row = data.rows.find((r) => r.userId === userId)
    if (colIdx === undefined || !row) return
    const prevLevel = row.levelsDense[colIdx] ?? data.meta.defaultLevel

    applyLocalCell(userId, competencyId, nextLevel)
    setPending((p) => ({ ...p, [keyOf(userId, competencyId)]: true }))

    try {
      await matrixService.setCell(userId, competencyId, nextLevel)
    } catch (e: any) {
      // rollback
      applyLocalCell(userId, competencyId, prevLevel)
      setError(e?.message ?? String(e))
    } finally {
      setPending((p) => {
        const copy = { ...p }
        delete copy[keyOf(userId, competencyId)]
        return copy
      })
    }
  }

  async function saveBulk() {
    if (!editable) return
    if (!data) return
    const entries = Object.entries(dirty)
    if (entries.length === 0) return

    const cells = entries.map(([k, level]) => {
      const [userId, competencyId] = k.split(':')
      return { userId, competencyId, level }
    })

    setSaving(true)
    setError('')
    try {
      await matrixService.setCells(cells)

      // bulk esetén a base data-t is frissítsük a dirty értékekkel (hogy ne csak overlay legyen)
      for (const c of cells) applyLocalCell(c.userId, c.competencyId, c.level)
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

  function useDebounced<T>(value: T, ms: number) {
    const [v, setV] = useState(value)
    useEffect(() => {
      const t = setTimeout(() => setV(value), ms)
      return () => clearTimeout(t)
    }, [value, ms])
    return v
  }

  if (loading && !data) return <div>Loading matrix…</div>
  if (error && !data) return <div style={{ color: 'crimson' }}>{error}</div>
  if (!data) return null

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <MatrixFilters
        groups={groups}
        value={filters}
        onChange={(next) => {
          // bulk módban ne veszítsünk mentetlen változást véletlen filter váltással:
          if (mode === 'bulk' && Object.keys(dirty).length > 0) {
          if (!confirm('Van mentetlen módosításod. Eldobod és szűrsz?')) return
            setDirty({})
          }
          setFilters(next)
        }}
        disabled={loading}
      />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => loadWith(filters)} disabled={loading}>Refresh</button>

        <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>
          Mode:
        </span>

        <button
          onClick={() => { setMode('inline'); setDirty({}) }}
          disabled={!editable}
          style={mode === 'inline' ? btnActive : undefined}
          title={!editable ? 'Csak ADMIN tud szerkeszteni' : ''}
        >
          Inline
        </button>

        <button
          onClick={() => setMode('bulk')}
          disabled={!editable}
          style={mode === 'bulk' ? btnActive : undefined}
          title={!editable ? 'Csak ADMIN tud szerkeszteni' : ''}
        >
          Bulk
        </button>

        {mode === 'bulk' && editable ? (
          <>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Dirty: {dirtyCount}</span>
            <button onClick={saveBulk} disabled={saving || dirtyCount === 0}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={discardBulk} disabled={saving || dirtyCount === 0}>
              Discard
            </button>
          </>
        ) : null}

        {Object.keys(pending).length > 0 && mode === 'inline' ? (
          <span style={{ fontSize: 12, opacity: 0.8 }}>
            Mentés alatt: {Object.keys(pending).length}
          </span>
        ) : null}
      </div>

      {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}

      <VirtualMatrixTable
        data={data}
        editable={editable}
        mode={mode}
        dirty={dirty}
        onCellClick={handleCellClick}
        onUserClick={(userId) => navigate(`/users/${userId}`)}
      />

      <SaveBar
        visible={mode === 'bulk' && editable && dirtyCount > 0}
        dirtyCount={dirtyCount}
        saving={saving}
        onSave={saveBulk}
        onDiscard={discardBulk}
      />
    </div>
  )
}

const btnActive: React.CSSProperties = {
  border: '1px solid #111',
}
