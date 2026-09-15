import { useRef } from 'react'
import { formatPersianDateFull } from '../lib/dates'

export function DateField({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string
  value: string
  onChange: (iso: string) => void
  readOnly?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)

  return (
    <button
      className={`field-chip${readOnly ? ' chip-readonly' : ''}`}
      type="button"
      disabled={readOnly}
      onClick={() => {
        if (readOnly) return
        const input = ref.current
        if (!input) return
        const picker = input as HTMLInputElement & { showPicker?: () => void }
        if (typeof picker.showPicker === 'function') picker.showPicker()
        else input.click()
      }}
    >
      <span className="ficon">📆</span>
      <div>
        <div className="flabel">{label}</div>
        <div className={value ? 'fvalue' : 'fvalue placeholder-val'}>
          {value ? formatPersianDateFull(value) : 'انتخاب تاریخ…'}
        </div>
      </div>
      {readOnly ? <span className="readonly-tag">قفل</span> : <span className="fchev">‹</span>}
      <input
        ref={ref}
        className="date-overlay"
        type="date"
        value={value}
        tabIndex={-1}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
      />
    </button>
  )
}
