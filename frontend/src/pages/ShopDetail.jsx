import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { shopsAPI } from '../services/api'

const categoryRules = [
  { title: 'Espresso Bazli', keywords: ['espresso', 'latte', 'cappuccino', 'americano', 'mocha'] },
  { title: 'Filtre Kahveler', keywords: ['filtre', 'filter', 'v60', 'chemex', 'brew'] },
  { title: 'Soguk Icecekler', keywords: ['cold', 'iced', 'buzlu', 'frappe'] },
]

function toRadians(value) {
  return (value * Math.PI) / 180
}

function getDistanceKm(from, to) {
  const earthRadius = 6371
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getProductCategory(productName = '') {
  const normalized = productName.toLowerCase()
  const matchedCategory = categoryRules.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword)),
  )

  return matchedCategory?.title || 'Diger'
}

function getWorkingHours(shopId) {
  const options = ['08:00 - 22:00', '07:30 - 23:00', '09:00 - 21:30']
  return options[shopId % options.length]
}

export default function ShopDetail() {
  const { shopId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    shopsAPI
      .getDetail(shopId)
      .then((data) => {
        setShop(data)
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Dukkan detayi yuklenemedi.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [shopId])

  if (loading) {
    return <div className="page-state">Dukkan detayi yukleniyor...</div>
  }

  if (error) {
    return <div className="page-state">{error}</div>
  }

  if (!shop) {
    return <div className="page-state">Dukkan bulunamadi.</div>
  }

  const positionFromStorage = JSON.parse(
    localStorage.getItem('kahvecell_user_position') || '{"lat":39.92077,"lng":32.85411}',
  )
  const fallbackDistance =
    typeof shop.lat === 'number' && typeof shop.lng === 'number'
      ? getDistanceKm(positionFromStorage, { lat: shop.lat, lng: shop.lng })
      : null
  const rating = location.state?.rating || (4.1 + ((shop.id % 7) * 0.1)).toFixed(1)
  const distanceKm = location.state?.distanceKm ?? fallbackDistance
  const groupedProducts = {
    'Espresso Bazli': [],
    'Filtre Kahveler': [],
    'Soguk Icecekler': [],
    Diger: [],
  }

  shop.products.forEach((product) => {
    groupedProducts[getProductCategory(product.name)].push(product)
  })

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Dukkan Detayi</div>
          <h1>{shop.name}</h1>
          <p className="muted">{shop.address}</p>
          {shop.phone ? <p className="muted">{shop.phone}</p> : null}
        </div>

        <button type="button" className="button button--ghost" onClick={() => navigate(-1)}>
          Geri
        </button>
      </div>

      <div className="panel shop-hero">
        <div className="shop-hero__main">
          <h2>{shop.name}</h2>
          <p className="muted">{shop.address}</p>
          {shop.phone ? <p className="muted">{shop.phone}</p> : null}
        </div>

        <div className="shop-hero__facts">
          <div className="fact-chip">
            <span>Puan</span>
            <strong>{rating}</strong>
          </div>
          <div className="fact-chip">
            <span>Mesafe</span>
            <strong>{distanceKm ? `${distanceKm.toFixed(2)} km` : 'Bilinmiyor'}</strong>
          </div>
          <div className="fact-chip">
            <span>Calisma</span>
            <strong>{getWorkingHours(shop.id)}</strong>
          </div>
        </div>
      </div>

      <div className="stack">
        {Object.entries(groupedProducts).map(([categoryName, products]) =>
          products.length > 0 ? (
            <section key={categoryName} className="menu-group">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">Menu</div>
                  <h2>{categoryName}</h2>
                </div>
              </div>

              <div className="card-grid">
                {products.map((product) => (
                  <article key={product.id} className="card">
                    <div className="card__meta">{categoryName}</div>
                    <h3>{product.name}</h3>
                    <p>{product.description || 'Klasik kahve secimi.'}</p>
                    <strong>{(product.price_cents / 100).toFixed(2)} TL</strong>
                    <button
                      type="button"
                      className="button button--coffee"
                      onClick={() =>
                        navigate('/order', {
                          state: {
                            categoryName,
                            productId: product.id,
                            productName: product.name,
                            shopId: shop.id,
                            shopName: shop.name,
                          },
                        })
                      }
                    >
                      Siparis Ver
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : null,
        )}
      </div>
    </section>
  )
}
