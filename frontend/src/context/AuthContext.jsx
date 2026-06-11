import { createContext, useContext, useEffect, useState } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')

    if (!token) {
      setLoading(false)
      return
    }

    authAPI
      .getMe()
      .then((currentUser) => {
        setUser(currentUser)
      })
      .catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const clearError = () => setError('')

  const requestOTP = async (phone, name) => {
    try {
      clearError()
      return await authAPI.requestOTP(phone, name)
    } catch (err) {
      setError(err.response?.data?.detail || 'OTP kodu gonderilemedi.')
      throw err
    }
  }

  const login = async (phone, code) => {
    try {
      clearError()
      const tokenData = await authAPI.verifyOTP(phone, code)

      localStorage.setItem('access_token', tokenData.access_token)

      if (tokenData.refresh_token) {
        localStorage.setItem('refresh_token', tokenData.refresh_token)
      }

      const currentUser = await authAPI.getMe()
      setUser(currentUser)
      return currentUser
    } catch (err) {
      setError(err.response?.data?.detail || 'Giris yapilamadi.')
      throw err
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
    clearError()
  }

  return (
    <AuthContext.Provider
      value={{
        clearError,
        error,
        loading,
        login,
        logout,
        requestOTP,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
