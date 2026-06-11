import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { clearError, error, requestOTP, user } = useAuth()
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
      await requestOTP(phone)
      navigate('/otp', {
        state: {
          mode: 'login',
          phone,
          password,
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
        <h1>Giris yap</h1>
        <p className="muted">Telefon ve sifreni gir, sonra OTP ile devam et.</p>

        {error ? <div className="notice notice--error">{error}</div> : null}

        <form className="stack" onSubmit={handleSubmit}>
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
              placeholder="Sifreni gir"
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
          Hesabin yok mu? <Link to="/register">Kayit ekranina git</Link>
        </p>
      </div>
    </section>
  )
}
