import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ordersAPI } from '../services/api'

const statusLabels = {
  accepted: 'Kabul Edildi',
  delivered: 'Teslim Edildi',
  pending: 'Bekliyor',
  preparing: 'Hazirlaniyor',
  ready: 'Hazir',
}

export default function History() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    ordersAPI
      .getHistory()
      .then((data) => {
        if (isMounted) {
          setOrders(data)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.detail || 'Siparis gecmisi yuklenemedi.')
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return <div className="page-state">Siparis gecmisi yukleniyor...</div>
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Gecmis</div>
          <h1>Siparisler</h1>
          <p className="muted">Tum siparislerini tek ekranda takip et.</p>
        </div>
      </div>

      {error ? <div className="notice notice--error">{error}</div> : null}

      {orders.length > 0 ? (
        <div className="history-list">
          {orders.map((order) => (
            <article key={order.id} className="history-row">
              <div className="history-row__main">
                <div className="card__meta">Siparis #{order.id}</div>
                <h3>{order.product_name || `Urun #${order.product_id}`}</h3>
                <p className="muted">{order.shop_name || `Dukkan #${order.shop_id}`}</p>
              </div>

              <div className="history-row__detail">
                <span>{new Date(order.created_at).toLocaleString('tr-TR')}</span>
                <span>{statusLabels[order.status] || order.status}</span>
                <Link to={`/qr/${order.id}`} className="button button--ghost">
                  Detayi Gor
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>Henuz siparis bulunmuyor.</p>
          <p className="muted">Bir dukkan sec ve ilk kahveni siparis ver.</p>
        </div>
      )}
    </section>
  )
}
