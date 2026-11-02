import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { translations } from '../../translations'
import api from '../../services/api'
import {
  Clock,
  Users,
  AlertTriangle,
  Stethoscope,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  ListOrdered,
  PlusCircle,
  Activity,
  CheckCircle2,
  PhoneCall,
  ChevronRight,
  ShieldCheck
} from 'lucide-react'

export default function PatientDashboard() {
  const { user, language } = useAuth()
  const t = translations[language] || translations.en
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [patientsCount, setPatientsCount] = useState(0)
  const [doctorsCount, setDoctorsCount] = useState({ available: 0, total: 0 })
  const [todayAppts, setTodayAppts] = useState([])
  const [recentQueue, setRecentQueue] = useState([])
  const [latestPrediction, setLatestPrediction] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [queueStats, queueList, patientsList, doctorsList, apptsList, predHistory] =
        await Promise.all([
          api.queue.getStats().catch(() => null),
          api.queue.getAll().catch(() => []),
          api.patients.getAll().catch(() => []),
          api.doctors.getAll().catch(() => []),
          api.appointments.getAll().catch(() => []),
          api.predictions.getHistory(1).catch(() => [])
        ])

      setStats(queueStats)
      setRecentQueue(queueList.slice(0, 5))
      setPatientsCount(patientsList.length)

      const avail = doctorsList.filter((d) => d.available).length
      setDoctorsCount({ available: avail, total: doctorsList.length })

      setTodayAppts(apptsList.filter((a) => a.status !== 'Cancelled').slice(0, 5))

      if (predHistory && predHistory.length > 0) {
        setLatestPrediction(predHistory[0])
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Calculate predicted waiting time display
  const predictedTimeVal = latestPrediction
    ? latestPrediction.predicted_waiting_time
    : stats?.average_predicted_waiting_time || 22.5

  const predictedDept = latestPrediction?.department || 'General Medicine'

  // Severity category
  const waitSeverity =
    predictedTimeVal <= 15
      ? { label: 'Low Wait', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
      : predictedTimeVal <= 30
      ? { label: 'Moderate Wait', color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
      : { label: 'High Wait', color: 'rose', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Hospital Operations Live
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t.welcome}, {user?.name || 'Patient'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Role: <span className="font-semibold text-blue-700 capitalize">{user?.role}</span> &bull;{' '}
            {t.liveQueueConnected || 'Random Forest ML & SQLite Active'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
            title="Refresh Hospital Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/prediction')}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.predictWaitTime || 'Predict Waiting Time'}</span>
          </button>
        </div>
      </div>

      {/* 5 CORE DASHBOARD METRICS:
          1. PREDICTED WAITING TIME (VISUAL HERO FOCUS)
          2. CURRENT QUEUE
          3. EMERGENCY CASES
          4. AVAILABLE DOCTORS
          5. TODAY'S APPOINTMENTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* 1. HERO CARD: PREDICTED WAITING TIME (Large Visual Spotlight) */}
        <div className="lg:col-span-4 bg-gradient-to-br from-white via-blue-50/40 to-blue-50/80 p-6 sm:p-7 rounded-3xl border-2 border-blue-200 shadow-md shadow-blue-500/5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-bl-full pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {t.predictedWaitTime || 'Predicted Waiting Time'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${waitSeverity.bg} ${waitSeverity.text} border ${waitSeverity.border}`}>
                {waitSeverity.label}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              ML inference for {predictedDept}
            </p>

            <div className="flex items-baseline gap-2 mt-4 mb-2">
              <span className="text-6xl font-black text-blue-700 tracking-tight">
                {predictedTimeVal}
              </span>
              <span className="text-xl font-bold text-slate-600">minutes</span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Based on live queue size, patients ahead, on-duty doctors, and average consultation times.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-blue-100 flex items-center justify-between">
            <button
              onClick={() => navigate('/prediction-result')}
              className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{t.viewPredictionResult || 'View Detailed Result Focus'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-400 font-mono">v1.0.0 RF</span>
          </div>
        </div>

        {/* 4 CARDS: Current Queue, Emergency Cases, Available Doctors, Today's Appointments */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 2. CURRENT QUEUE */}
          <div
            onClick={() => navigate('/queue')}
            className="p-5 bg-white rounded-3xl border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t.currentWaitingPatients || 'Current Queue'}
              </span>
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center">
                <ListOrdered className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {stats?.current_waiting_patients ?? 0}
                </span>
                <span className="text-xs font-semibold text-slate-400">patients waiting</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  stats?.queue_status === 'High'
                    ? 'bg-rose-100 text-rose-700'
                    : stats?.queue_status === 'Moderate'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  Status: {stats?.queue_status || 'Normal'}
                </span>
                <span className="text-[11px] text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  Manage &rarr;
                </span>
              </div>
            </div>
          </div>

          {/* 3. EMERGENCY CASES */}
          <div
            onClick={() => navigate('/queue')}
            className="p-5 bg-white rounded-3xl border border-slate-200/80 hover:border-rose-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                {t.emergencyCases || 'Emergency Cases'}
              </span>
              <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-600">
                  {stats?.emergency_cases ?? 0}
                </span>
                <span className="text-xs font-semibold text-rose-400">critical triage</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] text-rose-600 font-semibold">
                  Immediate Physician Routing
                </span>
                <span className="text-[11px] text-rose-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  Triage &rarr;
                </span>
              </div>
            </div>
          </div>

          {/* 4. AVAILABLE DOCTORS */}
          <div
            onClick={() => navigate('/appointments')}
            className="p-5 bg-white rounded-3xl border border-slate-200/80 hover:border-teal-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t.activeDoctors || 'Available Doctors'}
              </span>
              <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-teal-700">
                  {doctorsCount.available}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  / {doctorsCount.total} on duty
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] text-teal-600 font-semibold">
                  Cardiology, Ortho, Ped, Med
                </span>
                <span className="text-[11px] text-teal-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  Schedule &rarr;
                </span>
              </div>
            </div>
          </div>

          {/* 5. TODAY'S APPOINTMENTS */}
          <div
            onClick={() => navigate('/appointments')}
            className="p-5 bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t.todaysAppointments || "Today's Appointments"}
              </span>
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-700">
                  {todayAppts.length}
                </span>
                <span className="text-xs font-semibold text-slate-400">booked consultations</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] text-indigo-600 font-semibold">
                  Active Consultation Slots
                </span>
                <span className="text-[11px] text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  View &rarr;
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Today's Appointments List & Live Queue Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Appointments Feed */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                {t.todaysAppointments || "Today's Appointments"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Active consultation schedule</p>
            </div>
            <button
              onClick={() => navigate('/appointments')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              {t.view || 'View All'} &rarr;
            </button>
          </div>

          {todayAppts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">No appointments scheduled for today</p>
              <button
                onClick={() => navigate('/appointments')}
                className="mt-3 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
              >
                + Book Appointment
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {todayAppts.map((appt) => (
                <div
                  key={appt.id}
                  className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:bg-blue-50/50 hover:border-blue-200 transition-all flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900 text-xs">
                      {appt.patient?.name || `Patient #${appt.patient_id}`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {appt.doctor?.name || `Doctor #${appt.doctor_id}`} &bull;{' '}
                      <span className="font-mono text-slate-700 font-semibold">{appt.appointment_time}</span>
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      appt.priority === 'Emergency'
                        ? 'bg-rose-100 text-rose-700'
                        : appt.priority === 'Urgent'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {appt.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Hospital Queue Snapshot */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-teal-600" />
                {t.recentQueue || 'Live Hospital Queue Snapshot'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Current OPD queue telemetry and ML waiting time
              </p>
            </div>
            <button
              onClick={() => navigate('/queue')}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer"
            >
              {t.screenQueueStatus || 'Full Queue'} &rarr;
            </button>
          </div>

          {recentQueue.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <ListOrdered className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">No patients waiting in queue</p>
              <button
                onClick={() => navigate('/patient-details')}
                className="mt-3 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 text-xs font-bold hover:bg-teal-100 transition-colors cursor-pointer"
              >
                + Check In Patient
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                    <th className="pb-2.5 px-3">Token #</th>
                    <th className="pb-2.5 px-3">{t.patient}</th>
                    <th className="pb-2.5 px-3">{t.department}</th>
                    <th className="pb-2.5 px-3 text-center">{t.patientsAhead}</th>
                    <th className="pb-2.5 px-3">{t.predictedWaitTime}</th>
                    <th className="pb-2.5 px-3">{t.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {recentQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600">#{item.id}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.patient_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{item.department}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-center text-slate-800">
                        {item.patients_ahead}
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-blue-700">
                        {item.estimated_wait_time} <span className="text-[10px] font-normal text-slate-400">min</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.current_status === 'Waiting'
                            ? 'bg-blue-100 text-blue-700'
                            : item.current_status === 'In Consultation'
                            ? 'bg-teal-100 text-teal-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {item.current_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
