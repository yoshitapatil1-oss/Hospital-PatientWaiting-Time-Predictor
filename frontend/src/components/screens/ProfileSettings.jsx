import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { translations } from '../../translations'
import api, {
  getApiBaseUrl,
  setCustomApiUrl,
  DETECTED_PC_LAN_URL,
  ANDROID_EMULATOR_URL
} from '../../services/api'
import {
  User,
  Settings,
  Globe,
  LogOut,
  Shield,
  Database,
  Cpu,
  CheckCircle2,
  Activity,
  Save,
  Server,
  Smartphone,
  RefreshCw
} from 'lucide-react'

export default function ProfileSettings() {
  const { user, logout, language, changeLanguage } = useAuth()
  const t = translations[language] || translations.en
  const navigate = useNavigate()

  const [savedNotice, setSavedNotice] = useState(false)
  const [healthData, setHealthData] = useState(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [customApiInput, setCustomApiInput] = useState(localStorage.getItem('carequeue_custom_api_url') || '')
  const [activeBaseUrl, setActiveBaseUrl] = useState('')

  const fetchHealth = async () => {
    setHealthLoading(true)
    try {
      const data = await api.getHealth()
      setHealthData(data)
    } catch (err) {
      setHealthData({ status: 'error', error: err.message })
    } finally {
      setHealthLoading(false)
    }
  }

  useEffect(() => {
    setActiveBaseUrl(getApiBaseUrl() || '(relative /api proxy)')
    fetchHealth()
  }, [])

  const handleLanguageSelect = (langCode) => {
    changeLanguage(langCode)
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 3000)
  }

  const handleSaveApiUrl = () => {
    setCustomApiUrl(customApiInput)
    setActiveBaseUrl(getApiBaseUrl() || '(relative /api proxy)')
    fetchHealth()
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 3000)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }


  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          {t.screenProfile || 'User Profile & System Settings'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your account profile, multilingual UI preferences, and view hospital system health.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Language updated immediately to {language.toUpperCase()}!</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center font-black text-2xl shadow-md">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {user?.name || 'CareQueue User'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 tracking-wider">
                  Role: {user?.role || 'Patient'}
                </span>
                <span className="text-[11px] text-slate-400">User ID #{user?.id || 1}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.logout || 'Logout'}</span>
          </button>
        </div>

        {/* Multilingual Selector Card */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-teal-600" />
              {t.preferredLanguage || 'Interface Language'}
            </label>
            <span className="text-[10px] text-slate-400">Instant UI Translation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { code: 'en', label: 'English', sub: 'Default' },
              { code: 'mr', label: 'मराठी', sub: 'Marathi' },
              { code: 'hi', label: 'हिंदी', sub: 'Hindi' }
            ].map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => handleLanguageSelect(item.code)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  language === item.code
                    ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-600/20 text-blue-900'
                    : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-sm">{item.label}</span>
                  {language === item.code && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500">{item.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* System Diagnostics & Backend Connectivity */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600" />
            <span>{t.systemHealth || 'System Health & Live Runtimes'}</span>
          </h3>
          <button
            onClick={fetchHealth}
            disabled={healthLoading}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
            <span>Check Status</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold">FastAPI Backend</span>
              <span className={`w-2 h-2 rounded-full ${healthData?.status === 'healthy' || healthData?.status === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            </div>
            <p className="font-mono font-bold text-slate-800 truncate">{activeBaseUrl}</p>
            <p className="text-[10px] text-emerald-600 font-semibold">
              {healthData?.status ? `Status: ${healthData.status}` : 'Checking...'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold">SQLite Database</span>
              <span className={`w-2 h-2 rounded-full ${healthData?.database === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            </div>
            <p className="font-mono font-bold text-slate-800">backend/data/hospital.db</p>
            <p className="text-[10px] text-emerald-600 font-semibold">
              {healthData?.database ? `DB: ${healthData.database}` : 'Verifying...'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold">ML Algorithm</span>
              <span className={`w-2 h-2 rounded-full ${healthData?.ml_model === 'ready' ? 'bg-blue-500' : 'bg-rose-500'}`} />
            </div>
            <p className="font-mono font-bold text-slate-800">{healthData?.model_name || 'RandomForestRegressor'}</p>
            <p className="text-[10px] text-blue-600 font-semibold">
              {healthData?.ml_model === 'ready' ? `Model Ready (v${healthData.model_version || '1.0.0'})` : 'Model Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Android & Network Configuration */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-teal-600" />
          <span>Android &amp; Multiplatform Network Configuration</span>
        </h3>
        <p className="text-xs text-slate-500">
          In Android Emulator, the app connects to <code>http://10.0.2.2:8000</code>. On physical Android phones connected via Wi-Fi, enter your PC LAN IP (e.g. <code>http://192.168.1.4:8000</code>).
        </p>

        {/* Quick-fill presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Presets:</span>
          <button
            type="button"
            onClick={() => {
              setCustomApiInput(DETECTED_PC_LAN_URL)
              setCustomApiUrl(DETECTED_PC_LAN_URL)
              setActiveBaseUrl(DETECTED_PC_LAN_URL)
              fetchHealth()
            }}
            className="px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-[11px] border border-teal-200 transition-colors cursor-pointer"
          >
            Physical Phone Wi-Fi (192.168.1.4)
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomApiInput(ANDROID_EMULATOR_URL)
              setCustomApiUrl(ANDROID_EMULATOR_URL)
              setActiveBaseUrl(ANDROID_EMULATOR_URL)
              fetchHealth()
            }}
            className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold text-[11px] border border-blue-200 transition-colors cursor-pointer"
          >
            Android Emulator (10.0.2.2)
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 text-xs">
          <input
            type="text"
            placeholder="Custom API URL (e.g. http://192.168.1.4:8000)"
            value={customApiInput}
            onChange={e => setCustomApiInput(e.target.value)}
            className="flex-1 w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            onClick={handleSaveApiUrl}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition-all shadow-xs"
          >
            Save &amp; Ping
          </button>
          {customApiInput && (
            <button
              onClick={() => { setCustomApiInput(''); setCustomApiUrl(''); setActiveBaseUrl(getApiBaseUrl() || '(relative /api proxy)'); fetchHealth(); }}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>


      {/* Role Permissions Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-teal-600" />
          Access Permissions for Role: <span className="text-blue-600 capitalize">{user?.role || 'Patient'}</span>
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {user?.role === 'admin'
            ? 'Full administrative control over all hospital departments, doctors, live queues, model metrics, staffing recommendations, and system logs.'
            : user?.role === 'receptionist'
            ? 'Reception triage desk permissions: Admit patients, update live queues, schedule consultations, and call next patients into triage.'
            : 'Patient portal privileges: Check live queue status, predict wait times using AI, schedule consultations, and query the CareQueue AI Assistant.'}
        </p>
      </div>
    </div>
  )
}
