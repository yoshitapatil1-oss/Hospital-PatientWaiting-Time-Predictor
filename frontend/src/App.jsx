import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthView from './components/AuthView'
import AppLayout from './components/layout/AppLayout'

// 13 Distinct Screens
import PatientDashboard from './components/screens/PatientDashboard'
import PatientDetails from './components/screens/PatientDetails'
import MLPrediction from './components/screens/MLPrediction'
import PredictionResult from './components/screens/PredictionResult'
import AppointmentBooking from './components/screens/AppointmentBooking'
import QueueManagement from './components/screens/QueueManagement'
import PredictionHistory from './components/screens/PredictionHistory'
import AIAssistant from './components/screens/AIAssistant'
import AdminDashboard from './components/screens/AdminDashboard'
import PredictionReports from './components/screens/PredictionReports'
import ProfileSettings from './components/screens/ProfileSettings'
import DoctorManagement from './components/screens/DoctorManagement'

import { Activity } from 'lucide-react'

// Protected Route Wrapper
function ProtectedRoute({ children }) {
  const { user, token, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F5FA] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse mb-3">
          <Activity className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-sm font-bold text-slate-800">Connecting to CareQueue AI...</p>
        <p className="text-xs text-slate-400 mt-1">Verifying SQLite &amp; JWT Credentials</p>
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Public Auth Route Wrapper
function PublicAuthRoute({ children }) {
  const { user, token, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F5FA] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse mb-3">
          <Activity className="w-6 h-6 animate-spin" />
        </div>
      </div>
    )
  }

  if (token && user) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Screen 1: Login */}
      <Route
        path="/login"
        element={
          <PublicAuthRoute>
            <AuthView initialMode="login" />
          </PublicAuthRoute>
        }
      />

      {/* Screen 2: Register */}
      <Route
        path="/register"
        element={
          <PublicAuthRoute>
            <AuthView initialMode="register" />
          </PublicAuthRoute>
        }
      />

      {/* Main Authenticated Layout & Screens */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Screen 3: Patient Dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<PatientDashboard />} />

        {/* Screen 4: Patient Details */}
        <Route path="patient-details" element={<PatientDetails />} />
        <Route path="patients" element={<Navigate to="/patient-details" replace />} />

        {/* Screen 5: Waiting-Time Prediction */}
        <Route path="prediction" element={<MLPrediction />} />
        <Route path="predict" element={<Navigate to="/prediction" replace />} />

        {/* Screen 6: Prediction Result (Visual Focus) */}
        <Route path="prediction-result" element={<PredictionResult />} />

        {/* Screen 7: Appointment */}
        <Route path="appointments" element={<AppointmentBooking />} />

        {/* Doctor & Department Management */}
        <Route path="doctors" element={<DoctorManagement />} />
        <Route path="departments" element={<DoctorManagement />} />

        {/* Screen 8: Queue Status */}
        <Route path="queue" element={<QueueManagement />} />
        <Route path="queue-status" element={<Navigate to="/queue" replace />} />

        {/* Screen 9: Prediction History */}
        <Route path="history" element={<PredictionHistory />} />
        <Route path="prediction-history" element={<Navigate to="/history" replace />} />

        {/* Screen 10: AI Hospital Assistant */}
        <Route path="ai-assistant" element={<AIAssistant />} />

        {/* Screen 11: Admin Dashboard */}
        <Route path="admin-dashboard" element={<AdminDashboard />} />
        <Route path="admin" element={<Navigate to="/admin-dashboard" replace />} />

        {/* Screen 12: Reports */}
        <Route path="reports" element={<PredictionReports />} />

        {/* Screen 13: Profile / Language Settings */}
        <Route path="profile" element={<ProfileSettings />} />
        <Route path="settings" element={<Navigate to="/profile" replace />} />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
