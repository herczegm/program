import React, { useMemo } from 'react'
import type { MatrixFast } from '../../services/matrixService'

export type EditMode = 'inline' | 'bulk'

type DirtyMap = Record<string, number> // key = `${userId}:${competencyId}`

export function MatrixTable({
  data,
  editable,
  mode,
  dirty,
  onCellClick,
}: {
  data: MatrixFast
  editable: boolean
  mode: EditMode
  dirty: DirtyMap
  onCellClick: (userId: string, competencyId: string, nextLevel: number) => void
}) {
  const columns = data.columns
  const rows = data.rows
  const groupHeaders = data.groupHeaders

  // gyors lookup: competencyId -> column index
  const colIndexById = data.colIndexById

  const competencyIdByColIndex = useMemo(() => columns.map((c) => c.id), [columns])

  function keyOf(userId: string, competencyId: string) {
    return `${userId}:${competencyId}`
  }

  function getLevel(userId: string, competencyId: string, fallbackDense: number[], colIdx: number) {
    const k = keyOf(userId, competencyId)
    const dirtyVal = dirty[k]
    if (dirtyVal !== undefined) return dirtyVal
    return fallbackDense[colIdx] ?? data.meta.defaultLevel
  }

  function nextLevel(current: number) {
    // 0->1->2->3->0
    return current >= 3 ? 0 : current + 1
  }

  return (
    <div style={{ overflow: 'auto', border: '1px solid #ddd', borderRadius: 10 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          {/* Group header sor */}
          <tr>
            <th style={th} />
            {groupHeaders.map((g) => (
              <th key={g.groupId} style={thGroup} colSpan={g.span}>
                {g.groupName}
              </th>
            ))}
          </tr>

          {/* Competency header sor */}
          <tr>
            <th style={th}>User</th>
            {columns.map((c) => (
              <th key={c.id} style={th} title={`${c.groupName} • ${c.type}`}>
                {c.name}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.userId}>
              <td style={tdUser}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <b>{r.username}</b>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>{r.role}</span>
                </div>
                {r.displayName ? <div style={{ fontSize: 12, opacity: 0.75 }}>{r.displayName}</div> : null}
              </td>

              {columns.map((c) => {
                const colIdx = colIndexById[c.id]
                const current = getLevel(r.userId, c.id, r.levelsDense, colIdx)
                const canEdit = editable

                return (
                  <td
                    key={c.id}
                    style={{
                      ...td,
                      cursor: canEdit ? 'pointer' : 'default',
                      opacity: canEdit ? 1 : 0.7,
                      background: dirty[`${r.userId}:${c.id}`] !== undefined ? 'rgba(255, 215, 0, 0.15)' : undefined,
                      textAlign: 'center',
                      userSelect: 'none',
                    }}
                    onClick={() => {
                      if (!canEdit) return
                      const n = nextLevel(current)
                      onCellClick(r.userId, c.id, n)
                    }}
                    onKeyDown={(e) => {
                        if (!canEdit) return

                        // közvetlen beállítás 0-3
                        if (e.key === '0' || e.key === '1' || e.key === '2' || e.key === '3') {
                            e.preventDefault()
                            onCellClick(r.userId, c.id, Number(e.key))
                            return
                        }

                        // gyors léptetés
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onCellClick(r.userId, c.id, nextLevel(current))
                            return
                        }
                    }}
                    onFocus={(e) => {
                        // fókusz stílus: cellán border
                        ;(e.currentTarget as HTMLTableCellElement).style.boxShadow = 'inset 0 0 0 2px #111'
                    }}
                    onBlur={(e) => {
                        ;(e.currentTarget as HTMLTableCellElement).style.boxShadow = ''
                    }}
                    title={
                      canEdit
                        ? 'Click: next • Keys: 0-3 set • Enter/Space: next'
                        : 'Nincs jogosultság'
                    }
                  >
                    <LevelPill level={current} />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ padding: 10, borderTop: '1px solid #eee', fontSize: 12, opacity: 0.8 }}>
        Rows: {rows.length} • Columns: {competencyIdByColIndex.length}
      </div>
    </div>
  )
}

function LevelPill({ level }: { level: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        minWidth: 26,
        padding: '2px 8px',
        borderRadius: 999,
        border: '1px solid #ddd',
      }}
    >
      {level}
    </span>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: 8,
  borderBottom: '1px solid #eee',
  whiteSpace: 'nowrap',
  background: '#fafafa',
}

const thGroup: React.CSSProperties = {
  ...th,
  textAlign: 'center',
  fontWeight: 600,
}

const td: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #f2f2f2',
  verticalAlign: 'top',
}

const tdUser: React.CSSProperties = {
  ...td,
  minWidth: 180,
}
