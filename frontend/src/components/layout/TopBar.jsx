import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { translations } from '../../translations'
import {
  Menu,
  Globe,
  Bell,
  PhoneCall,
  Sparkles,
  ShieldAlert,
  Search
} from 'lucide-react'

export default function TopBar({ onOpenSidebar, title, subtitle }) {
  const { user, language, changeLanguage } = useAuth()
  const t = translations[language] || translations.en

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shadow-xs">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate tracking-tight">
            {title || t.screenDashboard || 'CareQueue AI Dashboard'}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-slate-500 truncate hidden md:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* ML Status Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Random Forest ML Active</span>
        </div>

        {/* Emergency Hotline Button */}
        <a
          href="tel:108"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors"
          title="Hospital Emergency Line"
        >
          <PhoneCall className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
          <span>108 Emergency</span>
        </a>

        {/* Language Selector: English / मराठी / हिंदी */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold border border-slate-200 shadow-2xs">
          <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5 hidden sm:block" />
          <button
            onClick={() => changeLanguage('en')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => changeLanguage('mr')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              language === 'mr'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            MR
          </button>
          <button
            onClick={() => changeLanguage('hi')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              language === 'hi'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            HI
          </button>
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
            {user?.name ? user.name.charAt(0) : 'U'}
          </div>
          <div className="hidden lg:block text-left text-xs leading-none">
            <span className="font-bold text-slate-800 block truncate max-w-[120px]">
              {user?.name || 'User'}
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">
              {user?.role || 'Patient'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
