import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'

const ACTION = 88
const OPEN = 56
const FULL = 148

export function SwipeRow({
  children,
  onEdit,
  onDelete,
}: {
  children: ReactNode
  onEdit?: () => void
  onDelete?: () => void
}) {
  const [x, setX] = useState(0)
  const xRef = useRef(0)
  const startX = useRef(0)
  const startY = useRef(0)
  const startOffset = useRef(0)
  const axis = useRef<'undecided' | 'h' | 'v'>('undecided')
  const dragging = useRef(false)
  const suppressClick = useRef(false)
  const idRef = useRef(`swipe_${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    const close = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (detail !== idRef.current && xRef.current !== 0) {
        xRef.current = 0
        setX(0)
      }
    }
    window.addEventListener('hy-swipe', close)
    return () => window.removeEventListener('hy-swipe', close)
  }, [])

  if (!onEdit && !onDelete) return children

  function commit(next: number) {
    xRef.current = next
    setX(next)
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    startX.current = event.clientX
    startY.current = event.clientY
    startOffset.current = xRef.current
    axis.current = 'undecided'
    dragging.current = true
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    const dx = event.clientX - startX.current
    const dy = event.clientY - startY.current
    if (axis.current === 'undecided') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      if (axis.current === 'h') {
        event.currentTarget.setPointerCapture(event.pointerId)
        window.dispatchEvent(new CustomEvent('hy-swipe', { detail: idRef.current }))
      }
    }
    if (axis.current !== 'h') return
    event.preventDefault()
    const min = onEdit ? -ACTION - 20 : 0
    const max = onDelete ? ACTION + 20 : 0
    commit(Math.max(min, Math.min(max, startOffset.current + dx)))
  }

  function onPointerUp() {
    if (!dragging.current) return
    dragging.current = false
    if (axis.current === 'h') {
      suppressClick.current = true
      const dx = xRef.current
      if (onDelete && dx >= FULL) {
        commit(0)
        onDelete()
      } else if (onEdit && dx <= -FULL) {
        commit(0)
        onEdit()
      } else if (onDelete && dx >= OPEN) commit(ACTION)
      else if (onEdit && dx <= -OPEN) commit(-ACTION)
      else commit(0)
    }
    axis.current = 'undecided'
  }

  function onClickCapture(event: { preventDefault: () => void; stopPropagation: () => void }) {
    if (suppressClick.current) {
      event.preventDefault()
      event.stopPropagation()
      suppressClick.current = false
      return
    }
    if (xRef.current !== 0) {
      event.preventDefault()
      event.stopPropagation()
      commit(0)
    }
  }

  return (
    <div className="swipe-wrap">
      <div className="swipe-bg" dir="ltr">
        {onDelete ? (
          <button type="button" className="swipe-action delete" onClick={onDelete}>
            حذف
          </button>
        ) : (
          <span />
        )}
        {onEdit ? (
          <button type="button" className="swipe-action edit" onClick={onEdit}>
            ویرایش
          </button>
        ) : (
          <span />
        )}
      </div>
      <div
        className="swipe-front"
        style={{ transform: `translate3d(${x}px, 0, 0)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  )
}
