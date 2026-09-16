/**
 * Gesture swipe (not sticky Mail buttons). Physical map: right → delete, left → edit.
 * See `src/lib/swipe.ts`. After commit/cancel the row always snaps to translateX(0).
 */
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import {
  SWIPE_AXIS_LOCK_PX,
  SWIPE_SNAP_MS,
  clampSwipeOffset,
  prefersReducedMotion,
  releaseSwipe,
  swipeArmed,
  swipeFeedbackMs,
} from '../lib/swipe'

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
  const [phase, setPhase] = useState<'idle' | 'dragging' | 'feedback'>('idle')
  const xRef = useRef(0)
  const startX = useRef(0)
  const startY = useRef(0)
  const axis = useRef<'undecided' | 'h' | 'v'>('undecided')
  const dragging = useRef(false)
  const suppressClick = useRef(false)
  const phaseRef = useRef(phase)
  const timerRef = useRef<number>(0)
  const idRef = useRef(`swipe_${Math.random().toString(36).slice(2)}`)
  const canEdit = Boolean(onEdit)
  const canDelete = Boolean(onDelete)
  const armed = swipeArmed(x, canEdit, canDelete)

  phaseRef.current = phase

  useEffect(() => {
    const close = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (detail !== idRef.current && xRef.current !== 0 && phaseRef.current !== 'feedback') {
        xRef.current = 0
        setX(0)
        setPhase('idle')
      }
    }
    window.addEventListener('hy-swipe', close)
    return () => window.removeEventListener('hy-swipe', close)
  }, [])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  if (!onEdit && !onDelete) return children

  function commit(next: number) {
    xRef.current = next
    setX(next)
  }

  function finish(action: 'edit' | 'delete' | null, holdPx: number) {
    dragging.current = false
    axis.current = 'undecided'
    if (!action) {
      setPhase('idle')
      commit(0)
      return
    }
    const delay = swipeFeedbackMs(prefersReducedMotion())
    commit(holdPx)
    setPhase('feedback')
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      commit(0)
      setPhase('idle')
      if (action === 'delete') onDelete?.()
      else onEdit?.()
    }, delay)
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    if (phaseRef.current === 'feedback') return
    startX.current = event.clientX
    startY.current = event.clientY
    axis.current = 'undecided'
    dragging.current = true
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging.current || phaseRef.current === 'feedback') return
    const dx = event.clientX - startX.current
    const dy = event.clientY - startY.current
    if (axis.current === 'undecided') {
      if (Math.abs(dx) < SWIPE_AXIS_LOCK_PX && Math.abs(dy) < SWIPE_AXIS_LOCK_PX) return
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      if (axis.current === 'h') {
        event.currentTarget.setPointerCapture(event.pointerId)
        window.dispatchEvent(new CustomEvent('hy-swipe', { detail: idRef.current }))
        setPhase('dragging')
      }
    }
    if (axis.current !== 'h') return
    event.preventDefault()
    commit(clampSwipeOffset(dx, canEdit, canDelete))
  }

  function onPointerUp() {
    if (!dragging.current) return
    dragging.current = false
    if (axis.current === 'h') {
      suppressClick.current = true
      const { action, holdPx } = releaseSwipe(xRef.current, canEdit, canDelete)
      finish(action, holdPx)
      return
    }
    axis.current = 'undecided'
    setPhase('idle')
  }

  function onClickCapture(event: { preventDefault: () => void; stopPropagation: () => void }) {
    if (suppressClick.current) {
      event.preventDefault()
      event.stopPropagation()
      suppressClick.current = false
    }
  }

  return (
    <div
      className={`swipe-wrap${armed ? ` swipe-armed-${armed}` : ''}`}
      data-swipe-phase={phase}
    >
      <div className="swipe-bg" dir="ltr" aria-hidden="true">
        {canDelete ? (
          <div className={`swipe-peek delete${armed === 'delete' ? ' armed' : ''}`} style={{ width: Math.max(0, x) }}>
            <span>حذف</span>
          </div>
        ) : null}
        {canEdit ? (
          <div className={`swipe-peek edit${armed === 'edit' ? ' armed' : ''}`} style={{ width: Math.max(0, -x) }}>
            <span>ویرایش</span>
          </div>
        ) : null}
      </div>
      <div
        className={`swipe-front${phase === 'dragging' ? ' dragging' : ''}`}
        style={{
          transform: `translate3d(${x}px, 0, 0)`,
          transition: phase === 'dragging' ? 'none' : `transform ${SWIPE_SNAP_MS}ms ease-out`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  )
}
