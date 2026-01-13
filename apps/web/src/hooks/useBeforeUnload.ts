import { useEffect } from 'react'

export function useBeforeUnload(shouldBlock: boolean) {
  useEffect(() => {
    if (!shouldBlock) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [shouldBlock])
}
