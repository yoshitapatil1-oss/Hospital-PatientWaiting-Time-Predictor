import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { translations } from '../translations'
import {
  Activity, Users, UserPlus, Stethoscope, Calendar, Clock,
  CheckCircle2, AlertTriangle, Shield, LogOut, Globe, Plus,
  RefreshCw, ChevronRight, Check, X, Phone, User, Cpu, BarChart3,
  Sparkles, ArrowRight, TrendingUp, History, Database, Timer,
  ListOrdered, PlayCircle, Eye, Trash2, AlertCircle, Radio
} from 'lucide-react'

export default function DashboardView() {
  const { user, logout, language, changeLanguage, apiFetch } = useAuth()
  const t = translations[language] || translations.en

  // Data States
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [predictionsHistory, setPredictionsHistory] = useState([])
  const [queueItems, setQueueItems] = useState([])
  const [queueStats, setQueueStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [queueLoading, setQueueLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('queue') // queue, prediction_page, history, appointments, patients, doctors, system

  // Modals
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [showAddDoctor, setShowAddDoctor] = useState(false)
  const [showBookAppt, setShowBookAppt] = useState(false)
  const [showAddQueueModal, setShowAddQueueModal] = useState(false)
  const [showViewApptModal, setShowViewApptModal] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState(null)

  // Feedback notifications
  const [toast, setToast] = useState(null)

  // Quick Action Forms
  const [newPatient, setNewPatient] = useState({ name: '', age: '', gender: 'Male', phone: '' })
  const [newDoctor, setNewDoctor] = useState({ name: '', department: 'General Medicine', average_consultation_time: 15, available: true })
  const [newAppt, setNewAppt] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '10:00',
    priority: 'Normal',
    status: 'Scheduled'
  })

  // Live Queue Creation Form
  const [newQueue, setNewQueue] = useState({
    department: 'General Medicine',
    doctor_id: '',
    patient_id: '',
    patient_name: '',
    patients_waiting: 4,
    patients_ahead: 2,
    emergency_patients: 0,
    priority: 'Normal',
    current_status: 'Waiting'
  })

  // Patient Waiting Time Prediction Form (Exact Form Fields Required)
  const [predictionForm, setPredictionForm] = useState({
    patient_id: '',
    department: 'General Medicine',
    doctor_id: '',
    patients_waiting: 8,
    patients_ahead: 4,
    emergency_count: 0,
    available_doctors: 2,
    average_consultation_time: 15,
    priority: 'Normal'
  })

  const [predictionResult, setPredictionResult] = useState(null)
  const [predicting, setPredicting] = useState(false)
  const [modelInfo, setModelInfo] = useState(null)

  // System Health
  const [healthInfo, setHealthInfo] = useState(null)

  // AI Assistant State
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiSending, setAiSending] = useState(false)
  const [aiSuggested, setAiSuggested] = useState([
    "What is the estimated waiting time for Cardiology?",
    "How many patients are currently in queue?",
    "Which doctors are available right now?",
    "Where is the pharmacy located?"
  ])

  // AI Admin Insights State
  const [aiInsights, setAiInsights] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)

  const loadAiInsights = async () => {
    setInsightsLoading(true)
    try {
      const res = await apiFetch('/api/ai/insights')
      if (res.ok) setAiInsights(await res.json())
    } catch (err) {
      console.error('AI Insights error:', err)
    } finally {
      setInsightsLoading(false)
    }
  }

  const sendAiMessage = async (messageText) => {
    const msg = (messageText || aiInput).trim()
    if (!msg) return
    setAiInput('')
    const userMsg = { role: 'user', text: msg, ts: new Date().toLocaleTimeString() }
    setAiMessages(prev => [...prev, userMsg])
    setAiSending(true)
    try {
      const res = await apiFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: msg, language: language })
      })
      if (res.ok) {
        const data = await res.json()
        setAiMessages(prev => [...prev, {
          role: 'assistant',
          text: data.response,
          intent: data.detected_intent,
          suggested: data.suggested_questions,
          ts: new Date().toLocaleTimeString()
        }])
        if (data.suggested_questions?.length) setAiSuggested(data.suggested_questions)
      } else {
        setAiMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I could not process your request. Please try again.', ts: new Date().toLocaleTimeString() }])
      }
    } catch (err) {
      setAiMessages(prev => [...prev, { role: 'assistant', text: 'Connection error. Please ensure the backend is running.', ts: new Date().toLocaleTimeString() }])
    } finally {
      setAiSending(false)
    }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // Load all foundational data from SQLite backend
  const loadData = async () => {
    setLoading(true)
    try {
      const [apptsRes, patientsRes, docsRes, healthRes, modelRes, historyRes, queueRes, statsRes] = await Promise.all([
        apiFetch('/api/appointments'),
        apiFetch('/api/patients'),
        apiFetch('/api/doctors'),
        apiFetch('/api/health'),
        apiFetch('/api/predictions/model-info'),
        apiFetch('/api/predictions/history'),
        apiFetch('/api/queue'),
        apiFetch('/api/queue/stats')
      ])

      if (apptsRes.ok) setAppointments(await apptsRes.json())
      if (patientsRes.ok) {
        const ptData = await patientsRes.json()
        setPatients(ptData)
        if (ptData.length > 0 && !predictionForm.patient_id) {
          setPredictionForm(prev => ({ ...prev, patient_id: ptData[0].id }))
          setNewAppt(prev => ({ ...prev, patient_id: ptData[0].id }))
          setNewQueue(prev => ({ ...prev, patient_id: ptData[0].id, patient_name: ptData[0].name }))
        }
      }
      if (docsRes.ok) {
        const docData = await docsRes.json()
        setDoctors(docData)
        if (docData.length > 0 && !predictionForm.doctor_id) {
          setPredictionForm(prev => ({
            ...prev,
            doctor_id: docData[0].id,
            department: docData[0].department,
            average_consultation_time: docData[0].average_consultation_time
          }))
          setNewAppt(prev => ({ ...prev, doctor_id: docData[0].id }))
          setNewQueue(prev => ({ ...prev, doctor_id: docData[0].id, department: docData[0].department }))
        }
      }
      if (healthRes.ok) setHealthInfo(await healthRes.json())
      if (modelRes.ok) setModelInfo(await modelRes.json())
      if (historyRes.ok) setPredictionsHistory(await historyRes.json())
      if (queueRes.ok) setQueueItems(await queueRes.json())
      if (statsRes.ok) setQueueStats(await statsRes.json())
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load prediction history
  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await apiFetch('/api/predictions/history')
      if (res.ok) {
        setPredictionsHistory(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setHistoryLoading(false)
    }
  }

  // Refresh queue and dashboard stats
  const loadQueue = async () => {
    setQueueLoading(true)
    try {
      const [queueRes, statsRes] = await Promise.all([
        apiFetch('/api/queue'),
        apiFetch('/api/queue/stats')
      ])
      if (queueRes.ok) setQueueItems(await queueRes.json())
      if (statsRes.ok) setQueueStats(await statsRes.json())
    } catch (err) {
      console.error(err)
    } finally {
      setQueueLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto-sync department & average consultation time when doctor selection changes
  const handleDoctorChange = (doctorId) => {
    const selectedDoc = doctors.find(d => d.id === parseInt(doctorId, 10))
    if (selectedDoc) {
      setPredictionForm(prev => ({
        ...prev,
        doctor_id: selectedDoc.id,
        department: selectedDoc.department,
        average_consultation_time: selectedDoc.average_consultation_time
      }))
    } else {
      setPredictionForm(prev => ({ ...prev, doctor_id: doctorId }))
    }
  }

  // Handle Predict Waiting Time Submission
  const handlePredictWaitTime = async (e) => {
    e.preventDefault()
    setPredicting(true)
    setPredictionResult(null)

    try {
      const now = new Date()
      const payload = {
        department: predictionForm.department,
        patients_waiting: parseInt(predictionForm.patients_waiting, 10),
        patients_ahead: parseInt(predictionForm.patients_ahead, 10),
        emergency_count: parseInt(predictionForm.emergency_count, 10),
        available_doctors: parseInt(predictionForm.available_doctors, 10),
        average_consultation_time: parseFloat(predictionForm.average_consultation_time),
        hour: now.getHours(),
        day_of_week: (now.getDay() + 6) % 7,
        priority: predictionForm.priority,
        previous_average_waiting_time: 25.0,
        patient_id: predictionForm.patient_id ? parseInt(predictionForm.patient_id, 10) : null,
        doctor_id: predictionForm.doctor_id ? parseInt(predictionForm.doctor_id, 10) : null
      }

      const res = await apiFetch('/api/predictions/predict', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || 'Prediction failed')
      }

      const data = await res.json()
      setPredictionResult(data)
      showToast(`${t.predictedWaitTime}: ${data.predicted_waiting_time} ${t.minutes}! ${t.savedToDb}`)
      loadHistory()
      loadQueue()
    } catch (err) {
      alert(`Prediction Error: ${err.message}`)
    } finally {
      setPredicting(false)
    }
  }

  // Create Patient in SQLite
  const handleCreatePatient = async (e) => {
    e.preventDefault()
    try {
      const res = await apiFetch('/api/patients', {
        method: 'POST',
        body: JSON.stringify({
          name: newPatient.name,
          age: parseInt(newPatient.age, 10),
          gender: newPatient.gender,
          phone: newPatient.phone
        })
      })
      if (!res.ok) throw new Error('Failed to create patient')
      const created = await res.json()
      setPatients(prev => [created, ...prev])
      setPredictionForm(prev => ({ ...prev, patient_id: created.id }))
      setNewPatient({ name: '', age: '', gender: 'Male', phone: '' })
      setShowAddPatient(false)
      showToast(`${t.patient} "${created.name}" ${t.savedSuccessfully}`)
      loadQueue()
    } catch (err) {
      alert(err.message)
    }
  }

  // Create Doctor in SQLite
  const handleCreateDoctor = async (e) => {
    e.preventDefault()
    try {
      const res = await apiFetch('/api/doctors', {
        method: 'POST',
        body: JSON.stringify({
          name: newDoctor.name,
          department: newDoctor.department,
          average_consultation_time: parseInt(newDoctor.average_consultation_time, 10),
          available: newDoctor.available
        })
      })
      if (!res.ok) throw new Error('Failed to add doctor')
      const created = await res.json()
      setDoctors(prev => [...prev, created])
      setNewDoctor({ name: '', department: 'General Medicine', average_consultation_time: 15, available: true })
      setShowAddDoctor(false)
      showToast(`${t.doctor} "${created.name}" ${t.savedSuccessfully}`)
      loadQueue()
    } catch (err) {
      alert(err.message)
    }
  }

  // Book Appointment in SQLite
  const handleBookAppointment = async (e) => {
    e.preventDefault()
    try {
      const res = await apiFetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: parseInt(newAppt.patient_id, 10),
          doctor_id: parseInt(newAppt.doctor_id, 10),
          appointment_date: newAppt.appointment_date,
          appointment_time: newAppt.appointment_time,
          priority: newAppt.priority,
          status: newAppt.status
        })
      })
      if (!res.ok) throw new Error('Failed to book appointment')
      const created = await res.json()
      setAppointments(prev => [created, ...prev])
      setShowBookAppt(false)
      showToast(`${t.appointments} ${t.savedSuccessfully}`)
      loadQueue()
    } catch (err) {
      alert(err.message)
    }
  }

  // Update Appointment Status in SQLite
  const handleUpdateApptStatus = async (apptId, nextStatus) => {
    try {
      const res = await apiFetch(`/api/appointments/${apptId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      })
      if (res.ok) {
        const updated = await res.json()
        setAppointments(prev => prev.map(a => (a.id === apptId ? updated : a)))
        if (selectedAppt && selectedAppt.id === apptId) {
          setSelectedAppt(updated)
        }
        showToast(`${t.status}: ${nextStatus}`)
        loadQueue()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Cancel Appointment in SQLite
  const handleCancelAppt = async (apptId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return
    try {
      const res = await apiFetch(`/api/appointments/${apptId}/cancel`, { method: 'PUT' })
      if (res.ok) {
        const updated = await res.json()
        setAppointments(prev => prev.map(a => (a.id === apptId ? updated : a)))
        if (selectedAppt && selectedAppt.id === apptId) {
          setSelectedAppt(updated)
        }
        showToast('Appointment marked as Cancelled in SQLite')
        loadQueue()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // View Appointment Details Modal
  const handleViewAppt = async (appt) => {
    try {
      const res = await apiFetch(`/api/appointments/${appt.id}`)
      if (res.ok) {
        setSelectedAppt(await res.json())
      } else {
        setSelectedAppt(appt)
      }
      setShowViewApptModal(true)
    } catch (err) {
      setSelectedAppt(appt)
      setShowViewApptModal(true)
    }
  }

  // Add Patient to Live Queue
  const handleCreateQueue = async (e) => {
    e.preventDefault()
    try {
      let patName = newQueue.patient_name
      if (newQueue.patient_id) {
        const pt = patients.find(p => p.id === parseInt(newQueue.patient_id, 10))
        if (pt) patName = pt.name
      }

      const res = await apiFetch('/api/queue', {
        method: 'POST',
        body: JSON.stringify({
          department: newQueue.department,
          doctor_id: newQueue.doctor_id ? parseInt(newQueue.doctor_id, 10) : null,
          patient_id: newQueue.patient_id ? parseInt(newQueue.patient_id, 10) : null,
          patient_name: patName || 'Walk-in Patient',
          patients_waiting: parseInt(newQueue.patients_waiting, 10),
          patients_ahead: parseInt(newQueue.patients_ahead, 10),
          emergency_patients: parseInt(newQueue.emergency_patients, 10),
          priority: newQueue.priority,
          current_status: newQueue.current_status
        })
      })

      if (!res.ok) throw new Error('Failed to create queue entry')
      const created = await res.json()
      setQueueItems(prev => [created, ...prev])
      setShowAddQueueModal(false)
      showToast(`Queue ticket #${created.id} added! Estimated wait: ${created.estimated_wait_time} mins`)
      loadQueue()
    } catch (err) {
      alert(err.message)
    }
  }

  // Update Queue Status in SQLite
  const handleUpdateQueueStatus = async (queueId, nextStatus) => {
    try {
      const res = await apiFetch(`/api/queue/${queueId}`, {
        method: 'PUT',
        body: JSON.stringify({ current_status: nextStatus })
      })
      if (res.ok) {
        const updated = await res.json()
        setQueueItems(prev => prev.map(q => (q.id === queueId ? updated : q)))
        showToast(`Queue #${queueId} updated to ${nextStatus}`)
        loadQueue()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Delete/Cancel Queue Item in SQLite
  const handleDeleteQueue = async (queueId) => {
    if (!window.confirm(`Delete queue ticket #${queueId}?`)) return
    try {
      const res = await apiFetch(`/api/queue/${queueId}`, { method: 'DELETE' })
      if (res.ok) {
        setQueueItems(prev => prev.filter(q => q.id !== queueId))
        showToast(`Queue ticket #${queueId} removed`)
        loadQueue()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Toggle Doctor Availability
  const handleToggleDoctor = async (docId) => {
    try {
      const res = await apiFetch(`/api/doctors/${docId}/toggle-availability`, { method: 'PATCH' })
      if (res.ok) {
        const updated = await res.json()
        setDoctors(prev => prev.map(d => (d.id === docId ? updated : d)))
        loadQueue()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Helper values for dashboard stats (all from SQLite)
  const totalPatientsCount = queueStats?.total_patients ?? patients.length
  const currentWaitingCount = queueStats?.current_waiting_patients ?? queueItems.filter(q => q.current_status === 'Waiting').length
  const avgWaitTime = queueStats?.average_predicted_waiting_time ?? 24.5
  const emergencyCasesCount = queueStats?.emergency_cases ?? queueItems.filter(q => q.priority === 'Emergency' || q.emergency_patients > 0).length
  const availableDocsCount = queueStats?.available_doctors ?? doctors.filter(d => d.available).length
  const currentQueueStatus = queueStats?.queue_status || 'Moderate'

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-slide-up text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {t.appTitle}
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                {t.appSubtitle} &bull; SQLite + ML Powered
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold border border-slate-200">
              <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5 hidden sm:block" />
              <button
                onClick={() => changeLanguage('en')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  language === 'en' ? 'bg-white text-teal-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="English"
              >
                {t.english || 'English'}
              </button>
              <button
                onClick={() => changeLanguage('mr')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  language === 'mr' ? 'bg-white text-teal-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="मराठी"
              >
                {t.marathi || 'मराठी'}
              </button>
              <button
                onClick={() => changeLanguage('hi')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  language === 'hi' ? 'bg-white text-teal-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="हिंदी"
              >
                {t.hindi || 'हिंदी'}
              </button>
            </div>

            {/* User Profile Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs uppercase">
                {user?.name ? user.name[0] : 'U'}
              </div>
              <div className="hidden md:block text-left text-xs">
                <span className="font-semibold text-slate-800 block leading-tight">{user?.name}</span>
                <span className="text-[10px] text-teal-600 font-medium uppercase tracking-wider">{user?.role}</span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              title={t.logout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
        {/* Welcome & Quick Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              {t.welcome}, {user?.name} 👋
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {t.role}: <span className="font-semibold capitalize text-teal-700">{user?.role}</span> &bull; {t.preferredLanguage}: <span className="font-semibold uppercase">{language}</span> &bull; <span className="text-indigo-600 font-semibold">{t.liveQueueConnected || "Live Queue & Random Forest ML Connected"}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('queue')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                activeTab === 'queue'
                  ? 'bg-teal-600 text-white'
                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              {t.queueManagement} ({queueItems.filter(q => q.current_status === 'Waiting').length})
            </button>

            <button
              onClick={() => setActiveTab('prediction_page')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                activeTab === 'prediction_page'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {t.predictWaitTime}
            </button>

            <button
              onClick={() => setShowAddQueueModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t.addToQueue}
            </button>

            <button
              onClick={() => setShowBookAppt(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              {t.bookAppointment}
            </button>

            <button
              onClick={() => { loadData(); loadQueue(); }}
              title="Refresh SQLite Data"
              className="p-2 text-slate-400 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading || queueLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 6 DASHBOARD STATS CARDS (Exact Requirements: Total Patients, Current Waiting Patients, Avg Predicted Waiting Time, Emergency Cases, Available Doctors, Queue Status) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Card 1: Total Patients */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-500">{t.totalPatients}</span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-800">{totalPatientsCount}</p>
          </div>

          {/* Card 2: Current Waiting Patients */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-500">{t.currentWaitingPatients}</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-amber-600">{currentWaitingCount}</p>
          </div>

          {/* Card 3: Average Predicted Waiting Time */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-500">{t.avgPredictedWaitTime}</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Timer className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-xl font-bold text-indigo-700">{avgWaitTime}</p>
              <span className="text-[10px] text-slate-400 font-medium">{t.minutes}</span>
            </div>
          </div>

          {/* Card 4: Emergency Cases */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-500">{t.emergencyCases}</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-rose-600">{emergencyCasesCount}</p>
          </div>

          {/* Card 5: Available Doctors */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-500">{t.availableDoctors}</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-800">{availableDocsCount} / {doctors.length}</p>
          </div>

          {/* Card 6: Queue Status (Low, Moderate, High) */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
            currentQueueStatus === 'Low'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
              : currentQueueStatus === 'Moderate'
              ? 'bg-amber-50/70 border-amber-200 text-amber-800'
              : 'bg-rose-50/70 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold">{t.queueStatus}</span>
              <span className={`w-2.5 h-2.5 rounded-full animate-ping ${
                currentQueueStatus === 'Low' ? 'bg-emerald-500' : currentQueueStatus === 'Moderate' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black uppercase tracking-wider">
                {currentQueueStatus === 'Low' ? t.statusLow : currentQueueStatus === 'Moderate' ? t.statusModerate : t.statusHigh}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50/50 px-3 sm:px-4 pt-2 gap-1.5 sm:gap-2 text-xs font-semibold overflow-x-auto scrollbar-none">
            {/* Tab: Live Queue Management */}
            <button
              onClick={() => { setActiveTab('queue'); loadQueue(); }}
              className={`py-2.5 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
                activeTab === 'queue'
                  ? 'border-teal-600 text-teal-700 bg-white font-bold'
                  : 'border-transparent text-slate-600 hover:text-teal-700'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 text-teal-600" />
              {t.queueManagement}
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-teal-100 text-teal-800">
                {queueItems.filter(q => q.current_status === 'Waiting').length}
              </span>
            </button>

            {/* Tab: Predict Waiting Time */}
            <button
              onClick={() => setActiveTab('prediction_page')}
              className={`py-2.5 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
                activeTab === 'prediction_page'
                  ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                  : 'border-transparent text-slate-600 hover:text-indigo-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              {t.aiPredictor}
            </button>

            {/* Tab: Prediction History */}
            <button
              onClick={() => { setActiveTab('history'); loadHistory(); }}
              className={`py-2.5 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
                activeTab === 'history'
                  ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                  : 'border-transparent text-slate-600 hover:text-indigo-700'
              }`}
            >
              <History className="w-3.5 h-3.5 text-indigo-600" />
              {t.predictionHistory} ({predictionsHistory.length})
            </button>

            {/* Tab: Appointments */}
            <button
              onClick={() => setActiveTab('appointments')}
              className={`py-2.5 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
                activeTab === 'appointments'
                  ? 'border-teal-600 text-teal-700 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              {t.appointments} ({appointments.length})
            </button>

            {/* Tab: Patients */}
            <button
              onClick={() => setActiveTab('patients')}
              className={`py-2.5 px-3.5 rounded-t-xl transition-all border-b-2 shrink-0 ${
                activeTab === 'patients'
                  ? 'border-teal-600 text-teal-700 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.patients} ({patients.length})
            </button>

            {/* Tab: Doctors */}
            <button
              onClick={() => setActiveTab('doctors')}
              className={`py-2.5 px-3.5 rounded-t-xl transition-all border-b-2 shrink-0 ${
                activeTab === 'doctors'
                  ? 'border-teal-600 text-teal-700 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.doctors} ({doctors.length})
            </button>

            {/* Tab: System & DB */}
            <button
              onClick={() => setActiveTab('system')}
              className={`py-2.5 px-3.5 rounded-t-xl transition-all border-b-2 shrink-0 ${
                activeTab === 'system'
                  ? 'border-teal-600 text-teal-700 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.systemDb || "System & DB"}
            </button>

            {/* Tab: AI Hospital Assistant */}
            <button
              onClick={() => setActiveTab('ai_assistant')}
              className={`py-2.5 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
                activeTab === 'ai_assistant'
                  ? 'border-violet-600 text-violet-700 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-violet-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              {t.aiAssistant || 'AI Assistant'}
            </button>

            {/* Tab: AI Admin Insights */}
            <button
              onClick={() => { setActiveTab('ai_insights'); loadAiInsights(); }}
              className={`py-2.5 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
                activeTab === 'ai_insights'
                  ? 'border-amber-600 text-amber-700 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-amber-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
              {t.adminInsights || 'Admin Insights'}
            </button>
          </div>


          <div className="p-4 sm:p-5">
            {/* 1. REAL HOSPITAL QUEUE MANAGEMENT TAB */}
            {activeTab === 'queue' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ListOrdered className="w-4 h-4 text-teal-600" />
                      Live Hospital Queue Status
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Real-time queue tracking backed by SQLite with ML-estimated waiting times.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddQueueModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t.addToQueue}
                    </button>
                    <button
                      onClick={loadQueue}
                      disabled={queueLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${queueLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Queue Cards / Table (Responsive) */}
                {queueItems.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p>No patients currently in the live queue. Click "{t.addToQueue}" to check in a patient.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="pb-3 px-3">Ticket</th>
                          <th className="pb-3 px-3">{t.patientName}</th>
                          <th className="pb-3 px-3">{t.department} &bull; {t.doctor}</th>
                          <th className="pb-3 px-3">{t.patientsWaiting} &bull; {t.patientsAhead}</th>
                          <th className="pb-3 px-3">{t.emergencyPatients}</th>
                          <th className="pb-3 px-3">{t.priority}</th>
                          <th className="pb-3 px-3">{t.estimatedWaitTime}</th>
                          <th className="pb-3 px-3">{t.status}</th>
                          <th className="pb-3 px-3 text-right">{t.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {queueItems.map((q) => (
                          <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-slate-700">
                              #{q.id}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              {q.patient_name || 'Walk-in Patient'}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-medium text-slate-800 block">{q.department}</span>
                              <span className="text-[11px] text-teal-600 font-normal">
                                {q.doctor_name || 'Assigned On-Duty'}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-700">
                              <span className="font-semibold">{q.patients_ahead}</span> ahead <span className="text-slate-400">&bull;</span> {q.patients_waiting} total
                            </td>
                            <td className="py-3 px-3">
                              {q.emergency_patients > 0 ? (
                                <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full text-[11px]">
                                  <AlertTriangle className="w-3 h-3" />
                                  {q.emergency_patients} case(s)
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono">0</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                q.priority === 'Emergency'
                                  ? 'bg-rose-100 text-rose-700'
                                  : q.priority === 'Priority' || q.priority === 'Urgent'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {q.priority}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-mono font-bold text-indigo-700 text-sm">
                                {q.estimated_wait_time} {t.minutes}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                                q.current_status === 'In Consultation'
                                  ? 'bg-indigo-100 text-indigo-800 font-bold'
                                  : q.current_status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : q.current_status === 'Cancelled'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-800 animate-pulse'
                              }`}>
                                {q.current_status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {q.current_status === 'Waiting' && (
                                  <button
                                    onClick={() => handleUpdateQueueStatus(q.id, 'In Consultation')}
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                                    title="Start Consultation"
                                  >
                                    <PlayCircle className="w-3 h-3" />
                                    {t.callNext}
                                  </button>
                                )}
                                {q.current_status === 'In Consultation' && (
                                  <button
                                    onClick={() => handleUpdateQueueStatus(q.id, 'Completed')}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                                    title="Mark Completed"
                                  >
                                    <Check className="w-3 h-3" />
                                    {t.markCompleted}
                                  </button>
                                )}
                                <select
                                  value={q.current_status}
                                  onChange={(e) => handleUpdateQueueStatus(q.id, e.target.value)}
                                  className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-teal-500 font-medium"
                                >
                                  <option value="Waiting">Waiting</option>
                                  <option value="In Consultation">In Consultation</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                                <button
                                  onClick={() => handleDeleteQueue(q.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                  title="Delete Ticket"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. PATIENT WAITING TIME PREDICTION PAGE */}
            {activeTab === 'prediction_page' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Form Container (7 Cols) */}
                  <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-indigo-600" />
                          Patient Waiting Time Prediction
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Enter hospital queue parameters to obtain waiting-time prediction from the Random Forest model.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Live ML Inference
                      </span>
                    </div>

                    <form onSubmit={handlePredictWaitTime} className="space-y-4 text-xs">
                      {/* Field 1: Patient Selection */}
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1">
                          {t.patient} <span className="text-slate-400 font-normal">(Select registered patient)</span>
                        </label>
                        <select
                          value={predictionForm.patient_id}
                          onChange={(e) => setPredictionForm({ ...predictionForm, patient_id: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                        >
                          <option value="">Walk-in Patient / General Triage</option>
                          {patients.map((p) => (
                            <option key={p.id} value={p.id}>
                              #{p.id} - {p.name} ({p.age} yrs, {p.gender}, {p.phone})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Field 2 & 3: Doctor and Department */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            {t.doctor} <span className="text-slate-400 font-normal">(Auto-fills dept &amp; time)</span>
                          </label>
                          <select
                            value={predictionForm.doctor_id}
                            onChange={(e) => handleDoctorChange(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                          >
                            <option value="">Select Doctor</option>
                            {doctors.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} &bull; {d.department} ({d.average_consultation_time}m)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">{t.department}</label>
                          <select
                            value={predictionForm.department}
                            onChange={(e) => setPredictionForm({ ...predictionForm, department: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
                          >
                            <option value="General Medicine">General Medicine</option>
                            <option value="Cardiology">Cardiology</option>
                            <option value="Orthopedics">Orthopedics</option>
                            <option value="Pediatrics">Pediatrics</option>
                            <option value="Emergency Care">Emergency Care</option>
                            <option value="Neurology">Neurology</option>
                            <option value="Dermatology">Dermatology</option>
                          </select>
                        </div>
                      </div>

                      {/* Field 4 & 5: Patients Waiting & Patients Ahead */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            {t.patientsWaiting} <span className="text-slate-400 font-normal">(In department)</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            required
                            value={predictionForm.patients_waiting}
                            onChange={(e) => setPredictionForm({ ...predictionForm, patients_waiting: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono text-sm"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            {t.patientsAhead} <span className="text-slate-400 font-normal">(Before this patient)</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            required
                            value={predictionForm.patients_ahead}
                            onChange={(e) => setPredictionForm({ ...predictionForm, patients_ahead: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono text-sm"
                          />
                        </div>
                      </div>

                      {/* Field 6 & 7: Emergency Patients & Available Doctors */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            {t.emergencyPatients} <span className="text-slate-400 font-normal">(Higher triage weight)</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            required
                            value={predictionForm.emergency_count}
                            onChange={(e) => setPredictionForm({ ...predictionForm, emergency_count: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono text-sm"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            {t.availableDoctors} <span className="text-slate-400 font-normal">(Currently on duty)</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            required
                            value={predictionForm.available_doctors}
                            onChange={(e) => setPredictionForm({ ...predictionForm, available_doctors: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono text-sm"
                          />
                        </div>
                      </div>

                      {/* Field 8 & 9: Average Consultation Time & Priority */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            {t.consultationTime} <span className="text-slate-400 font-normal">(Minutes/patient)</span>
                          </label>
                          <input
                            type="number"
                            min="5"
                            max="60"
                            step="0.5"
                            required
                            value={predictionForm.average_consultation_time}
                            onChange={(e) => setPredictionForm({ ...predictionForm, average_consultation_time: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono text-sm"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">{t.priority}</label>
                          <select
                            value={predictionForm.priority}
                            onChange={(e) => setPredictionForm({ ...predictionForm, priority: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-semibold"
                          >
                            <option value="Normal">{t.normal} (Triage Level 3)</option>
                            <option value="Urgent">{t.urgent} (Triage Level 2)</option>
                            <option value="Emergency">{t.emergency} (Triage Level 1)</option>
                          </select>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={predicting}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 text-sm"
                      >
                        {predicting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            {t.predicting}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            {t.predictWaitTime}
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Clean Result Container (5 Cols) */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                    {predictionResult ? (
                      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex-1 flex flex-col justify-between border border-indigo-700/50">
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-indigo-700/50">
                            <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300">
                              {t.predictedWaitTime}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                              {predictionResult.model_name}
                            </span>
                          </div>

                          <div className="my-6 text-center">
                            <div className="text-6xl font-black tracking-tight text-white font-mono">
                              {predictionResult.predicted_waiting_time}
                            </div>
                            <div className="text-sm font-semibold text-indigo-200 mt-1 uppercase tracking-widest">
                              {predictionResult.prediction_unit || t.minutes}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs bg-indigo-950/60 p-3 rounded-xl border border-indigo-800/40">
                            <div>
                              <span className="text-indigo-300 block text-[10px] uppercase">{t.queueSize}</span>
                              <span className="font-bold text-white font-mono text-sm">{predictionResult.queue_size}</span>
                            </div>
                            <div>
                              <span className="text-indigo-300 block text-[10px] uppercase">{t.patientsAhead}</span>
                              <span className="font-bold text-white font-mono text-sm">{predictionResult.patients_ahead}</span>
                            </div>
                            <div className="col-span-2 pt-2 border-t border-indigo-900/50">
                              <span className="text-indigo-300 block text-[10px] uppercase">{t.selectedDoctor}</span>
                              <span className="font-bold text-white text-xs">{predictionResult.selected_doctor}</span>
                            </div>
                            <div>
                              <span className="text-indigo-300 block text-[10px] uppercase">{t.estimatedConsultationTime}</span>
                              <span className="font-bold text-white font-mono text-xs">{predictionResult.estimated_consultation_time} {t.minutes}</span>
                            </div>
                            <div>
                              <span className="text-indigo-300 block text-[10px] uppercase">{t.predictionTimestamp}</span>
                              <span className="font-mono text-indigo-200 text-[11px] block">{predictionResult.prediction_timestamp}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-indigo-700/40 flex items-center justify-between text-[11px]">
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t.savedToDb} (#{predictionResult.id})
                          </span>
                          <button
                            onClick={() => { setActiveTab('history'); loadHistory(); }}
                            className="text-indigo-200 hover:text-white flex items-center gap-1 font-medium transition-colors"
                          >
                            View in History <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex-1 flex flex-col items-center justify-center text-center">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                          <Cpu className="w-7 h-7" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">Ready for Inference</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                          Configure patient and queue factors on the left, then click <strong>"Predict Waiting Time"</strong> to run the Random Forest model.
                        </p>
                        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[11px] font-mono">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          scikit-learn RandomForestRegressor Loaded
                        </div>
                      </div>
                    )}

                    {/* Model Info Mini-Card */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">RandomForestRegressor v1.0.0</span>
                        <span className="text-[11px] text-slate-400">Trained on 7,500 realistic records</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-teal-600 block">96.4% R² Accuracy</span>
                        <span className="text-[11px] text-slate-400 font-mono">MAE: 11.96 mins</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. PREDICTION HISTORY PAGE */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <History className="w-4 h-4 text-indigo-600" />
                      {t.predictionHistory}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{t.historySubtitle}</p>
                  </div>
                  <button
                    onClick={loadHistory}
                    disabled={historyLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                    Refresh History
                  </button>
                </div>

                <div className="overflow-x-auto">
                  {predictionsHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      <Database className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p>{t.noHistory}</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="pb-3 px-3">#ID</th>
                          <th className="pb-3 px-3">{t.patientName}</th>
                          <th className="pb-3 px-3">{t.doctor} &bull; {t.department}</th>
                          <th className="pb-3 px-3">{t.priority}</th>
                          <th className="pb-3 px-3">{t.queueSize} &bull; {t.patientsAhead}</th>
                          <th className="pb-3 px-3">{t.consultationTime}</th>
                          <th className="pb-3 px-3">{t.predictedWaitTime}</th>
                          <th className="pb-3 px-3 text-right">Timestamp (UTC)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {predictionsHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-slate-400">#{item.id}</td>
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              {item.patient_name || 'Walk-in Patient'}
                            </td>
                            <td className="py-3 px-3 text-slate-700">
                              <span className="font-medium block">{item.doctor_name || 'On-Duty'}</span>
                              <span className="text-[10px] text-teal-600">{item.department}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                item.priority === 'Emergency'
                                  ? 'bg-rose-100 text-rose-700'
                                  : item.priority === 'Urgent'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {item.priority}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-600">
                              {item.patients_ahead} ahead <span className="text-slate-400">&bull;</span> {item.patients_waiting} in queue
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-600">
                              {item.average_consultation_time} {t.minutes}
                            </td>
                            <td className="py-3 px-3 font-bold font-mono text-indigo-700 text-sm">
                              {item.predicted_waiting_time} {t.minutes}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-400 text-[11px]">
                              {new Date(item.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* 4. APPOINTMENT MANAGEMENT TAB (Book, View, Cancel, Update Status) */}
            {activeTab === 'appointments' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-teal-600" />
                      {t.appointments} Management
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Book, view, update status, and cancel appointments in SQLite.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBookAppt(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t.bookAppointment}
                  </button>
                </div>

                {appointments.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p>{t.noAppointments}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="pb-3 px-3">#</th>
                          <th className="pb-3 px-3">{t.patientName}</th>
                          <th className="pb-3 px-3">{t.doctor} &bull; {t.department}</th>
                          <th className="pb-3 px-3">{t.appointmentDate} &bull; {t.appointmentTime}</th>
                          <th className="pb-3 px-3">{t.priority}</th>
                          <th className="pb-3 px-3">{t.status}</th>
                          <th className="pb-3 px-3 text-right">{t.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {appointments.map((appt) => (
                          <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-mono text-slate-400 font-bold">#{appt.id}</td>
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              {appt.patient?.name || `Patient #${appt.patient_id}`}
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {appt.patient?.age} yrs &bull; {appt.patient?.gender}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-700">
                              <span className="block font-semibold">{appt.doctor?.name || `Dr. #${appt.doctor_id}`}</span>
                              <span className="text-[10px] text-teal-600">{appt.doctor?.department || 'General'}</span>
                            </td>
                            <td className="py-3 px-3 text-slate-600 font-mono">
                              {appt.appointment_date} <span className="text-slate-400">&bull;</span> {appt.appointment_time}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                appt.priority === 'Emergency'
                                  ? 'bg-rose-100 text-rose-700'
                                  : appt.priority === 'Urgent'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {appt.priority}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                                appt.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : appt.status === 'In Consultation'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : appt.status === 'Cancelled'
                                  ? 'bg-rose-100 text-rose-700'
                                  : appt.status === 'Waiting'
                                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {appt.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* View Appointment */}
                                <button
                                  onClick={() => handleViewAppt(appt)}
                                  className="p-1 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                                  title={t.viewAppointment}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {/* Update Status Dropdown */}
                                <select
                                  value={appt.status}
                                  onChange={(e) => handleUpdateApptStatus(appt.id, e.target.value)}
                                  className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-teal-500 font-medium cursor-pointer"
                                >
                                  <option value="Scheduled">{t.scheduled}</option>
                                  <option value="Waiting">{t.waiting}</option>
                                  <option value="In Consultation">{t.inConsultation}</option>
                                  <option value="Completed">{t.completed}</option>
                                  <option value="Cancelled">{t.cancelled}</option>
                                </select>

                                {/* Cancel Appointment Button */}
                                {appt.status !== 'Cancelled' && (
                                  <button
                                    onClick={() => handleCancelAppt(appt.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title={t.cancelAppointment}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 5. PATIENTS TAB */}
            {activeTab === 'patients' && (
              <div className="overflow-x-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <h3 className="text-sm font-bold text-slate-900">{t.patients}</h3>
                  <button
                    onClick={() => setShowAddPatient(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {t.addPatient}
                  </button>
                </div>
                {patients.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p>{t.noPatients}</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="pb-3 px-3">ID</th>
                        <th className="pb-3 px-3">{t.patientName}</th>
                        <th className="pb-3 px-3">{t.age}</th>
                        <th className="pb-3 px-3">{t.gender}</th>
                        <th className="pb-3 px-3">{t.phone}</th>
                        <th className="pb-3 px-3">Created In SQLite</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patients.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-400">#{p.id}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{p.name}</td>
                          <td className="py-3 px-3 text-slate-600">{p.age}</td>
                          <td className="py-3 px-3 text-slate-600">{p.gender}</td>
                          <td className="py-3 px-3 font-mono text-slate-600">{p.phone}</td>
                          <td className="py-3 px-3 text-slate-400 text-[11px] font-mono">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 6. DOCTORS TAB */}
            {activeTab === 'doctors' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">{t.doctors}</h3>
                  <button
                    onClick={() => setShowAddDoctor(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t.addDoctor}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {doctors.map((doc) => (
                    <div key={doc.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-all flex flex-col justify-between shadow-xs">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-800 text-sm">{doc.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            doc.available ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {doc.available ? t.available : t.busy}
                          </span>
                        </div>
                        <p className="text-xs text-teal-600 font-medium mb-3">{doc.department}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500 py-2 border-t border-slate-100">
                          <span>{t.consultationTime}:</span>
                          <span className="font-mono font-semibold text-slate-700">{doc.average_consultation_time} {t.minutes}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => handleToggleDoctor(doc.id)}
                          className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            doc.available
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {doc.available ? 'Set Out of Office / Busy' : 'Set Available'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. SYSTEM & DB TAB */}
            {activeTab === 'system' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4 text-teal-600" />
                      SQLite Database State
                    </h4>
                    <p className="text-slate-600">Database Engine: <strong>SQLite 3</strong></p>
                    <p className="text-slate-600">ORM: <strong>SQLAlchemy 2.0+</strong></p>
                    <p className="text-slate-600">Location: <code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded">backend/data/hospital.db</code></p>
                    <p className="text-emerald-700 font-medium">✓ Tables: users, patients, doctors, appointments, predictions, queues</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-indigo-600" />
                      Machine Learning Pipeline
                    </h4>
                    <p className="text-slate-600">Model: <strong>RandomForestRegressor (120 trees)</strong></p>
                    <p className="text-slate-600">Artifact: <code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded">backend/app/ml/waiting_model.pkl</code></p>
                    <p className="text-slate-600">R² Score: <strong>0.9638</strong> &bull; MAE: <strong>11.96 mins</strong></p>
                    <p className="text-indigo-700 font-medium">✓ Real inference API: POST /api/predictions/predict</p>
                  </div>
                </div>
              </div>
            )}

            {/* 8. AI HOSPITAL ASSISTANT TAB */}
            {activeTab === 'ai_assistant' && (
              <div className="flex flex-col h-[600px]">
                {/* Header */}
                <div className="pb-3 border-b border-slate-100 mb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    {t.aiAssistant || 'AI Hospital Assistant'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.aiAssistantSubtitle || 'Real-time answers powered by SQLite records & Random Forest ML'}
                  </p>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-[10px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                    {t.groundTruthNotice || 'Answers reflect actual SQLite records and Random Forest ML'}
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
                  {aiMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-10">
                      <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-400 flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-semibold text-slate-600">Ask the AI Hospital Assistant</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs">
                        Ask about waiting times, queue status, doctor availability, appointments, or hospital directions.
                      </p>
                    </div>
                  )}
                  {aiMessages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-violet-600 text-white rounded-tr-sm'
                          : 'bg-slate-100 text-slate-800 rounded-tl-sm border border-slate-200'
                      }`}>
                        {msg.role === 'assistant'
                          ? msg.text.split('\n').map((line, i) => (
                              <p key={i} className={line.startsWith('**') ? 'font-semibold' : ''}
                                dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                              />
                            ))
                          : <p>{msg.text}</p>
                        }
                        {msg.intent && (
                          <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono opacity-70">
                            {msg.intent}
                          </span>
                        )}
                        <p className="text-[10px] opacity-50 mt-1">{msg.ts}</p>
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                          {user?.name ? user.name[0].toUpperCase() : 'U'}
                        </div>
                      )}
                    </div>
                  ))}
                  {aiSending && (
                    <div className="flex gap-2 justify-start">
                      <div className="w-7 h-7 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      </div>
                      <div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Suggested Questions */}
                {aiSuggested.length > 0 && aiMessages.length < 4 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      {t.suggestedQueries || 'Suggested Questions'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiSuggested.slice(0, 3).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => sendAiMessage(q)}
                          disabled={aiSending}
                          className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 text-[11px] font-medium hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Bar */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }}
                    placeholder={t.askAiPlaceholder || 'Ask about wait times, queue, doctors, or navigation...'}
                    className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 bg-slate-50"
                    disabled={aiSending}
                  />
                  <button
                    onClick={() => sendAiMessage()}
                    disabled={aiSending || !aiInput.trim()}
                    className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    {t.send || 'Send'}
                  </button>
                </div>
              </div>
            )}

            {/* 9. AI ADMIN INSIGHTS TAB */}
            {activeTab === 'ai_insights' && (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-amber-600" />
                      {t.adminInsights || 'AI Admin Insights'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.adminInsightsSubtitle || 'Operational intelligence based on actual SQLite hospital data'}
                    </p>
                  </div>
                  <button
                    onClick={loadAiInsights}
                    disabled={insightsLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${insightsLoading ? 'animate-spin' : ''}`} />
                    {t.refreshAnalysis || "Refresh Analysis"}
                  </button>
                </div>

                {insightsLoading && (
                  <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                    Analyzing hospital data...
                  </div>
                )}

                {!insightsLoading && !aiInsights && (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-400 flex items-center justify-center mx-auto mb-3">
                      <BarChart3 className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">No insights loaded</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Refresh Analysis" to generate insights from SQLite data.</p>
                  </div>
                )}

                {!insightsLoading && aiInsights && (
                  <div className="space-y-4">
                    {/* Row 1: 3 Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Department with Highest Wait */}
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                            {t.highestWaitDept || 'Highest Wait Dept'}
                          </span>
                        </div>
                        <p className="text-base font-black text-rose-800">
                          {aiInsights.highest_waiting_department?.department}
                        </p>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-xl font-bold text-rose-700">
                            {aiInsights.highest_waiting_department?.avg_wait_minutes}
                          </span>
                          <span className="text-xs text-rose-500">mins avg</span>
                        </div>
                        <p className="text-[11px] text-rose-600 mt-1">
                          {aiInsights.highest_waiting_department?.waiting_patients} waiting &bull; {aiInsights.highest_waiting_department?.doctor_count} doctors on duty
                        </p>
                      </div>

                      {/* Peak Hours */}
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                            {t.peakHours || 'Peak Hours'}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 font-semibold">
                          🌅 {t.morningPeak || 'Morning'}: {aiInsights.peak_hospital_hours?.morning_peak}
                        </p>
                        <p className="text-[11px] text-amber-800 font-semibold mt-1">
                          🌆 {t.eveningPeak || 'Evening'}: {aiInsights.peak_hospital_hours?.evening_peak}
                        </p>
                        <p className="text-[11px] text-amber-700 mt-1.5">
                          Busiest slot: <strong>{aiInsights.peak_hospital_hours?.busiest_hour_slot}</strong>
                        </p>
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          aiInsights.peak_hospital_hours?.status === 'Peak Hours'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {aiInsights.peak_hospital_hours?.status}
                        </span>
                      </div>

                      {/* Doctor Availability */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Stethoscope className="w-4 h-4 text-teal-600 shrink-0" />
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            {t.doctorAvailability || 'Doctor Availability'}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-black text-emerald-700">
                            {aiInsights.doctor_availability?.available_doctors}
                          </span>
                          <span className="text-xs text-slate-500">
                            {'/'} {aiInsights.doctor_availability?.total_doctors} on duty
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          <span className="text-rose-600 font-semibold">{aiInsights.doctor_availability?.unavailable_doctors}</span> unavailable
                        </p>
                        {aiInsights.doctor_availability?.departments_with_no_doctor?.length > 0 && (
                          <p className="text-[11px] text-rose-600 font-medium mt-1.5">
                            ⚠ No doctor in: {aiInsights.doctor_availability.departments_with_no_doctor.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* High Queue Alerts */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-3">
                        <Radio className="w-3.5 h-3.5 text-rose-600" />
                        {t.highQueueAlerts || 'High Queue Alerts'}
                        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">
                          {aiInsights.high_queue_alerts?.length} alert{aiInsights.high_queue_alerts?.length !== 1 ? 's' : ''}
                        </span>
                      </h4>
                      {aiInsights.high_queue_alerts?.length === 0 ? (
                        <div className="flex items-center gap-2 text-emerald-700 text-xs py-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          {t.noQueueAlerts || 'All queue levels are within safe thresholds'}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {aiInsights.high_queue_alerts.map((alert, i) => (
                            <div key={i} className={`flex items-start gap-3 p-2.5 rounded-xl ${
                              alert.severity === 'Critical' ? 'bg-rose-50 border border-rose-200' :
                              alert.severity === 'High' ? 'bg-orange-50 border border-orange-200' :
                              'bg-amber-50 border border-amber-200'
                            }`}>
                              <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                                alert.severity === 'Critical' ? 'text-rose-600' :
                                alert.severity === 'High' ? 'text-orange-600' : 'text-amber-600'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-800">{alert.department} — {alert.severity}</p>
                                <p className="text-[11px] text-slate-600 mt-0.5">{alert.alert_message}</p>
                                <div className="flex gap-3 mt-1 text-[10px] text-slate-500 font-medium">
                                  <span>Waiting: <strong>{alert.patients_waiting}</strong></span>
                                  <span>Emergency: <strong>{alert.emergency_count}</strong></span>
                                  <span>Est. wait: <strong>{alert.estimated_wait_time} min</strong></span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Staffing Recommendations */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-3">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                        {t.staffingRecommendations || 'Staffing & Resource Recommendations'}
                      </h4>
                      {aiInsights.staffing_recommendations?.length === 0 ? (
                        <div className="flex items-center gap-2 text-emerald-700 text-xs py-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          {t.noRecommendations || 'Staffing levels are optimal across all departments'}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {aiInsights.staffing_recommendations.map((rec, i) => (
                            <div key={i} className={`p-3 rounded-xl border ${
                              rec.priority === 'High' ? 'bg-rose-50 border-rose-200' :
                              rec.priority === 'Medium' ? 'bg-amber-50 border-amber-200' :
                              'bg-slate-50 border-slate-200'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  rec.priority === 'High' ? 'bg-rose-100 text-rose-700' :
                                  rec.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {rec.priority === 'High' ? t.highPriority : rec.priority === 'Medium' ? t.mediumPriority : t.lowPriority}
                                </span>
                                <span className="text-xs font-semibold text-slate-800">{rec.title}</span>
                              </div>
                              <p className="text-[11px] text-slate-600">{rec.description}</p>
                              {rec.action && (
                                <p className="text-[11px] text-indigo-700 font-medium mt-1">
                                  → {rec.action}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Doctor Workload Table */}
                    {aiInsights.doctor_availability?.doctor_workload?.length > 0 && (
                      <div className="p-4 rounded-2xl bg-white border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                          {t.doctorWorkloadSummary || "Doctor Workload Summary"}
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                                <th className="pb-2 px-2">Doctor</th>
                                <th className="pb-2 px-2">Dept</th>
                                <th className="pb-2 px-2">Status</th>
                                <th className="pb-2 px-2">Queue</th>
                                <th className="pb-2 px-2">Avg. Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {aiInsights.doctor_availability.doctor_workload.map((doc, i) => (
                                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                  <td className="py-2 px-2 font-medium text-slate-800">{doc.name}</td>
                                  <td className="py-2 px-2 text-slate-500">{doc.department}</td>
                                  <td className="py-2 px-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      doc.available ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                    }`}>
                                      {doc.available ? 'On Duty' : 'Off Duty'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 font-mono text-slate-700">{doc.queue_count}</td>
                                  <td className="py-2 px-2 text-slate-500">{doc.avg_consultation_time} min</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Analyzed At */}
                    <p className="text-[10px] text-slate-400 text-right">
                      {t.analyzedAt || 'Analyzed at'}: {aiInsights.analyzed_at}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Modal: Add to Queue */}
      {showAddQueueModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-teal-600" />
                {t.addToQueue}
              </h3>
              <button onClick={() => setShowAddQueueModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateQueue} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {t.patient} <span className="text-slate-400 font-normal">(Registered or enter name)</span>
                </label>
                <select
                  value={newQueue.patient_id}
                  onChange={(e) => {
                    const pid = e.target.value
                    const pt = patients.find(p => p.id === parseInt(pid, 10))
                    setNewQueue({ ...newQueue, patient_id: pid, patient_name: pt ? pt.name : '' })
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 mb-1"
                >
                  <option value="">-- Choose Registered Patient (Optional) --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      #{p.id} - {p.name} ({p.age} yrs, {p.phone})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or enter Walk-in Patient Name..."
                  value={newQueue.patient_name}
                  onChange={(e) => setNewQueue({ ...newQueue, patient_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.department}</label>
                  <select
                    value={newQueue.department}
                    onChange={(e) => setNewQueue({ ...newQueue, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                  >
                    <option value="General Medicine">General Medicine</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Emergency Care">Emergency Care</option>
                    <option value="Neurology">Neurology</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.doctor}</label>
                  <select
                    value={newQueue.doctor_id}
                    onChange={(e) => setNewQueue({ ...newQueue, doctor_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Any Available Doctor</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.patientsWaiting}</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newQueue.patients_waiting}
                    onChange={(e) => setNewQueue({ ...newQueue, patients_waiting: e.target.value })}
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.patientsAhead}</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newQueue.patients_ahead}
                    onChange={(e) => setNewQueue({ ...newQueue, patients_ahead: e.target.value })}
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Emergency</label>
                  <input
                    type="number"
                    min="0"
                    value={newQueue.emergency_patients}
                    onChange={(e) => setNewQueue({ ...newQueue, emergency_patients: e.target.value })}
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-mono text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.priority}</label>
                  <select
                    value={newQueue.priority}
                    onChange={(e) => setNewQueue({ ...newQueue, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-semibold"
                  >
                    <option value="Normal">{t.normal}</option>
                    <option value="Priority">{t.urgent}</option>
                    <option value="Emergency">{t.emergency}</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.status}</label>
                  <select
                    value={newQueue.current_status}
                    onChange={(e) => setNewQueue({ ...newQueue, current_status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-semibold"
                  >
                    <option value="Waiting">Waiting</option>
                    <option value="In Consultation">In Consultation</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddQueueModal(false)}
                  className="flex-1 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  {t.addToQueue || "Add to Queue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Appointment Details */}
      {showViewApptModal && selectedAppt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                {t.appointmentDetails} (#{selectedAppt.id})
              </h3>
              <button onClick={() => setShowViewApptModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.patient}:</span>
                  <span className="font-bold text-slate-800">{selectedAppt.patient?.name || `Patient #${selectedAppt.patient_id}`}</span>
                </div>
                {selectedAppt.patient && (
                  <div className="flex justify-between text-slate-500">
                    <span>Demographics:</span>
                    <span>{selectedAppt.patient.age} yrs &bull; {selectedAppt.patient.gender} &bull; {selectedAppt.patient.phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.doctor}:</span>
                  <span className="font-bold text-slate-800">{selectedAppt.doctor?.name || `Doctor #${selectedAppt.doctor_id}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.department}:</span>
                  <span className="text-teal-700 font-semibold">{selectedAppt.doctor?.department || 'General'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Scheduled Time:</span>
                  <span className="font-mono text-slate-700">{selectedAppt.appointment_date} at {selectedAppt.appointment_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.priority}:</span>
                  <span className="font-bold uppercase text-slate-800">{selectedAppt.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t.status}:</span>
                  <span className="font-bold text-indigo-700">{selectedAppt.status}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {selectedAppt.status !== 'Cancelled' && (
                  <button
                    onClick={() => {
                      handleCancelAppt(selectedAppt.id)
                      setShowViewApptModal(false)
                    }}
                    className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold transition-colors cursor-pointer"
                  >
                    {t.cancelAppointment}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowViewApptModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  {t.close || "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Patient */}
      {showAddPatient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-teal-600" />
                {t.addPatient} (Save to SQLite)
              </h3>
              <button onClick={() => setShowAddPatient(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePatient} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t.patientName}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kulkarni"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.age}</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.gender}</label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t.phone}</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddPatient(false)}
                  className="flex-1 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Doctor */}
      {showAddDoctor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                {t.addDoctor} (Save to SQLite)
              </h3>
              <button onClick={() => setShowAddDoctor(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDoctor} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t.doctorName || "Doctor Name"}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Sneha More"
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t.department}</label>
                <select
                  value={newDoctor.department}
                  onChange={(e) => setNewDoctor({ ...newDoctor, department: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                >
                  <option value="General Medicine">General Medicine</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Emergency Care">Emergency Care</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Dermatology">Dermatology</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t.avgConsultationTime || "Average Consultation Time (Minutes)"}</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  required
                  value={newDoctor.average_consultation_time}
                  onChange={(e) => setNewDoctor({ ...newDoctor, average_consultation_time: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddDoctor(false)}
                  className="flex-1 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Book Appointment */}
      {showBookAppt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                {t.bookAppointment} (Save to SQLite)
              </h3>
              <button onClick={() => setShowBookAppt(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleBookAppointment} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t.patient}</label>
                <select
                  required
                  value={newAppt.patient_id}
                  onChange={(e) => setNewAppt({ ...newAppt, patient_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                >
                  {patients.length === 0 ? (
                    <option value="">No patients available - please add a patient first</option>
                  ) : (
                    patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.age} yrs, {p.gender})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t.doctor}</label>
                <select
                  required
                  value={newAppt.doctor_id}
                  onChange={(e) => setNewAppt({ ...newAppt, doctor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} &bull; {d.department} ({d.average_consultation_time} mins)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.appointmentDate}</label>
                  <input
                    type="date"
                    required
                    value={newAppt.appointment_date}
                    onChange={(e) => setNewAppt({ ...newAppt, appointment_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.appointmentTime}</label>
                  <input
                    type="time"
                    required
                    value={newAppt.appointment_time}
                    onChange={(e) => setNewAppt({ ...newAppt, appointment_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.priority}</label>
                  <select
                    value={newAppt.priority}
                    onChange={(e) => setNewAppt({ ...newAppt, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-semibold"
                  >
                    <option value="Normal">{t.normal}</option>
                    <option value="Urgent">{t.urgent}</option>
                    <option value="Emergency">{t.emergency}</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.status}</label>
                  <select
                    value={newAppt.status}
                    onChange={(e) => setNewAppt({ ...newAppt, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-semibold"
                  >
                    <option value="Scheduled">{t.scheduled}</option>
                    <option value="Waiting">{t.waiting}</option>
                    <option value="In Consultation">{t.inConsultation}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBookAppt(false)}
                  className="flex-1 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={patients.length === 0}
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
