import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useAuth } from '../../context/AuthContext'
import { translations } from '../../translations'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { language } = useAuth()
  const t = translations[language] || translations.en
  const location = useLocation()

  // Dynamic titles based on pathname
  const getScreenMeta = (pathname) => {
    switch (pathname) {
      case '/dashboard':
      case '/':
        return {
          title: t.screenDashboard || 'Patient Dashboard',
          subtitle: 'Live hospital queue metrics, wait-time predictions, and rapid triage'
        }
      case '/patient-details':
        return {
          title: t.screenPatientDetails || 'Patient Admission & Queue Entry',
          subtitle: 'Register patient demographics and enqueue directly into hospital OPD'
        }
      case '/prediction':
        return {
          title: t.screenPrediction || 'ML Waiting-Time Predictor',
          subtitle: 'Powered by trained Scikit-Learn Random Forest Regressor'
        }
      case '/prediction-result':
        return {
          title: t.screenPredictionResult || 'ML Prediction Result (Focus)',
          subtitle: 'Detailed waiting-time estimate, triage category, and call time'
        }
      case '/queue':
        return {
          title: t.screenQueueStatus || 'Live Queue Status & Management',
          subtitle: 'Real-time department queue tracking and patient triage'
        }
      case '/history':
        return {
          title: t.screenPredictionHistory || 'Prediction History',
          subtitle: 'Chronological log of SQLite predictions and model results'
        }
      case '/appointments':
        return {
          title: t.screenAppointments || 'Appointment Booking & Schedule',
          subtitle: 'Book, manage, and track consultations with on-duty doctors'
        }
      case '/ai-assistant':
        return {
          title: t.screenAIAssistant || 'CareQueue AI Hospital Assistant',
          subtitle: 'Grounded intelligence across live SQLite records and ML predictions'
        }
      case '/admin-dashboard':
        return {
          title: t.screenAdmin || 'Admin Operations & Bottleneck Analytics',
          subtitle: 'Peak hours, doctor workload, staffing advice, and ML metrics'
        }
      case '/reports':
        return {
          title: t.screenReports || 'Prediction Reports & Logs',
          subtitle: 'Historical analytics, wait-time distributions, and database logs'
        }
      case '/profile':
        return {
          title: t.screenProfile || 'Profile & System Settings',
          subtitle: 'Account preferences, language localization, and system health'
        }
      default:
        return {
          title: 'CareQueue AI',
          subtitle: 'Hospital Patient Waiting-Time Predictor'
        }
    }
  }

  const meta = getScreenMeta(location.pathname)

  return (
    <div className="min-h-screen bg-[#F0F5FA] flex flex-col font-sans text-slate-800 antialiased">
      {/* Dark Navy Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
        <TopBar
          onOpenSidebar={() => setSidebarOpen(true)}
          title={meta.title}
          subtitle={meta.subtitle}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
