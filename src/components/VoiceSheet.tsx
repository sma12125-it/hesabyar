import { useState } from 'react'
import { parseVoiceCommand } from '../lib/voice'
import { formatRial } from '../lib/money'
import { useStore } from '../store/Store'

type Rec = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

export function VoiceSheet({ onClose }: { onClose: () => void }) {
  const { activeAccounts, addQuickEntry } = useStore()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const draft = parseVoiceCommand(text)

  function listen() {
    const Ctor = (window as Window & { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: new () => Rec }).webkitSpeechRecognition
    if (!Ctor) {
      setError('این مرورگر تشخیص گفتار ندارد. متن را بنویسید.')
      return
    }
    const rec = new Ctor()
    rec.lang = 'fa-IR'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (event) => setText(event.results[0]?.[0]?.transcript ?? '')
    rec.onerror = () => setError('گفتار شنیده نشد')
    rec.start()
  }

  async function confirm() {
    if (!draft) return
    const account = activeAccounts[0]
    if (!account) {
      setError('اول یک حساب بساز')
      return
    }
    setSaving(true)
    try {
      await addQuickEntry({
        kind: draft.kind,
        amount: draft.amount,
        accountId: account.id,
        categoryId: draft.kind === 'income' ? 'other-inc' : 'other-exp',
        note: draft.note || (draft.kind === 'income' ? 'درآمد صوتی' : 'هزینه صوتی'),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت نشد')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="glass-sheet" role="dialog" aria-label="دستیار صوتی">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h1>دستیار صوتی</h1>
          <button className="sheet-close" type="button" onClick={onClose} aria-label="بستن">✕</button>
        </div>
        <p className="sheet-sub">مثلاً «هزینه ۵۰ هزار خوراک» یا «درآمد ۲ میلیون حقوق». قبل از ذخیره تأیید کنید.</p>
        {error ? <div className="banner error"><span>{error}</span></div> : null}
        <textarea className="field-input voice-box" value={text} onChange={(e) => setText(e.target.value)} placeholder="اینجا بگویید یا بنویسید" />
        <button className="cta-confirm" type="button" onClick={listen}>شنیدن</button>
        {draft ? (
          <div className="banner">
            <span>{draft.kind === 'income' ? 'درآمد' : 'هزینه'} {formatRial(draft.amount)} ریال {draft.note ? `· ${draft.note}` : ''}</span>
          </div>
        ) : null}
        <button className="cta-confirm" type="button" disabled={!draft || saving} onClick={() => void confirm()}>
          {saving ? 'در حال ثبت…' : 'تأیید و ثبت'}
        </button>
      </div>
    </>
  )
}
