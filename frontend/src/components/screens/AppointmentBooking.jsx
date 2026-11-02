import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { translations } from '../../translations'
import api from '../../services/api'
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Filter
} from 'lucide-react'

export default function AppointmentBooking() {
  const { language } = useAuth()
  const t = translations[language] || translations.en

  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('All')

  // Form State
  const [newAppt, setNewAppt] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '10:00',
    priority: 'Normal'
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [apptsList, ptsList, docsList] = await Promise.all([
        api.appointments.getAll().catch(() => []),
        api.patients.getAll().catch(() => []),
        api.doctors.getAll().catch(() => [])
      ])
      setAppointments(apptsList)
      setPatients(ptsList)
      setDoctors(docsList)

      if (ptsList.length > 0 && !newAppt.patient_id) {
        setNewAppt((prev) => ({ ...prev, patient_id: ptsList[0].id.toString() }))
      }
      if (docsList.length > 0 && !newAppt.doctor_id) {
        setNewAppt((prev) => ({ ...prev, doctor_id: docsList[0].id.toString() }))
      }
    } catch (err) {
      console.error('Failed to load appointments data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleBookSubmit = async (e) => {
    e.preventDefault()
    setBooking(true)
    setFeedback(null)

    if (!newAppt.patient_id || !newAppt.doctor_id) {
      setFeedback({ type: 'error', message: 'Please select both patient and doctor.' })
      setBooking(false)
      return
    }

    try {
      const created = await api.appointments.create({
        patient_id: parseInt(newAppt.patient_id, 10),
        doctor_id: parseInt(newAppt.doctor_id, 10),
        appointment_date: newAppt.appointment_date,
        appointment_time: newAppt.appointment_time,
        priority: newAppt.priority,
        status: 'Scheduled'
      })

      setFeedback({
        type: 'success',
        message: `Appointment #${created.id} booked successfully for ${created.appointment_date} at ${created.appointment_time}!`
      })
      await loadData()
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to book appointment.' })
    } finally {
      setBooking(false)
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return
    try {
      await api.appointments.cancel(id)
      setFeedback({ type: 'success', message: `Appointment #${id} has been cancelled.` })
      await loadData()
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to cancel appointment.' })
    }
  }

  const filteredAppointments = appointments.filter((a) => {
    if (selectedPriorityFilter === 'All') return true
    return a.priority === selectedPriorityFilter
  })

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          {t.screenAppointments || 'Appointment Booking & Consultation Schedule'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Schedule specialist consultations with doctors and link directly to patient records in
          SQLite.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 text-xs font-medium border animate-slide-up ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Booking Form */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              {t.bookAppointment}
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">SQLite Saved</span>
          </div>

          <form onSubmit={handleBookSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">{t.patient} *</label>
              {patients.length === 0 ? (
                <p className="text-rose-500 text-[11px]">
                  No patients found. Please add a patient in Patient Admission first.
                </p>
              ) : (
                <select
                  required
                  value={newAppt.patient_id}
                  onChange={(e) => setNewAppt({ ...newAppt, patient_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} - {p.name} ({p.gender}, {p.phone})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">{t.doctor} *</label>
              <select
                required
                value={newAppt.doctor_id}
                onChange={(e) => setNewAppt({ ...newAppt, doctor_id: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
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
                <label className="font-semibold text-slate-700 block mb-1">
                  {t.appointmentDate} *
                </label>
                <input
                  type="date"
                  required
                  value={newAppt.appointment_date}
                  onChange={(e) => setNewAppt({ ...newAppt, appointment_date: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {t.appointmentTime} *
                </label>
                <input
                  type="time"
                  required
                  value={newAppt.appointment_time}
                  onChange={(e) => setNewAppt({ ...newAppt, appointment_time: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">{t.priority} *</label>
              <select
                value={newAppt.priority}
                onChange={(e) => setNewAppt({ ...newAppt, priority: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50 font-semibold"
              >
                <option value="Normal">{t.normal} (Routine Checkup)</option>
                <option value="Urgent">{t.urgent} (Priority Symptoms)</option>
                <option value="Emergency">{t.emergency} (Immediate Attention)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={booking || patients.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {booking ? (
                <span>Booking Consultation...</span>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Confirm Appointment</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Appointment Schedule List */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Scheduled Appointments ({appointments.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Saved in SQLite appointments table with real-time updates
              </p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <Filter className="w-3.5 h-3.5 text-slate-500 ml-1" />
              {['All', 'Normal', 'Urgent', 'Emergency'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedPriorityFilter(lvl)}
                  className={`px-2 py-1 rounded-lg transition-colors cursor-pointer text-[11px] ${
                    selectedPriorityFilter === lvl
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No appointments scheduled</p>
              <p className="text-xs text-slate-400 mt-1">
                Book a consultation using the form on the left.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-blue-50/40 hover:border-blue-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {appt.patient?.name || `Patient #${appt.patient_id}`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          appt.priority === 'Emergency'
                            ? 'bg-rose-100 text-rose-700'
                            : appt.priority === 'Urgent'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {appt.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-700">
                        {appt.status}
                      </span>
                    </div>

                    <p className="text-slate-600 flex items-center gap-2">
                      <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                      <span>{appt.doctor?.name || `Doctor #${appt.doctor_id}`}</span>
                      <span className="text-slate-400">&bull;</span>
                      <span className="text-teal-700 font-medium">
                        {appt.doctor?.department || 'General'}
                      </span>
                    </p>

                    <p className="text-slate-500 font-mono text-[11px] flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        {appt.appointment_date} at {appt.appointment_time}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {appt.status !== 'Cancelled' && (
                      <button
                        onClick={() => handleCancel(appt.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors cursor-pointer"
                      >
                        {t.cancelAppointment || 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
