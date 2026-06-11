import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ordersAPI } from '../services/api'

const statusConfig = {
  pending: {
    className: 'status-badge status-badge--pending',
    description: 'Siparisin onay bekliyor.',
    label: 'Bekliyor',
  },
  accepted: {
    className: 'status-badge status-badge--accepted',
    description: 'Dukkan siparisini kabul etti.',
    label: 'Kabul Edildi',
  },
  preparing: {
    className: 'status-badge status-badge--preparing',
    description: 'Kahven hazirlaniyor.',
    label: 'Hazirlaniyor',
  },
  ready: {
    className: 'status-badge status-badge--ready',
    description: 'Siparisin teslime hazir.',
    label: 'Hazir',
  },
  delivered: {
    className: 'status-badge status-badge--delivered',
    description: 'Siparisin teslim edildi.',
    label: 'Teslim Edildi',
  },
}

export default function QRCodePage() {
  const { orderId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [order, setOrder] = useState(location.state?.order || null)
  const [loading, setLoading] = useState(!location.state?.order)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    let intervalId

    const fetchOrder = async ({ silent = false } = {}) => {
      try {
        const data = await ordersAPI.getDetail(orderId)

        if (!isMounted) {
          return
        }

        setOrder(data)
        setError('')

        if (data.status === 'delivered' && intervalId) {
          clearInterval(intervalId)
        }
      } catch (err) {
        if (isMounted && !silent) {
          setError(err.response?.data?.detail || 'Siparis detayi yuklenemedi.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchOrder()
    intervalId = setInterval(() => {
      fetchOrder({ silent: true })
    }, 4000)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [orderId])

  if (loading) {
    return <div className="page-state">QR ekrani yukleniyor...</div>
  }

  if (error) {
    return <div className="page-state">{error}</div>
  }

  const qrValue = order?.qr_code || ''
  const status = statusConfig[order?.status] || {
    className: 'status-badge',
    description: 'Siparis durumu guncelleniyor.',
    label: order?.status || 'Bilinmiyor',
  }
  const isDelivered = order?.status === 'delivered'

  return (
    <section className="page-section narrow">
      <div className="section-heading">
        <div>
          <div className="eyebrow">QR Ekrani</div>
          <h1>Siparis hazirlaniyor</h1>
          <p className="muted">Dukkan tesliminde bu QR kodu goster.</p>
        </div>
      </div>

      <div className="panel qr-panel">
        {!isDelivered && qrValue ? (
          <>
            <div className="qr-box">
              <QRCodeSVG value={qrValue} size={240} />
            </div>
            <p className="muted">Siparis no: #{order.id}</p>
          </>
        ) : isDelivered ? (
          <div className="qr-success">
            <div className="eyebrow">Teslim Tamamlandi</div>
            <h2>Afiyet olsun</h2>
            <p className="muted">Siparisin teslim edildi. Yeni bir kahve icin tekrar bekleriz.</p>
          </div>
        ) : (
          <div className="empty-state">Bu siparis icin QR bilgisi bulunamadi.</div>
        )}
      </div>

      {order ? (
        <div className="card-grid single">
          <article className="card">
            <div className="card__meta">Durum</div>
            <div className={status.className}>{status.label}</div>
            <p>{status.description}</p>
            <p>Toplam: {(order.total_cents / 100).toFixed(2)} TL</p>
            <p>Olusturma: {new Date(order.created_at).toLocaleString('tr-TR')}</p>
          </article>
        </div>
      ) : null}

      <div className="button-row">
        <button type="button" className="button button--ghost" onClick={() => navigate('/history')}>
          Gecmise git
        </button>
        <button type="button" className="button" onClick={() => navigate('/home')}>
          Ana sayfa
        </button>
      </div>
    </section>
  )
}
