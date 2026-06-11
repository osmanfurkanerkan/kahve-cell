import { useEffect, useState } from 'react'
import { subscriptionsAPI } from '../services/api'

const defaultPaymentMethod = {
  card_holder: 'KahveCell Test',
  card_number: '4242-4242-4242-4242',
  cvv: '123',
  expiry_month: 12,
  expiry_year: 2030,
}

export default function Subscription() {
  const [subscription, setSubscription] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyPlan, setBusyPlan] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('')
  const [paymentMethod, setPaymentMethod] = useState(defaultPaymentMethod)

  useEffect(() => {
    Promise.allSettled([subscriptionsAPI.getMySubscription(), subscriptionsAPI.getPlans()]).then(
      ([subscriptionResult, plansResult]) => {
        if (subscriptionResult.status === 'fulfilled') {
          setSubscription(subscriptionResult.value)
        }

        if (plansResult.status === 'fulfilled') {
          setPlans(plansResult.value)
        } else {
          setError('Planlar yuklenemedi.')
        }

        setLoading(false)
      },
    )
  }, [])

  const handlePaymentChange = (field, value) => {
    setPaymentMethod((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const closeModal = () => {
    setSelectedPlan('')
    setPaymentMethod(defaultPaymentMethod)
  }

  const openPurchaseModal = (planName) => {
    setError('')
    setMessage('')
    setSelectedPlan(planName)
    setPaymentMethod(defaultPaymentMethod)
  }

  const handlePlanAction = async (event) => {
    event.preventDefault()
    setBusyPlan(selectedPlan)
    setError('')
    setMessage('')

    try {
      const nextSubscription =
        subscription && subscription.plan !== selectedPlan
          ? await subscriptionsAPI.switchPlan(selectedPlan, paymentMethod)
          : await subscriptionsAPI.purchase(selectedPlan, paymentMethod)

      setSubscription(nextSubscription)
      setMessage(`${selectedPlan} paketi aktif edildi.`)
      closeModal()
    } catch (err) {
      setError(err.response?.data?.detail || 'Paket islemi basarisiz oldu.')
    } finally {
      setBusyPlan('')
    }
  }

  const handleCancel = async () => {
    setError('')
    setMessage('')

    try {
      await subscriptionsAPI.cancel()
      setSubscription(null)
      setMessage('Abonelik iptal edildi.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Abonelik iptal edilemedi.')
    }
  }

  if (loading) {
    return <div className="page-state">Abonelik bilgileri yukleniyor...</div>
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Abonelik</div>
          <h1>Paketler</h1>
          <p className="muted">Paket sec, test karti ile odemeyi tamamla.</p>
        </div>
      </div>

      {error ? <div className="notice notice--error">{error}</div> : null}
      {message ? <div className="notice">{message}</div> : null}

      {subscription ? (
        <div className="panel current-plan">
          <div>
            <div className="card__meta">Aktif plan</div>
            <h2>{subscription.plan}</h2>
            <p>Kalan kahve hakki: {subscription.remaining_credits}</p>
            <p>Bitis: {new Date(subscription.end_date).toLocaleDateString('tr-TR')}</p>
          </div>

          <button type="button" className="button button--ghost" onClick={handleCancel}>
            Iptal Et
          </button>
        </div>
      ) : (
        <div className="empty-state">Aktif aboneliginiz yok.</div>
      )}

      <div className="card-grid">
        {plans.map((plan) => (
          <article key={plan.name} className="card">
            <div className="card__meta">Paket</div>
            <h3>{plan.name}</h3>
            <strong>{plan.price} TL</strong>
            <p>{plan.description}</p>
            <p>{plan.credits === -1 ? 'Sinirsiz kahve hakki' : `${plan.credits} kahve hakki`}</p>
            <button
              type="button"
              className="button button--coffee"
              disabled={busyPlan === plan.name}
              onClick={() => openPurchaseModal(plan.name)}
            >
              Satin Al
            </button>
          </article>
        ))}
      </div>

      {selectedPlan ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <div className="eyebrow">Odeme</div>
                <h2 id="payment-modal-title">{selectedPlan} paketi</h2>
                <p className="muted">Kart bilgilerini kontrol edip satin almayi tamamla.</p>
              </div>

              <button type="button" className="button button--ghost" onClick={closeModal}>
                Kapat
              </button>
            </div>

            <form className="stack" onSubmit={handlePlanAction}>
              <label className="field">
                <span>Kart sahibi</span>
                <input
                  type="text"
                  value={paymentMethod.card_holder}
                  onChange={(event) => handlePaymentChange('card_holder', event.target.value)}
                  required
                />
              </label>

              <label className="field">
                <span>Kart numarasi</span>
                <input
                  type="text"
                  value={paymentMethod.card_number}
                  onChange={(event) => handlePaymentChange('card_number', event.target.value)}
                  required
                />
              </label>

              <p className="muted">Test karti, degistirmeyin.</p>

              <div className="payment-grid">
                <label className="field">
                  <span>Ay</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={paymentMethod.expiry_month}
                    onChange={(event) =>
                      handlePaymentChange('expiry_month', Number(event.target.value))
                    }
                    required
                  />
                </label>

                <label className="field">
                  <span>Yil</span>
                  <input
                    type="number"
                    min="2026"
                    value={paymentMethod.expiry_year}
                    onChange={(event) =>
                      handlePaymentChange('expiry_year', Number(event.target.value))
                    }
                    required
                  />
                </label>

                <label className="field">
                  <span>CVV</span>
                  <input
                    type="text"
                    value={paymentMethod.cvv}
                    onChange={(event) => handlePaymentChange('cvv', event.target.value)}
                    required
                  />
                </label>
              </div>

              <button
                type="submit"
                className="button button--coffee"
                disabled={busyPlan === selectedPlan}
              >
                {busyPlan === selectedPlan ? 'Odeme aliniyor...' : 'Odemeyi onayla'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}
