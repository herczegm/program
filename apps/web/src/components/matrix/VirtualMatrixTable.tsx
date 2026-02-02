import React, { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { MatrixFast } from '../../services/matrixService'
import type { EditMode } from './MatrixTable'

type DirtyMap = Record<string, number> // key = `${userId}:${competencyId}`

const USER_COL_W = 220
const COL_W = 96
const ROW_H = 44
const HEADER_H = 74 // 2 sor fejléchez összesen kb.

function keyOf(userId: string, competencyId: string) {
  return `${userId}:${competencyId}`
}

function nextLevel(current: number) {
  return current >= 3 ? 0 : current + 1
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
        background: '#fff',
      }}
    >
      {level}
    </span>
  )
}

function Stars({ v }: { v: number }) {
  // pozitív growth -> csillagok; negatív -> mínusz jelzés (opcionális)
  const n = Math.max(0, Math.min(3, Math.floor(v)))
  const down = v < 0
  return (
    <span style={{ fontSize: 12, opacity: 0.85, marginLeft: 6, color: down ? 'crimson' : 'inherit' }} title={`Growth: ${v}`}>
      {down ? '↓' : ''}
      {'★'.repeat(n)}
    </span>
  )
}

export function VirtualMatrixTable({
  data,
  editable,
  mode,
  dirty,
  growth,
  onCellClick,
  onUserClick,
}: {
  data: MatrixFast
  editable: boolean
  mode: EditMode
  dirty: DirtyMap
  growth?: Record<string, number> 
  onCellClick: (userId: string, competencyId: string, nextLevel: number) => void
  onUserClick?: (userId: string) => void
}) {
  const parentRef = useRef<HTMLDivElement | null>(null)

  const columns = data.columns
  const rows = data.rows
  const groupHeaders = data.groupHeaders

  // 2D virtualizáció ugyanarra a scroll elementre
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 8,
  })

  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: columns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => COL_W,
    overscan: 6,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const virtualCols = colVirtualizer.getVirtualItems()

  const totalW = colVirtualizer.getTotalSize()
  const totalH = rowVirtualizer.getTotalSize()

  const colIdByIndex = useMemo(() => columns.map((c) => c.id), [columns])

  // group header szegmensek a látható oszlop-tartományra (colSpan helyett abs pozíció)
  const groupSegments = useMemo(() => {
    if (virtualCols.length === 0) return []
    const from = virtualCols[0].index
    const to = virtualCols[virtualCols.length - 1].index

    // csoportok -> [startIndex, endIndex] metszet számítása a látható tartománnyal
    const segs: Array<{ groupId: string; groupName: string; left: number; width: number }> = []

    for (const g of groupHeaders) {
      const gFrom = g.start
      const gTo = g.start + g.span - 1
      const ovFrom = Math.max(from, gFrom)
      const ovTo = Math.min(to, gTo)
      if (ovFrom > ovTo) continue

      const first = colVirtualizer.getVirtualItems().find((v) => v.index === ovFrom)
      const last = colVirtualizer.getVirtualItems().find((v) => v.index === ovTo)

      // A fenti find nem garantált (mert getVirtualItems csak visible), ezért inkább a start/size képlet:
      // left = start(ovFrom), right = start(ovTo) + size(ovTo)
      const left = ovFrom * COL_W
      const right = (ovTo * COL_W) + COL_W

      segs.push({
        groupId: g.groupId,
        groupName: g.groupName,
        left,
        width: right - left,
      })
    }
    return segs
  }, [groupHeaders, virtualCols, colVirtualizer])

  function getLevel(userId: string, competencyId: string, dense: number[], colIdx: number) {
    const k = keyOf(userId, competencyId)
    const dirtyVal = dirty[k]
    if (dirtyVal !== undefined) return dirtyVal
    return dense[colIdx] ?? data.meta.defaultLevel
  }

  return (
    <div
      ref={parentRef}
      style={{
        height: '70vh',
        border: '1px solid #ddd',
        borderRadius: 10,
        overflow: 'auto',
        position: 'relative',
        background: '#fff',
      }}
    >
      {/* Sticky header (2 sor) */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: '#fafafa',
          borderBottom: '1px solid #eee',
        }}
      >
        {/* Group header sor */}
        <div style={{ display: 'flex' }}>
          <div style={{ width: USER_COL_W, padding: 8, fontWeight: 600 }}> </div>
          <div style={{ position: 'relative', width: totalW, height: 32 }}>
            {groupSegments.map((s) => (
              <div
                key={s.groupId + ':' + s.left}
                style={{
                  position: 'absolute',
                  left: s.left,
                  width: s.width,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  borderLeft: '1px solid #eee',
                }}
                title={s.groupName}
              >
                {s.groupName}
              </div>
            ))}
          </div>
        </div>

        {/* Competency header sor */}
        <div style={{ display: 'flex' }}>
          <div style={{ width: USER_COL_W, padding: 8, fontWeight: 600 }}>User</div>
          <div style={{ position: 'relative', width: totalW, height: 42 }}>
            {virtualCols.map((vc) => {
              const c = columns[vc.index]

              return (
                <div
                  key={c.id}
                  style={{
                    position: 'absolute',
                    left: vc.index * COL_W,
                    width: COL_W,
                    height: '100%',
                    padding: '8px 8px',
                    borderLeft: '1px solid #eee',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: 600,
                  }}
                  title={`${c.groupName} • ${c.type}`}
                >
                  {c.name}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content spacer (a sticky header miatt) */}
      <div style={{ height: HEADER_H }} />

      {/* Virtual body container */}
      <div style={{ position: 'relative', width: USER_COL_W + totalW, height: totalH }}>
        {virtualRows.map((vr) => {
          const r = rows[vr.index]
          const top = vr.start

          return (
            <div
              key={r.userId}
              style={{
                position: 'absolute',
                top,
                left: 0,
                height: ROW_H,
                width: USER_COL_W + totalW,
                display: 'flex',
                borderBottom: '1px solid #f2f2f2',
              }}
            >
              {/* User cell */}
              <div style={{ width: USER_COL_W, padding: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <button
                    type='button'
                    onClick={() => onUserClick?.(r.userId)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: onUserClick ? 'pointer' : 'default',
                      textAlign: 'left',
                      fontWeight: 700,
                    }}
                    title='User detail'
                  >
                    {r.username}
                  </button>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>{r.role}</span>
                </div>
                {r.displayName ? <div style={{ fontSize: 12, opacity: 0.75 }}>{r.displayName}</div> : null}
              </div>

              {/* Cells */}
              <div style={{ position: 'relative', width: totalW }}>
                {virtualCols.map((vc) => {
                  const colIdx = vc.index
                  const competencyId = colIdByIndex[colIdx]
                  const current = getLevel(r.userId, competencyId, r.levelsDense, colIdx)
                  const canEdit = editable
                  const dirtyKey = keyOf(r.userId, competencyId)
                  const isDirty = dirty[dirtyKey] !== undefined
                  const gr = growth?.[dirtyKey] ?? 0
                  const editTitle = canEdit
                    ? mode === 'inline'
                      ? 'Click: mentés azonnal • 0-3: beállít'
                      : 'Click: változás jelölve (Save kell) • 0-3: beállít'
                    : 'Nincs jogosultság'

                  const title = growth
                    ? `${editTitle} • Growth: ${gr}`
                    : editTitle

                  return (
                    <div
                      key={competencyId}
                      tabIndex={canEdit ? 0 : -1}
                      style={{
                        position: 'absolute',
                        left: colIdx * COL_W,
                        width: COL_W,
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderLeft: '1px solid #f2f2f2',
                        background: isDirty ? 'rgba(255, 215, 0, 0.15)' : undefined,
                        cursor: canEdit ? 'pointer' : 'default',
                        opacity: canEdit ? 1 : 0.7,
                        userSelect: 'none',
                        outline: 'none',
                      }}
                      onClick={() => {
                        if (!canEdit) return
                        onCellClick(r.userId, competencyId, nextLevel(current))
                      }}
                      onKeyDown={(e) => {
                        if (!canEdit) return

                        if (e.key === '0' || e.key === '1' || e.key === '2' || e.key === '3') {
                          e.preventDefault()
                          onCellClick(r.userId, competencyId, Number(e.key))
                          return
                        }
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onCellClick(r.userId, competencyId, nextLevel(current))
                          return
                        }
                      }}
                      onFocus={(e) => {
                        ; (e.currentTarget as HTMLDivElement).style.boxShadow = 'inset 0 0 0 2px #111'
                      }}
                      onBlur={(e) => {
                        ; (e.currentTarget as HTMLDivElement).style.boxShadow = ''
                      }}
                      title={title}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LevelPill level={current} />
                        {growth ? <Stars v={gr} /> : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
