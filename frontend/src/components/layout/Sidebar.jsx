import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { translations } from '../../translations'
import {
  Activity,
  LayoutDashboard,
  UserPlus,
  Cpu,
  Sparkles,
  ListOrdered,
  Calendar,
  History,
  Bot,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  X,
  Radio,
  Stethoscope
} from 'lucide-react'

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, language } = useAuth()
  const t = translations[language] || translations.en
  const navigate = useNavigate()

  const navItems = [
    {
      to: '/dashboard',
      label: t.screenDashboard || 'Patient Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      to: '/patient-details',
      label: t.screenPatientDetails || 'Patient Details',
      icon: UserPlus,
      badge: null
    },
    {
      to: '/prediction',
      label: t.screenPrediction || 'Wait Prediction',
      icon: Cpu,
      badge: 'ML'
    },
    {
      to: '/prediction-result',
      label: t.screenPredictionResult || 'Prediction Result',
      icon: Sparkles,
      badge: 'Focus'
    },
    {
      to: '/queue',
      label: t.screenQueueStatus || 'Queue Status',
      icon: ListOrdered,
      badge: 'Live'
    },
    {
      to: '/appointments',
      label: t.screenAppointments || 'Appointments',
      icon: Calendar,
      badge: null
    },
    {
      to: '/doctors',
      label: t.screenDoctors || 'Doctors & Depts',
      icon: Stethoscope,
      badge: 'Roster'
    },
    {
      to: '/history',
      label: t.screenPredictionHistory || 'Prediction History',
      icon: History,
      badge: null
    },
    {
      to: '/ai-assistant',
      label: t.screenAIAssistant || 'AI Assistant',
      icon: Bot,
      badge: 'AI'
    },
    {
      to: '/admin-dashboard',
      label: t.screenAdminDashboard || 'Admin Dashboard',
      icon: BarChart3,
      badge: user?.role === 'admin' ? 'Admin' : null
    },
    {
      to: '/reports',
      label: t.screenReports || 'Reports',
      icon: FileText,
      badge: null
    },
    {
      to: '/profile',
      label: t.screenProfile || 'Profile / Settings',
      icon: Settings,
      badge: null
    }
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Dark Navy Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#0B132B] text-slate-300 flex flex-col border-r border-slate-800/80 shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-800/80 bg-[#080E21]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20 ring-2 ring-teal-400/30">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">CareQueue</span>
                <span className="px-1.5 py-0.5 text-[10px] font-black rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wide font-medium mt-0.5">
                Modern Hospital System
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live System Banner */}
        <div className="mx-4 my-2.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">SQLite &bull; Random Forest</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/20">
            Active
          </span>
        </div>

        {/* Nav Items List */}
        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose()
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800/80 text-teal-400 group-hover:text-teal-300 group-hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md ${
                          isActive
                            ? 'bg-white/25 text-white'
                            : 'bg-slate-800 text-teal-400 border border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom User Profile & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-[#080E21]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {user?.name || 'CareQueue User'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider">
                    {user?.role || 'Patient'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title={t.logout || 'Logout'}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
