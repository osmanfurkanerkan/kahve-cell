import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { shopsAPI } from '../services/api'

const defaultPosition = {
  label: 'Ankara Kizilay',
  lat: 39.92077,
  lng: 32.85411,
}

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

function getDemoRating(shopId) {
  return (4.1 + ((shopId % 7) * 0.1)).toFixed(1)
}

export default function Home() {
  const [shops, setShops] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [locationLabel, setLocationLabel] = useState('Konum aliniyor...')
  const [userPosition, setUserPosition] = useState(defaultPosition)

  useEffect(() => {
    let isMounted = true

    const loadShops = async () => {
      try {
        const data = await shopsAPI.listAll()

        if (!isMounted) {
          return
        }

        setShops(data)
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.detail || 'Dukkanlar yuklenemedi.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadShops()

    if (!navigator.geolocation) {
      setLocationLabel('Konum destegi yok, varsayilan: Ankara Kizilay')
      return () => {
        isMounted = false
      }
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!isMounted) {
          return
        }

        setUserPosition({
          lat: coords.latitude,
          lng: coords.longitude,
          label: 'Senin konumun',
        })
        localStorage.setItem(
          'kahvecell_user_position',
          JSON.stringify({ lat: coords.latitude, lng: coords.longitude }),
        )
        setLocationLabel('Canli konum kullaniliyor')
      },
      () => {
        if (!isMounted) {
          return
        }

        setUserPosition(defaultPosition)
        localStorage.setItem(
          'kahvecell_user_position',
          JSON.stringify({ lat: defaultPosition.lat, lng: defaultPosition.lng }),
        )
        setLocationLabel('Konum izni verilmedi, varsayilan: Ankara Kizilay')
      },
    )

    return () => {
      isMounted = false
    }
  }, [])

  const enrichedShops = shops
    .filter((shop) => typeof shop.lat === 'number' && typeof shop.lng === 'number')
    .map((shop) => ({
      ...shop,
      distanceKm: getDistanceKm(userPosition, { lat: shop.lat, lng: shop.lng }),
      rating: getDemoRating(shop.id),
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm)

  const filteredShops = enrichedShops.filter((shop) => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return true
    }

    return (
      shop.name.toLowerCase().includes(query) ||
      (shop.address || '').toLowerCase().includes(query)
    )
  })

  if (loading) {
    return <div className="page-state">Ana sayfa yukleniyor...</div>
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Ana Sayfa</div>
          <h1>Yakinindaki kahveciler</h1>
          <p className="muted">{locationLabel}</p>
        </div>
      </div>

      <div className="search-bar search-bar--home">
        <input
          type="text"
          placeholder="Dukkan veya adres ara"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {error ? <div className="notice notice--error">{error}</div> : null}

      <div className="home-layout">
        <div className="home-layout__list">
          {filteredShops.length > 0 ? (
            filteredShops.map((shop) => (
              <article key={shop.id} className="card shop-card">
                <div className="shop-card__header">
                  <div>
                    <h3>{shop.name}</h3>
                    <p className="muted">{shop.address}</p>
                  </div>
                  <span className="rating-pill">{shop.rating}</span>
                </div>

                <div className="shop-card__meta">
                  <span>Puan: {shop.rating}</span>
                  <span>Mesafe: {shop.distanceKm.toFixed(2)} km</span>
                </div>

                <Link
                  to={`/shop/${shop.id}`}
                  state={{ distanceKm: shop.distanceKm, rating: shop.rating }}
                  className="button button--coffee"
                >
                  Menuyu Gor
                </Link>
              </article>
            ))
          ) : (
            <div className="empty-state">Aramana uyan dukkan bulunamadi.</div>
          )}
        </div>

        <div className="home-layout__map panel">
          <MapContainer
            center={[userPosition.lat, userPosition.lng]}
            zoom={13}
            className="leaflet-map leaflet-map--home"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <CircleMarker
              center={[userPosition.lat, userPosition.lng]}
              radius={11}
              pathOptions={{
                color: '#1f6feb',
                fillColor: '#4ea1ff',
                fillOpacity: 0.95,
                weight: 3,
              }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{userPosition.label}</strong>
                </div>
              </Popup>
            </CircleMarker>

            {filteredShops.map((shop) => (
              <CircleMarker
                key={shop.id}
                center={[shop.lat, shop.lng]}
                radius={9}
                pathOptions={{
                  color: '#6b3f26',
                  fillColor: '#8a5a3c',
                  fillOpacity: 0.9,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="map-popup">
                    <strong>{shop.name}</strong>
                    <p>{shop.address}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    </section>
  )
}
