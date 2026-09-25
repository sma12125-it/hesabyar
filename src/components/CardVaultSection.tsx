import { useState } from 'react'
import { BankCardFace } from './BankCardFace'
import { useExtras } from '../store/Extras'

export function CardVaultSection({ onEdit }: { onEdit: (id: string) => void }) {
  const { unlocked, vaultConfigured, cards, unlockVault, lockVault, deleteCard } = useExtras()
  const [phrase, setPhrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<string | null>(null)

  async function unlock() {
    setError(null)
    try {
      await unlockVault(phrase)
    } catch {
      setError('رمز گاوصندوق نادرست است')
    }
  }

  return (
    <section className="card-vault">
      <div className="section-head">
        <h2>گاوصندوق کارت</h2>
        {unlocked ? <button className="link" type="button" onClick={lockVault}>قفل</button> : null}
      </div>
      <p className="sheet-sub">شماره، انقضا و CVV فقط با رمز شما رمزنگاری می‌شود.</p>
      {error ? <div className="banner error"><span>{error}</span></div> : null}
      {!vaultConfigured ? (
        <p className="sheet-sub">رمز گاوصندوق هنوز تعیین نشده. آن را در تنظیمات مشخص کنید.</p>
      ) : !unlocked ? (
        <div className="field-chip">
          <input className="field-input" type="password" placeholder="رمز گاوصندوق" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
          <button className="cat-mini" type="button" onClick={() => void unlock()}>باز کردن</button>
        </div>
      ) : (
        <>
          <div className="card-gallery">
            {cards.map((card) => (
              <div key={card.id}>
                <BankCardFace card={card} revealed={revealed === card.id} />
                {card.sheba ? <div className="plan-meta">شبا {card.sheba}</div> : null}
                {card.accountId ? <div className="plan-meta">متصل به حساب</div> : null}
                <div className="cat-actions">
                  <button className="cat-mini" type="button" onClick={() => setRevealed(revealed === card.id ? null : card.id)}>نمایش</button>
                  <button className="cat-mini" type="button" onClick={() => onEdit(card.id)}>ویرایش</button>
                  <button className="cat-mini danger" type="button" onClick={() => void deleteCard(card.id, phrase)}>حذف</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
