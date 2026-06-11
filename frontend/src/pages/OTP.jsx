import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function OTP() {
  const location = useLocation()
  const navigate = useNavigate()
  const { clearError, error, login, user } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const authMode = location.state?.mode || 'login'
  const phone = location.state?.phone || ''
  const fullName = location.state?.fullName || ''

  useEffect(() => {
    clearError()
  }, [clearError])

  if (user) {
    return <Navigate to="/home" replace />
  }

  if (!phone) {
    return <Navigate to="/login" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const currentUser = await login(phone, code)

      if (fullName) {
        localStorage.setItem('kahvecell_display_name', fullName)
      }

      navigate(currentUser.role === 'shop_owner' ? '/owner/orders' : '/home')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card auth-card--coffee">
        <div className="eyebrow">KahveCell</div>
        <h1>OTP dogrulama</h1>
        <p className="muted">
          Telefonuna gelen 4 haneli kodu gir.
          <br />
          Numara: <strong>{phone}</strong>
        </p>

        <div className="notice notice--warm">
          Simulasyonda kod her zaman <strong>1234</strong>.
        </div>

        {error ? <div className="notice notice--error">{error}</div> : null}

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>4 haneli kod</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength="4"
              placeholder="1234"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </label>

          <button type="submit" className="button button--coffee" disabled={loading}>
            {loading
              ? 'Dogrulaniyor...'
              : authMode === 'register'
                ? 'Kaydi tamamla'
                : 'Giris yap'}
          </button>
        </form>

        <p className="auth-switch">
          Yanlis numara mi girdin?{' '}
          <Link to={authMode === 'register' ? '/register' : '/login'}>Geri don</Link>
        </p>
      </div>
    </section>
  )
}
