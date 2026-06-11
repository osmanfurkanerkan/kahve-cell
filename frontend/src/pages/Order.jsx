import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ordersAPI, subscriptionsAPI } from '../services/api'

export default function Order() {
  const location = useLocation()
  const navigate = useNavigate()
  const { categoryName, productId, productName, shopId, shopName } = location.state || {}
  const [size, setSize] = useState('M')
  const [sugar, setSugar] = useState(1)
  const [milk, setMilk] = useState('normal')
  const [extras, setExtras] = useState([])
  const [loading, setLoading] = useState(false)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [subscription, setSubscription] = useState(null)
  const [error, setError] = useState('')

  if (!shopId || !productId) {
    return <Navigate to="/home" replace />
  }

  useEffect(() => {
    let isMounted = true

    subscriptionsAPI
      .getMySubscription()
      .then((data) => {
        if (isMounted) {
          setSubscription(data)
        }
      })
      .catch(() => {
        if (isMounted) {
          setSubscription(null)
        }
      })
      .finally(() => {
        if (isMounted) {
          setSubscriptionLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const toggleExtra = (extra) => {
    setExtras((current) =>
      current.includes(extra) ? current.filter((item) => item !== extra) : [...current, extra],
    )
  }

  const hasActiveSubscription = Boolean(subscription?.active)
  const isUnlimited = subscription?.remaining_credits === -1
  const hasCredits = isUnlimited || (subscription?.remaining_credits || 0) > 0
  const canOrder = hasActiveSubscription && hasCredits
  const remainingAfterOrder = isUnlimited ? 'Sinirsiz' : Math.max((subscription?.remaining_credits || 0) - 1, 0)

  const orderWarning = useMemo(() => {
    if (subscriptionLoading) {
      return 'Kredi bilgisi kontrol ediliyor...'
    }

    if (!hasActiveSubscription) {
      return 'Aktif abonelik bulunmuyor. Siparis icin once paket secmelisin.'
    }

    if (!hasCredits) {
      return 'Kredi hakkin bitmis. Yeni paket secmeden siparis veremezsin.'
    }

    if (isUnlimited) {
      return 'Bu siparis sonrasi kredi hakkin sinirsiz olarak devam edecek.'
    }

    return `Bu siparis sonrasi ${remainingAfterOrder} kredi kalacak.`
  }, [
    canOrder,
    hasActiveSubscription,
    hasCredits,
    isUnlimited,
    remainingAfterOrder,
    subscriptionLoading,
  ])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!canOrder) {
      navigate('/subscription')
      return
    }

    setLoading(true)
    setError('')

    try {
      const order = await ordersAPI.create(shopId, productId, 1, { size, sugar, milk, extras })
      navigate(`/qr/${order.id}`, { state: { order } })
    } catch (err) {
      setError(err.response?.data?.detail || 'Siparis olusturulamadi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-section narrow">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Siparis</div>
          <h1>{productName}</h1>
          <p className="muted">{shopName}</p>
          {categoryName ? <p className="muted">{categoryName}</p> : null}
        </div>

        <button type="button" className="button button--ghost" onClick={() => navigate(-1)}>
          Geri
        </button>
      </div>

      {error ? <div className="notice notice--error">{error}</div> : null}

      <form className="panel stack" onSubmit={handleSubmit}>
        <div className="order-summary">
          <div>
            <div className="card__meta">Secilen urun</div>
            <h2>{productName}</h2>
            <p className="muted">{shopName}</p>
          </div>

          <div className="credit-box">
            <span>Kalan kredi</span>
            <strong>
              {subscriptionLoading
                ? '...'
                : subscription
                  ? subscription.remaining_credits === -1
                    ? 'Sinirsiz'
                    : subscription.remaining_credits
                  : 'Yok'}
            </strong>
          </div>
        </div>

        <div className={canOrder ? 'notice notice--warm' : 'notice notice--error'}>{orderWarning}</div>

        <label className="field">
          <span>Boyut</span>
          <select value={size} onChange={(event) => setSize(event.target.value)}>
            <option value="S">Kucuk</option>
            <option value="M">Orta</option>
            <option value="L">Buyuk</option>
          </select>
        </label>

        <label className="field">
          <span>Seker seviyesi: {sugar}</span>
          <input
            type="range"
            min="0"
            max="3"
            value={sugar}
            onChange={(event) => setSugar(Number(event.target.value))}
          />
        </label>

        <label className="field">
          <span>Sut tipi</span>
          <select value={milk} onChange={(event) => setMilk(event.target.value)}>
            <option value="normal">Normal</option>
            <option value="oat">Yulaf</option>
            <option value="almond">Badem</option>
          </select>
        </label>

        <div className="field">
          <span>Ekstralar</span>
          <div className="checkbox-row">
            <label>
              <input
                type="checkbox"
                checked={extras.includes('extra_shot')}
                onChange={() => toggleExtra('extra_shot')}
              />
              Ekstra shot
            </label>
            <label>
              <input
                type="checkbox"
                checked={extras.includes('cinnamon')}
                onChange={() => toggleExtra('cinnamon')}
              />
              Tarcin
            </label>
          </div>
        </div>

        {canOrder ? (
          <button type="submit" className="button button--coffee" disabled={loading || subscriptionLoading}>
            {loading ? 'Siparis olusturuluyor...' : 'Siparisi tamamla'}
          </button>
        ) : (
          <button
            type="button"
            className="button button--coffee"
            onClick={() => navigate('/subscription')}
            disabled={subscriptionLoading}
          >
            Abonelik sayfasina git
          </button>
        )}
      </form>
    </section>
  )
}
