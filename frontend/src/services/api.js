/**
 * CareQueue AI - Centralized API Service
 * Handles all REST communication with FastAPI backend on localhost, Android emulator, or LAN.
 */

import { Capacitor } from '@capacitor/core'

export const DETECTED_PC_LAN_URL = 'http://192.168.1.4:8000'
export const ANDROID_EMULATOR_URL = 'http://10.0.2.2:8000'

/**
 * Returns true if running within Android Emulator or Native Android WebView.
 */
export function isAndroidOrNative() {
  if (typeof window === 'undefined') return false

  try {
    if (Capacitor.isNativePlatform()) return true
    if (Capacitor.getPlatform() === 'android') return true
  } catch {
    // fallback if Capacitor global is unavailable
  }

  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || ''
  const isAndroidUA = /Android/i.test(ua)
  const isCapacitorScheme =
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && window.location.port === '')
  const notViteDev = window.location.port !== '5173' && window.location.port !== '3000'

  return (isAndroidUA || isCapacitorScheme) && notViteDev
}

/**
 * Returns true if the device environment appears to be an Android SDK Emulator.
 */
export function isAndroidEmulator() {
  if (typeof navigator === 'undefined') return false
  const ua = (navigator.userAgent || '').toLowerCase()
  return (
    ua.includes('google_sdk') ||
    ua.includes('emulator') ||
    ua.includes('android sdk built for') ||
    ua.includes('sdk_gphone') ||
    ua.includes('goldfish') ||
    ua.includes('ranchu') ||
    ua.includes('x86_64') ||
    ua.includes('i686')
  )
}

/**
 * Resolves the API base URL:
 * - On Physical Android Phone: uses configured carequeue_custom_api_url, or auto-detected PC LAN IP (http://192.168.1.4:8000).
 * - On Android Emulator: uses configured carequeue_custom_api_url, or http://10.0.2.2:8000.
 * - On Web Dev: empty string '' which uses the Vite proxy to http://127.0.0.1:8000.
 * - Supports VITE_API_BASE_URL env var or verified custom LAN IP if configured.
 */
export function getApiBaseUrl() {
  const isAndroid = isAndroidOrNative()

  if (isAndroid) {
    let customUrl = ''
    try {
      customUrl = (localStorage.getItem('carequeue_custom_api_url') || '').trim()
    } catch {
      customUrl = ''
    }

    // Sanitize saved custom URL on Android:
    // Values containing "localhost", "127.0.0.1", relative paths, or non-http strings will fail on Android.
    if (customUrl) {
      const lower = customUrl.toLowerCase()
      if (lower.includes('localhost') || lower.includes('127.0.0.1') || !lower.startsWith('http')) {
        try {
          localStorage.removeItem('carequeue_custom_api_url')
        } catch {}
        customUrl = ''
      }
    }

    // 1. If user entered a valid custom LAN IP (e.g. http://192.168.1.X:8000), use it:
    if (customUrl) {
      return customUrl.replace(/\/$/, '')
    }

    // 2. If running on Android Studio Emulator:
    if (isAndroidEmulator()) {
      return ANDROID_EMULATOR_URL
    }

    // 3. On Physical Android Phone: default to PC LAN IP
    return DETECTED_PC_LAN_URL
  }

  // Web Browser environment:
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')
  }

  let customUrl = ''
  try {
    customUrl = (localStorage.getItem('carequeue_custom_api_url') || '').trim()
  } catch {
    customUrl = ''
  }

  if (customUrl && customUrl.startsWith('http')) {
    return customUrl.replace(/\/$/, '')
  }

  // Web fallback: return '' to utilize Vite reverse-proxy (target: http://127.0.0.1:8000)
  return ''
}

export function setCustomApiUrl(url) {
  if (url && typeof url === 'string') {
    const trimmed = url.trim()
    if (trimmed) {
      localStorage.setItem('carequeue_custom_api_url', trimmed)
      return
    }
  }
  localStorage.removeItem('carequeue_custom_api_url')
}

export function getCustomApiUrl() {
  try {
    return (localStorage.getItem('carequeue_custom_api_url') || '').trim()
  } catch {
    return ''
  }
}

/**
 * Direct ping test to check connectivity to /api/health with a specific base URL.
 */
export async function pingHealth(customUrl) {
  const base = (customUrl || getApiBaseUrl()).replace(/\/$/, '')
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(`${base}/api/health`, {
      method: 'GET',
      signal: controller.signal
    })
    clearTimeout(timer)
    const data = await handleResponse(res)
    return { ok: true, data, base }
  } catch (err) {
    return {
      ok: false,
      error: err.name === 'AbortError' ? 'Connection timed out (check Wi-Fi & PC IP)' : err.message || 'Connection failed',
      base
    }
  }
}

export function getAuthHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

/**
 * Task 6: Make sure the frontend never tries to parse an HTML page as the API JSON response.
 * Detects HTML responses and throws an informative error instead of "Unexpected token '<'".
 */
export async function handleResponse(res) {
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.dispatchEvent(new Event('auth-unauthorized'))
    }
  }

  const contentType = res.headers.get('content-type') || ''
  let data = null
  let text = ''

  if (contentType.includes('application/json')) {
    try {
      data = await res.json()
    } catch {
      data = null
    }
  } else {
    // If response does not declare application/json, read as text safely
    text = await res.text().catch(() => '')
    const trimmed = text.trim()

    // Detect HTML fallback (e.g. <!doctype html> from Single Page App router or 404 handler)
    if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
      const targetUrl = res.url || 'API endpoint'
      const baseHint = getApiBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '')
      throw new Error(
        `Backend connection error: Received HTML instead of JSON (${res.status} ${res.statusText}) from ${targetUrl}. Ensure FastAPI backend is running at ${baseHint}.`
      )
    }

    try {
      data = JSON.parse(text)
    } catch {
      data = { detail: text }
    }
  }

  if (!res.ok) {
    const errorMsg =
      data?.detail ||
      (typeof data === 'string' ? data : null) ||
      text ||
      `Request failed with status ${res.status}`
    throw new Error(errorMsg)
  }

  return data
}

export const api = {
  // Health
  getHealth: async () => {
    const base = getApiBaseUrl()
    const res = await fetch(`${base}/api/health`)
    return handleResponse(res)
  },
  pingHealth,

  // Auth
  auth: {
    login: async (email, password) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      return handleResponse(res)
    },
    register: async ({ name, email, password, role, language }) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, language })
      })
      return handleResponse(res)
    },
    getMe: async (customToken) => {
      const base = getApiBaseUrl()
      const token = customToken || localStorage.getItem('token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
      const res = await fetch(`${base}/api/auth/me`, { headers })
      return handleResponse(res)
    }
  },

  // Patients
  patients: {
    getAll: async () => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/patients`, {
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    },
    create: async (patientData) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/patients`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(patientData)
      })
      return handleResponse(res)
    },
    getById: async (id) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/patients/${id}`, {
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    },
    update: async (id, patientData) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/patients/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(patientData)
      })
      return handleResponse(res)
    },
    delete: async (id) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/patients/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    }
  },

  // Doctors
  doctors: {
    getAll: async () => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/doctors`)
      return handleResponse(res)
    },
    create: async (doctorData) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/doctors`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(doctorData)
      })
      return handleResponse(res)
    },
    update: async (id, doctorData) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/doctors/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(doctorData)
      })
      return handleResponse(res)
    },
    toggleAvailability: async (id) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/doctors/${id}/toggle-availability`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    },
    delete: async (id) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/doctors/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    }
  },

  // Departments
  departments: {
    getAll: async () => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/departments`)
      return handleResponse(res)
    },
    getList: async () => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/departments/list`)
      return handleResponse(res)
    }
  },

  // Appointments
  appointments: {
    getAll: async () => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/appointments`, {
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    },
    create: async (apptData) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/appointments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(apptData)
      })
      return handleResponse(res)
    },
    updateStatus: async (id, status, priority) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/appointments/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, priority })
      })
      return handleResponse(res)
    },
    cancel: async (id) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/appointments/${id}/cancel`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    },
    delete: async (id) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/appointments/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    }
  },

  // Queue
  queue: {
    getAll: async (department, statusFilter) => {
      const base = getApiBaseUrl()
      let url = `${base}/api/queue`
      const params = new URLSearchParams()
      if (department) params.append('department', department)
      if (statusFilter) params.append('status_filter', statusFilter)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url, { headers: getAuthHeaders() })
      return handleResponse(res)
    },
    getStats: async () => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/queue/stats`, {
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    },
    create: async (queueData) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/queue`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(queueData)
      })
      return handleResponse(res)
    },
    update: async (id, queueData) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/queue/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(queueData)
      })
      return handleResponse(res)
    },
    delete: async (id) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/queue/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    }
  },

  // Predictions (Random Forest ML)
  predictions: {
    predict: async (features) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/predictions/predict`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(features)
      })
      return handleResponse(res)
    },
    getHistory: async (limit = 100) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/predictions/history?limit=${limit}`, {
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    },
    getModelInfo: async () => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/predictions/model-info`, {
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    }
  },

  // AI Assistant & Admin Insights
  ai: {
    chat: async (message, language = 'en', department = null) => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/ai/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message, language, department })
      })
      return handleResponse(res)
    },
    getInsights: async () => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/ai/insights`, {
        headers: getAuthHeaders()
      })
      return handleResponse(res)
    },
    getPrompts: async (language = 'en') => {
      const base = getApiBaseUrl()
      const res = await fetch(`${base}/api/ai/prompts?language=${language}`)
      return handleResponse(res)
    }
  }
}

export default api
