import React, { useMemo } from 'react'

export type MatrixFiltersState = {
  q: string
  type: 'ALL' | 'CORE' | 'CUSTOM'
  groupId: string | 'ALL'
  includeAdmins: boolean
  includeDeleted: boolean
}

export function MatrixFilters({
  groups,
  value,
  onChange,
  disabled,
}: {
  groups: Array<{ id: string; name: string }>
  value: MatrixFiltersState
  onChange: (next: MatrixFiltersState) => void
  disabled?: boolean
}) {
  const groupOptions = useMemo(() => [{ id: 'ALL', name: 'All groups' }, ...groups.map(g => ({ id: g.id, name: g.name }))], [groups])

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
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
