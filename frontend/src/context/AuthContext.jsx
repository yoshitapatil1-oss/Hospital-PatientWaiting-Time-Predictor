import React, { createContext, useContext, useState, useEffect } from 'react'
import { api, getApiBaseUrl } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [language, setLanguage] = useState(() => localStorage.getItem('lang') || 'en')
  const [loading, setLoading] = useState(true)

  // Fetch current user from /api/auth/me using configured API base URL
  const fetchCurrentUser = async (authToken) => {
    try {
      const userData = await api.auth.getMe(authToken)
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      if (userData?.language && ['en', 'mr', 'hi'].includes(userData.language)) {
        setLanguage(userData.language)
        localStorage.setItem('lang', userData.language)
      }
    } catch (err) {
      console.error('Error fetching current user:', err)
      logout()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token)
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email, password) => {
    const data = await api.auth.login(email, password)
    setToken(data.access_token)
    setUser(data.user)
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    if (data.user?.language) {
      setLanguage(data.user.language)
      localStorage.setItem('lang', data.user.language)
    }
    return data.user
  }

  const register = async ({ name, email, password, role, language: userLang }) => {
    const data = await api.auth.register({
      name,
      email,
      password,
      role,
      language: userLang || language
    })
    setToken(data.access_token)
    setUser(data.user)
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    if (userLang) {
      setLanguage(userLang)
      localStorage.setItem('lang', userLang)
    }
    return data.user
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const changeLanguage = (newLang) => {
    setLanguage(newLang)
    localStorage.setItem('lang', newLang)
  }

  const apiFetch = async (url, options = {}) => {
    const base = getApiBaseUrl()
    const fullUrl = url.startsWith('http')
      ? url
      : `${base}${url.startsWith('/') ? '' : '/'}${url}`

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
    const res = await fetch(fullUrl, { ...options, headers })
    if (res.status === 401) {
      logout()
    }
    return res
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        language,
        loading,
        login,
        register,
        logout,
        changeLanguage,
        apiFetch
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
