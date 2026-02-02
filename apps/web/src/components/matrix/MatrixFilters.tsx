import React, { useMemo } from 'react'

export type MatrixFiltersState = {
  q: string
  type: 'ALL' | 'CORE' | 'CUSTOM'
  groupId: string | 'ALL'
  includeAdmins: boolean
  includeDeleted: boolean
  levelCompetencyId?: string
  minLevel?: number
  exactLevel?: number
  growthDays: 30 | 90 | 180
}

export function MatrixFilters({
  groups,
  columns,
  value,
  onChange,
  disabled,
}: {
  groups: Array<{ id: string; name: string }>
  columns: Array<{ id: string; name: string }>
  value: MatrixFiltersState
  onChange: (next: MatrixFiltersState) => void
  disabled?: boolean
}) {
  const groupOptions = useMemo(() => [{ id: 'ALL', name: 'All groups' }, ...groups.map(g => ({ id: g.id, name: g.name }))], [groups])

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      {/* user search */}
      <label style={lbl}>
        Search user:
        <input
          style={inp}
          disabled={disabled}
          value={value.q}
          onChange={(e) => onChange({ ...value, q: e.target.value })}
          placeholder="e.g. jani"
        />
      </label>

      {/* type select */}
      <label style={lbl}>
        Type:
        <select
          style={inp}
          disabled={disabled}
          value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value as any })}
        >
          <option value="ALL">ALL</option>
          <option value="CORE">CORE</option>
          <option value="CUSTOM">CUSTOM</option>
        </select>
      </label>

      {/* group select */}
      <label style={lbl}>
        Group:
        <select
          style={inp}
          disabled={disabled}
          value={value.groupId}
          onChange={(e) => onChange({ ...value, groupId: e.target.value as any })}
        >
          {groupOptions.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>

      {/* level filter */}
      <label style={lbl}>
        Level filter:
        <select
          style={inp}
          disabled={disabled}
          value={value.levelCompetencyId || ''}
          onChange={(e) => {
            const id = e.target.value
            if (!id) {
              onChange({ ...value, levelCompetencyId: '', minLevel: undefined, exactLevel: undefined })
            } else {
              // default: minLevel=2 (kényelmes)
              onChange({ ...value, levelCompetencyId: id, minLevel: value.minLevel ?? 2, exactLevel: undefined })
            }
          }}
        >
          <option value="">(none)</option>
          {columns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label style={lbl}>
        Mode:
        <select
          style={inp}
          disabled={disabled || !value.levelCompetencyId}
          value={value.exactLevel !== undefined ? 'EXACT' : value.minLevel !== undefined ? 'MIN' : 'MIN'}
          onChange={(e) => {
            const mode = e.target.value
            if (mode === 'EXACT') {
              onChange({ ...value, exactLevel: value.exactLevel ?? (value.minLevel ?? 2), minLevel: undefined })
            } else {
              onChange({ ...value, minLevel: value.minLevel ?? (value.exactLevel ?? 2), exactLevel: undefined })
            }
          }}
        >
          <option value="MIN">≥</option>
          <option value="EXACT">=</option>
        </select>
      </label>

      <label style={lbl}>
        Level:
        <select
          style={inp}
          disabled={disabled || !value.levelCompetencyId}
          value={String(value.exactLevel ?? value.minLevel ?? 2)}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (value.exactLevel !== undefined) onChange({ ...value, exactLevel: n })
            else onChange({ ...value, minLevel: n, exactLevel: undefined })
          }}
        >
          {[0, 1, 2, 3].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

      <label style={lbl}>
        Growth:
        <select
          style={inp}
          disabled={disabled}
          value={value.growthDays}
          onChange={(e) => onChange({ ...value, growthDays: Number(e.target.value) as any })}
        >
          <option value={30}>30 nap</option>
          <option value={90}>90 nap</option>
          <option value={180}>180 nap</option>
        </select>
      </label>
      
      {/* checkboxok*/}
      <label style={{ ...lbl, gap: 6 }}>
        <input
          type="checkbox"
          disabled={disabled}
          checked={value.includeAdmins}
          onChange={(e) => onChange({ ...value, includeAdmins: e.target.checked })}
        />
        Include admins
      </label>
      <label style={{ ...lbl, gap: 6 }}>
        <input
          type="checkbox"
          checked={value.includeDeleted}
          onChange={(e) => onChange({ ...value, includeDeleted: e.target.checked })}
          disabled={disabled}
        />
        Include deleted
      </label>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, opacity: 0.9 }
const inp: React.CSSProperties = { padding: '6px 8px', borderRadius: 8, border: '1px solid #ddd' }
