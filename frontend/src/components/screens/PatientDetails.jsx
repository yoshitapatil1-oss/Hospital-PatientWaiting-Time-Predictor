import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { translations } from '../../translations'
import api from '../../services/api'
import {
  UserPlus,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Phone,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Trash2
} from 'lucide-react'

export default function PatientDetails() {
  const { language } = useAuth()
  const t = translations[language] || translations.en
  const navigate = useNavigate()

  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', message }

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    department: 'General Medicine',
    doctor_id: '',
    priority: 'Normal',
    patients_waiting: '3',
    patients_ahead: '2',
    emergency_patients: '0',
    available_doctors: '3',
    average_consultation_time: '15'
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [ptList, docList] = await Promise.all([
        api.patients.getAll().catch(() => []),
        api.doctors.getAll().catch(() => [])
      ])
      setPatients(ptList)
      setDoctors(docList)
      if (docList.length > 0) {
        setFormData((prev) => ({
          ...prev,
          doctor_id: docList[0].id.toString(),
          average_consultation_time: docList[0].average_consultation_time.toString()
        }))
      }
    } catch (err) {
      console.error('Error loading patient details data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // When doctor changes, auto-set dept and consultation time
  const handleDoctorChange = (docId) => {
    const selected = doctors.find((d) => d.id === parseInt(docId, 10))
    setFormData((prev) => ({
      ...prev,
      doctor_id: docId,
      department: selected ? selected.department : prev.department,
      average_consultation_time: selected ? selected.average_consultation_time.toString() : prev.average_consultation_time
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFeedback(null)

    try {
      // 1. Create Patient in SQLite
      const createdPatient = await api.patients.create({
        name: formData.name.trim(),
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        phone: formData.phone.trim()
      })

      // 2. Add to Live Queue with ML waiting-time calculation
      const queueRes = await api.queue.create({
        patient_id: createdPatient.id,
        patient_name: createdPatient.name,
        doctor_id: formData.doctor_id ? parseInt(formData.doctor_id, 10) : null,
        department: formData.department,
        patients_waiting: parseInt(formData.patients_waiting, 10) || 0,
        patients_ahead: parseInt(formData.patients_ahead, 10) || 0,
        emergency_patients: parseInt(formData.emergency_patients, 10) || 0,
        priority: formData.priority,
        current_status: 'Waiting'
      })

      setFeedback({
        type: 'success',
        message: `Patient ${createdPatient.name} saved (ID #${createdPatient.id}) and admitted to ${formData.department} queue with predicted wait of ${queueRes.estimated_wait_time} mins!`
      })

      // Reset form
      setFormData((prev) => ({
        ...prev,
        name: '',
        age: '',
        phone: ''
      }))

      // Reload patients table
      await loadData()
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit patient details.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePatient = async (id, name) => {
    if (!window.confirm(`Delete patient #${id} (${name})?`)) return
    try {
      await api.patients.delete(id)
      setPatients(prev => prev.filter(p => p.id !== id))
      setFeedback({ type: 'success', message: `Patient #${id} (${name}) deleted successfully.` })
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to delete patient: ' + err.message })
    }
  }

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-blue-600" />
            {t.screenPatientDetails || 'Patient Admission & Queue Entry'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Collect validated demographic information, select department/doctor, and auto-enqueue
            with Random Forest prediction.
          </p>
        </div>

        <button
          onClick={() => navigate('/queue')}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2 self-start sm:self-auto"
        >
          <span>{t.queueManagement || 'View Live Queue'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
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
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Admission Form */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-teal-600" />
              Patient &amp; Queue Admission Form
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              All records are stored permanently in SQLite
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Section 1: Demographics */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                1. Patient Demographics
              </p>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {t.patientName} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kulkarni"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.age} *</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    placeholder="e.g. 45"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-slate-50/50 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.gender} *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-slate-50/50"
                  >
                    <option value="Male">{t.male || 'Male'}</option>
                    <option value="Female">{t.female || 'Female'}</option>
                    <option value="Other">{t.other || 'Other'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t.phone} *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-slate-50/50 font-mono"
                />
              </div>
            </div>

            {/* Section 2: Department & Doctor */}
            <div className="space-y-3 pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                2. Clinical Routing &amp; Priority
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.department}</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
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
                  <label className="font-semibold text-slate-700 block mb-1">{t.doctor}</label>
                  <select
                    value={formData.doctor_id}
                    onChange={(e) => handleDoctorChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t.priority}</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Normal', 'Urgent', 'Emergency'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: lvl })}
                      className={`py-2 px-3 rounded-xl font-bold text-center border transition-all cursor-pointer ${
                        formData.priority === lvl
                          ? lvl === 'Emergency'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : lvl === 'Urgent'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {lvl === 'Normal' ? t.normal : lvl === 'Urgent' ? t.urgent : t.emergency}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3: Live Queue Telemetry (for ML) */}
            <div className="space-y-3 pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                3. Live Queue Context (ML Inference)
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {t.patientsWaiting}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.patients_waiting}
                    onChange={(e) =>
                      setFormData({ ...formData, patients_waiting: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-center bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {t.patientsAhead}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.patients_ahead}
                    onChange={(e) => setFormData({ ...formData, patients_ahead: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-center bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Emergency Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.emergency_patients}
                    onChange={(e) =>
                      setFormData({ ...formData, emergency_patients: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-center bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {t.availableDoctors}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.available_doctors}
                    onChange={(e) =>
                      setFormData({ ...formData, available_doctors: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-center bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Avg Consultation (min)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={formData.average_consultation_time}
                    onChange={(e) =>
                      setFormData({ ...formData, average_consultation_time: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-center bg-slate-50/50"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <span>Saving &amp; Predicting...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Save Patient &amp; Enqueue with ML</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Registered Patients List */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Registered Patients Directory
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{patients.length} records in SQLite</p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={t.searchPatients || 'Search patients by name or phone...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[520px] pr-1">
            {filteredPatients.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                {t.noPatients || 'No patients found.'}
              </p>
            ) : (
              filteredPatients.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-blue-50/50 hover:border-blue-200 transition-all flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {p.name}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">#{p.id}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {p.age} yrs &bull; {p.gender} &bull; {p.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          name: p.name,
                          age: p.age.toString(),
                          gender: p.gender,
                          phone: p.phone
                        }))
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      Select
                    </button>
                    <button
                      onClick={() => handleDeletePatient(p.id, p.name)}
                      className="p-1 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete patient record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
