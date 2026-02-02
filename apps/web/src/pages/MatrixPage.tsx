import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { matrixService, type MatrixFast } from '../services/matrixService'
import { MatrixTable, type EditMode } from '../components/matrix/MatrixTable'
import { usersService } from '../services/usersService'
import { competencyGroupsService } from '../services/competencyGroupsService'
import { growthService } from '../services/growthService'
import { MatrixFilters, type MatrixFiltersState } from '../components/matrix/MatrixFilters'
import { VirtualMatrixTable } from '../components/matrix/VirtualMatrixTable'
import { SaveBar } from '../components/common/SaveBar'
import { useBeforeUnload } from '../hooks/useBeforeUnload'

type DirtyMap = Record<string, number>
type PendingMap = Record<string, true> // cell update loading jelöléshez (opcionális)

function keyOf(userId: string, competencyId: string) {
  return `${userId}:${competencyId}`
}

function parseBool(v: string | null | undefined, defaultValue: boolean) {
  if (v == null) return defaultValue
  const s = v.trim().toLowerCase()
  if (s === '1' || s === 'true' || s === 'yes') return true
  if (s === '0' || s === 'false' || s === 'no') return false
  return defaultValue
}

function parseFiltersFromUrl(sp: URLSearchParams): MatrixFiltersState {
  const q = sp.get('q') ?? ''
  const typeRaw = sp.get('type')
  const type: MatrixFiltersState['type'] =
    typeRaw === 'CORE' || typeRaw === 'CUSTOM' ? typeRaw : 'ALL'

  const groupIdRaw = sp.get('groupId')
  const groupId: MatrixFiltersState['groupId'] =
    groupIdRaw && groupIdRaw.trim() ? (groupIdRaw as any) : 'ALL'

  const includeAdmins = parseBool(sp.get('includeAdmins'), true)
  const includeDeleted = parseBool(sp.get('includeDeleted'), false)
  
  const growthDaysRaw = sp.get('growthDays')
  const growthDays: 30 | 90 | 180 =
    growthDaysRaw === '30' || growthDaysRaw === '90' || growthDaysRaw === '180' ? (Number(growthDaysRaw) as any) : 90

  const levelCompetencyId = (sp.get('levelCompetencyId') ?? '').trim()
  const minLevelRaw = sp.get('minLevel')
  const exactLevelRaw = sp.get('exactLevel')
  const minLevel = minLevelRaw == null ? undefined : Number(minLevelRaw)
  const exactLevel = exactLevelRaw == null ? undefined : Number(exactLevelRaw)
  // ha mindkettő lenne, preferáljuk az exact-et (UI amúgy sem fogja így állítani)
  const normalized = {
    levelCompetencyId,
    minLevel: exactLevelRaw != null ? undefined : minLevel,
    exactLevel: exactLevelRaw != null ? exactLevel : undefined,
  }

  return { q, type, groupId, includeAdmins, includeDeleted, growthDays, ...normalized }
}

function filtersToUrlParams(f: MatrixFiltersState): URLSearchParams {
  const sp = new URLSearchParams()

  const q = f.q.trim()
  if (q) sp.set('q', q)
  if (f.type !== 'ALL') sp.set('type', f.type)
  if (f.groupId !== 'ALL') sp.set('groupId', String(f.groupId))

  // default: includeAdmins = true, includeDeleted = false
  if (f.includeAdmins === false) sp.set('includeAdmins', '0')
  if (f.includeDeleted === true) sp.set('includeDeleted', '1')

  if (f.levelCompetencyId) sp.set('levelCompetencyId', f.levelCompetencyId)
  if (f.exactLevel !== undefined) sp.set('exactLevel', String(f.exactLevel))
  else if (f.minLevel !== undefined) sp.set('minLevel', String(f.minLevel))

  sp.set('growthDays', String(f.growthDays ?? 90))

  return sp
}

function sameFilters(a: MatrixFiltersState, b: MatrixFiltersState) {
  return (
    a.q === b.q &&
    a.type === b.type &&
    a.groupId === b.groupId &&
    a.includeAdmins === b.includeAdmins &&
    a.includeDeleted === b.includeDeleted &&
    a.growthDays === b.growthDays &&
    a.levelCompetencyId === b.levelCompetencyId &&
    a.minLevel === b.minLevel &&
    a.exactLevel === b.exactLevel
  )
}

function gkey(userId: string, competencyId: string) {
  return `${userId}:${competencyId}`
}

type GrowthMap = Record<string, number> // key = `${userId}:${competencyId}`

export function MatrixPage({ meRole }: { meRole: 'USER' | 'ADMIN' }) {
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const urlFilters = useMemo(() => parseFiltersFromUrl(sp), [sp.toString()])
  const [data, setData] = useState<MatrixFast | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [mode, setMode] = useState<EditMode>('inline')
  const [dirty, setDirty] = useState<DirtyMap>({})
  const [pending, setPending] = useState<PendingMap>({})
  const [saving, setSaving] = useState(false)

  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([])
  const [filters, setFilters] = useState<MatrixFiltersState>({
    ...urlFilters,
    growthDays: urlFilters.growthDays ?? 90,
  })

  const [growth, setGrowth] = useState<GrowthMap>({})

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
      const q = (filtersNow.q ?? '').trim()
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
        includeDeleted: filtersNow.includeDeleted,
        levelCompetencyId: filtersNow.levelCompetencyId || undefined,
        minLevel: filtersNow.minLevel,
        exactLevel: filtersNow.exactLevel,
      })

      setData(m)
      setDirty({})
      setPending({})

      try {
        const userIdsNow = m.rows.map(r => r.userId)
        const compIdsNow = m.columns.map(c => c.id)

        if (userIdsNow.length && compIdsNow.length) {
          const res = await growthService.get({
            days: filtersNow.growthDays ?? 90,
            userIds: userIdsNow,
            competencyIds: compIdsNow,
          })
          const map: GrowthMap = {}
          for (const it of res.items) map[gkey(it.userId, it.competencyId)] = it.growth
          setGrowth(map)
        } else {
          setGrowth({})
        }
      } catch {
        setGrowth({})
      }

    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  useBeforeUnload(mode === 'bulk' && dirtyCount > 0)

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

  useEffect(() => {
    competencyGroupsService.listActive()
      .then((gs) => setGroups(gs.map((g) => ({ id: g.id, name: g.name }))))
      .catch(() => setGroups([]))
  }, [])

  useEffect(() => {
    loadWith({ ...filters, q: debouncedQ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type, filters.groupId, filters.includeAdmins, filters.includeDeleted, filters.levelCompetencyId, filters.minLevel, filters.exactLevel, filters.growthDays, debouncedQ])

  // ha eltűnik a kiválasztott kompetencia a columns-ból, reseteljük a level filtert
  useEffect(() => {
    if (!data) return
    if (!filters.levelCompetencyId) return
    const ok = data.columns.some((c) => c.id === filters.levelCompetencyId)
    if (!ok) {
      setFilters((prev) => ({ ...prev, levelCompetencyId: '', minLevel: undefined, exactLevel: undefined }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filters.levelCompetencyId])

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
        columns={data.columns.map((c) => ({ id: c.id, name: c.name }))}
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
        growth={growth}
        onCellClick={handleCellClick}
        onUserClick={(userId) => {
          const qs = filtersToUrlParams(filters).toString()
          navigate(`/users/${userId}${qs ? `?${qs}` : ''}`)
        }}
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
