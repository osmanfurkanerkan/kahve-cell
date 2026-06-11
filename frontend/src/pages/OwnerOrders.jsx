import { useEffect, useMemo, useRef, useState } from 'react'
import { ordersAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const ownerShopMap = {
  '+905551234568': 1,
  '+905551234569': 2,
}

const tabs = [
  { key: 'pending', label: 'Bekleyen' },
  { key: 'accepted', label: 'Kabul Edilen' },
  { key: 'preparing', label: 'Hazirlaniyor' },
  { key: 'ready', label: 'Hazir' },
]

const actionByStatus = {
  accepted: { button: 'Hazirlamaya Basla', next: 'preparing' },
  pending: { button: 'Kabul Et', next: 'accepted' },
  preparing: { button: 'Hazir', next: 'ready' },
}

const labelByStatus = {
  accepted: 'Kabul Edilen',
  delivered: 'Teslim Edildi',
  pending: 'Bekleyen',
  preparing: 'Hazirlaniyor',
  ready: 'Hazir',
}

function formatCustomizations(customizations) {
  if (!customizations) {
    return 'Ozellestirme yok'
  }

  const extras = Array.isArray(customizations.extras) && customizations.extras.length > 0
    ? customizations.extras.join(', ')
    : 'yok'

  return `Boyut: ${customizations.size || '-'} | Sut: ${customizations.milk || '-'} | Seker: ${customizations.sugar ?? '-'} | Ekstra: ${extras}`
}

export default function OwnerOrders() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('pending')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyOrderId, setBusyOrderId] = useState(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanError, setScanError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorTimerRef = useRef(null)

  const shopId = ownerShopMap[user?.phone]

  const loadOrders = async ({ silent = false } = {}) => {
    if (!shopId) {
      setError('Bu dukkan sahibi hesabi icin dukkan eslesmesi bulunamadi.')
      setLoading(false)
      return
    }

    try {
      const data = await ordersAPI.getPendingForShop(shopId)
      setOrders(data)
      setError('')
    } catch (err) {
      if (!silent) {
        setError(err.response?.data?.detail || 'Siparisler yuklenemedi.')
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    let isMounted = true

    const initialLoad = async () => {
      if (!isMounted) {
        return
      }
      await loadOrders()
    }

    initialLoad()
    const intervalId = setInterval(() => {
      if (isMounted) {
        loadOrders({ silent: true })
      }
    }, 4000)

    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [shopId])

  useEffect(() => {
    return () => {
      if (detectorTimerRef.current) {
        clearInterval(detectorTimerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const groupedOrders = useMemo(() => {
    const groups = {
      accepted: [],
      pending: [],
      preparing: [],
      ready: [],
    }

    orders.forEach((order) => {
      if (groups[order.status]) {
        groups[order.status].push(order)
      }
    })

    return groups
  }, [orders])

  const handleStatusAction = async (orderId, nextStatus) => {
    setBusyOrderId(orderId)
    setMessage('')
    setError('')

    try {
      await ordersAPI.updateStatus(orderId, nextStatus)
      setMessage(`Siparis durumu ${labelByStatus[nextStatus]} olarak guncellendi.`)
      await loadOrders({ silent: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Durum guncellenemedi.')
    } finally {
      setBusyOrderId(null)
    }
  }

  const closeScanner = () => {
    setScannerOpen(false)
    setSelectedOrder(null)
    setScanError('')

    if (detectorTimerRef.current) {
      clearInterval(detectorTimerRef.current)
      detectorTimerRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const handleDetectedCode = async (rawValue) => {
    if (!selectedOrder) {
      return
    }

    closeScanner()
    setBusyOrderId(selectedOrder.id)

    try {
      await ordersAPI.verifyQR(selectedOrder.id, rawValue)
      await ordersAPI.updateStatus(selectedOrder.id, 'delivered')
      setMessage('QR okundu ve siparis teslim edildi.')
      await loadOrders({ silent: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'QR dogrulamasi basarisiz oldu.')
    } finally {
      setBusyOrderId(null)
    }
  }

  const openScanner = async (order) => {
    setSelectedOrder(order)
    setScannerOpen(true)
    setScanError('')

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Tarayici kamera erisimini desteklemiyor.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'environment' },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      if (!('BarcodeDetector' in window)) {
        throw new Error('Bu tarayicida QR algilama desteklenmiyor.')
      }

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      detectorTimerRef.current = setInterval(async () => {
        if (!videoRef.current) {
          return
        }

        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            await handleDetectedCode(barcodes[0].rawValue)
          }
        } catch {
          // Ignore transient frame read issues during scanning.
        }
      }, 700)
    } catch (err) {
      setScanError(err.message || 'Kamera acilamadi.')
    }
  }

  if (loading) {
    return <div className="page-state">Dukkan siparisleri yukleniyor...</div>
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Dukkan Sahibi</div>
          <h1>Siparis ekrani</h1>
          <p className="muted">Aktif siparisleri yonet, durumu ilerlet ve QR okut.</p>
        </div>
      </div>

      {error ? <div className="notice notice--error">{error}</div> : null}
      {message ? <div className="notice notice--warm">{message}</div> : null}

      <div className="owner-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'button button--coffee' : 'button button--ghost'}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="owner-list">
        {groupedOrders[activeTab]?.length > 0 ? (
          groupedOrders[activeTab].map((order) => (
            <article key={order.id} className="card owner-order-card">
              <div className="owner-order-card__header">
                <div>
                  <div className="card__meta">Siparis #{order.id}</div>
                  <h3>{order.product_name || `Urun #${order.product_id}`}</h3>
                  <p className="muted">
                    Musteri: {order.user_name || 'Isimsiz Kullanici'} - {order.user_phone || '-'}
                  </p>
                </div>

                <span className={`status-badge status-badge--${order.status}`}>
                  {labelByStatus[order.status] || order.status}
                </span>
              </div>

              <p>{formatCustomizations(order.customizations)}</p>
              <p className="muted">Siparis zamani: {new Date(order.created_at).toLocaleString('tr-TR')}</p>

              {order.status === 'ready' ? (
                <button
                  type="button"
                  className="button button--coffee"
                  disabled={busyOrderId === order.id}
                  onClick={() => openScanner(order)}
                >
                  {busyOrderId === order.id ? 'Isleniyor...' : 'QR Okut'}
                </button>
              ) : (
                <button
                  type="button"
                  className="button button--coffee"
                  disabled={busyOrderId === order.id}
                  onClick={() => handleStatusAction(order.id, actionByStatus[order.status].next)}
                >
                  {busyOrderId === order.id ? 'Isleniyor...' : actionByStatus[order.status].button}
                </button>
              )}
            </article>
          ))
        ) : (
          <div className="empty-state">Bu sekmede siparis bulunmuyor.</div>
        )}
      </div>

      {scannerOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeScanner}>
          <div
            className="modal-card scanner-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <div className="eyebrow">QR Okut</div>
                <h2>Hazir siparisi teslim et</h2>
                <p className="muted">Kamerayi QR koda dogru tut.</p>
              </div>

              <button type="button" className="button button--ghost" onClick={closeScanner}>
                Kapat
              </button>
            </div>

            {scanError ? <div className="notice notice--error">{scanError}</div> : null}

            <video ref={videoRef} className="scanner-video" muted playsInline />
          </div>
        </div>
      ) : null}
    </section>
  )
}
