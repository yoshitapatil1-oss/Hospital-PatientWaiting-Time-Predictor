import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { translations } from '../translations'
import {
  getApiBaseUrl,
  setCustomApiUrl,
  getCustomApiUrl,
  pingHealth,
  DETECTED_PC_LAN_URL,
  ANDROID_EMULATOR_URL,
  isAndroidOrNative
} from '../services/api'
import {
  Activity,
  ShieldCheck,
  User,
  UserCheck,
  Stethoscope,
  Lock,
  Mail,
  Globe,
  ArrowRight,
  AlertCircle,
  Check,
  Sparkles,
  Wifi,
  Server,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

export default function AuthView({ initialMode = 'login' }) {
  const { login, register, language, changeLanguage } = useAuth()
  const t = translations[language] || translations.en

  const [mode, setMode] = useState(initialMode) // 'login' or 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('patient')
  const [userLang, setUserLang] = useState(language)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Server & Network Configuration State (Physical Android Phone / Emulator)
  const [showServerConfig, setShowServerConfig] = useState(false)
  const [currentBaseUrl, setCurrentBaseUrl] = useState('')
  const [serverUrlInput, setServerUrlInput] = useState('')
  const [pingStatus, setPingStatus] = useState(null) // { checking, ok, message }

  useEffect(() => {
    const active = getApiBaseUrl() || '(relative /api proxy)'
    setCurrentBaseUrl(active)
    setServerUrlInput(getCustomApiUrl() || (active.startsWith('http') ? active : ''))
  }, [])

  const handlePing = async (targetUrl) => {
    const testUrl = (targetUrl !== undefined ? targetUrl : serverUrlInput).trim()
    setPingStatus({ checking: true, ok: null, message: 'Pinging FastAPI /api/health...' })
    const res = await pingHealth(testUrl || undefined)
    if (res.ok) {
      setPingStatus({
        checking: false,
        ok: true,
        message: `Connected! Backend: ${res.data?.service || 'CareQueue API'} (${res.data?.database || 'DB OK'}, ML: ${res.data?.ml_model || 'Ready'})`
      })
    } else {
      setPingStatus({
        checking: false,
        ok: false,
        message: `Connection failed: ${res.error}`
      })
    }
  }

  const handleSaveServer = (newUrl) => {
    const trimmed = (newUrl !== undefined ? newUrl : serverUrlInput).trim()
    setCustomApiUrl(trimmed)
    const active = getApiBaseUrl() || '(relative /api proxy)'
    setCurrentBaseUrl(active)
    setServerUrlInput(trimmed || (active.startsWith('http') ? active : ''))
    handlePing(trimmed)
  }

  const handleResetServer = () => {
    setCustomApiUrl('')
    const active = getApiBaseUrl() || '(relative /api proxy)'
    setCurrentBaseUrl(active)
    setServerUrlInput('')
    setPingStatus(null)
    handlePing('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register({ name, email, password, role, language: userLang })
      }
    } catch (err) {
      setError(err.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  const fillQuickCredentials = (demoRole) => {
    if (demoRole === 'receptionist') {
      setEmail('receptionist@hospital.org')
      setPassword('SecurePassword123!')
      setMode('login')
    } else if (demoRole === 'admin') {
      setEmail('admin@hospital.org')
      setPassword('AdminPassword123!')
      setMode('login')
    } else {
      setEmail('patient.raj@gmail.com')
      setPassword('PatientPass123!')
      setMode('login')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F5FA] via-blue-50/40 to-slate-100 flex flex-col font-sans antialiased text-slate-800">
      {/* Top Header with CareQueue AI Branding & Language Switcher */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 ring-2 ring-teal-400/30">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight text-slate-900">CareQueue</span>
              <span className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-blue-100 text-blue-700 border border-blue-200">
                AI
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{t.brandTagline || 'Smart Hospital Triage'}</p>
          </div>
        </div>

        {/* Right side controls: Server Settings + Language */}
        <div className="flex items-center gap-2">
          {/* Server / Network Settings Pill */}
          <button
            type="button"
            onClick={() => setShowServerConfig(!showServerConfig)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-xs font-semibold text-slate-700 hover:text-teal-700 transition-all cursor-pointer"
            title="Configure PC LAN IP / Emulator URL"
          >
            <Wifi className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">Server:</span>
            <span className="font-mono text-[11px] max-w-[120px] truncate text-slate-600">
              {currentBaseUrl.replace(/^https?:\/\//, '') || 'Local Proxy'}
            </span>
            {showServerConfig ? (
              <ChevronUp className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            )}
          </button>

          {/* Language Selection Bar */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs text-xs font-semibold">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-2" />
            <button
              onClick={() => {
                changeLanguage('en')
                setUserLang('en')
              }}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              onClick={() => {
                changeLanguage('mr')
                setUserLang('mr')
              }}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                language === 'mr'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              मराठी
            </button>
            <button
              onClick={() => {
                changeLanguage('hi')
                setUserLang('hi')
              }}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                language === 'hi'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिंदी
            </button>
          </div>
        </div>
      </header>

      {/* Network / PC LAN IP Configuration Drawer for Physical Phone or Emulator */}
      {showServerConfig && (
        <div className="max-w-md mx-auto w-full px-4 mb-2 animate-slide-up">
          <div className="bg-white p-4 rounded-3xl border border-teal-200 shadow-lg text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-teal-600" />
                <span className="font-bold text-slate-900">Physical Phone / Server Setup</span>
              </div>
              <button
                type="button"
                onClick={() => setShowServerConfig(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-tight">
              On a <strong>physical Android phone</strong>, connect to your Wi-Fi PC IP (e.g. <code>http://192.168.1.X:8000</code>). On the <strong>emulator</strong>, use <code>http://10.0.2.2:8000</code>.
            </p>

            {/* Quick Fill Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setServerUrlInput(DETECTED_PC_LAN_URL)
                  handleSaveServer(DETECTED_PC_LAN_URL)
                }}
                className="px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-[10px] border border-teal-200 transition-colors cursor-pointer"
              >
                Wi-Fi Phone (192.168.1.4)
              </button>
              <button
                type="button"
                onClick={() => {
                  setServerUrlInput(ANDROID_EMULATOR_URL)
                  handleSaveServer(ANDROID_EMULATOR_URL)
                }}
                className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold text-[10px] border border-blue-200 transition-colors cursor-pointer"
              >
                Emulator (10.0.2.2)
              </button>
              <button
                type="button"
                onClick={handleResetServer}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[10px] transition-colors cursor-pointer"
              >
                Auto-Detect
              </button>
            </div>

            {/* Input & Action */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                placeholder="http://192.168.1.4:8000"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              <button
                type="button"
                onClick={() => handleSaveServer()}
                className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => handlePing()}
                disabled={pingStatus?.checking}
                className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                title="Test Connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pingStatus?.checking ? 'animate-spin text-teal-600' : ''}`} />
                <span>Ping</span>
              </button>
            </div>

            {/* Live Ping Status Feedback */}
            {pingStatus && (
              <div
                className={`p-2.5 rounded-xl text-[11px] font-medium flex items-center gap-2 ${
                  pingStatus.ok
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : pingStatus.checking
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {pingStatus.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : pingStatus.checking ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="leading-tight">{pingStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Authentication Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 overflow-hidden">
          {/* Tabs: Sign In / Register */}
          <div className="flex border-b border-slate-100 bg-slate-50/80 p-2">
            <button
              onClick={() => {
                setMode('login')
                setError(null)
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.login}
            </button>
            <button
              onClick={() => {
                setMode('register')
                setError(null)
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.register}
            </button>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-5">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {mode === 'login' ? t.login : t.register}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {mode === 'login' ? t.signInToAccess : t.createAccountPrompt}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {mode === 'register' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t.name}</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kulkarni"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-slate-50/50"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t.email}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@hospital.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t.password}</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-slate-50/50"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.selectRole}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('patient')}
                        className={`p-2 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer ${
                          role === 'patient'
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {t.patient}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('receptionist')}
                        className={`p-2 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer ${
                          role === 'receptionist'
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {t.receptionist}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('admin')}
                        className={`p-2 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer ${
                          role === 'admin'
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {t.admin}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.preferredLanguage}
                    </label>
                    <select
                      value={userLang}
                      onChange={(e) => setUserLang(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-blue-500"
                    >
                      <option value="en">English</option>
                      <option value="mr">मराठी (Marathi)</option>
                      <option value="hi">हिंदी (Hindi)</option>
                    </select>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                {loading ? (
                  <span>{t.connecting || 'Authenticating...'}</span>
                ) : (
                  <>
                    <span>{mode === 'login' ? t.login : t.register}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Logins */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Quick Demo Access:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fillQuickCredentials('patient')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Patient Demo
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickCredentials('receptionist')}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Receptionist Demo
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickCredentials('admin')}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Admin Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
