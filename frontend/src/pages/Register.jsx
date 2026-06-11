import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { clearError, error, requestOTP, user } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    clearError()
  }, [clearError])

  if (user) {
    return <Navigate to={user.role === 'shop_owner' ? '/owner/orders' : '/home'} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      await requestOTP(phone, fullName)
      navigate('/otp', {
        state: {
          mode: 'register',
          fullName,
          password,
          phone,
        },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card auth-card--coffee">
        <div className="eyebrow">KahveCell</div>
        <h1>Kayit ol</h1>
        <p className="muted">Telefon, ad soyad ve sifre bilgilerini girip OTP ile devam et.</p>

        {error ? <div className="notice notice--error">{error}</div> : null}

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Ad soyad</span>
            <input
              type="text"
              placeholder="Ornek: Ayse Yilmaz"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Telefon</span>
            <input
              type="tel"
              placeholder="+905551234567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Sifre</span>
            <input
              type="password"
              placeholder="En az 6 karakter"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button type="submit" className="button button--coffee" disabled={loading}>
            {loading ? 'Devam ediliyor...' : 'OTP ekranina gec'}
          </button>
        </form>

        <p className="auth-switch">
          Zaten hesabin var mi? <Link to="/login">Giris ekranina don</Link>
        </p>
      </div>
    </section>
  )
}
