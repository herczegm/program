import React from 'react'

export function SaveBar({
  visible,
  dirtyCount,
  saving,
  onSave,
  onDiscard,
}: {
  visible: boolean
  dirtyCount: number
  saving: boolean
  onSave: () => void
  onDiscard: () => void
}) {
  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        padding: 12,
        borderRadius: 12,
        border: '1px solid #ddd',
        background: '#fff',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        zIndex: 50,
      }}
    >
      <div style={{ fontWeight: 600 }}>
        {dirtyCount} mentetlen változtatás
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onDiscard} disabled={saving}>Discard</button>
        <button onClick={onSave} disabled={saving || dirtyCount === 0}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
