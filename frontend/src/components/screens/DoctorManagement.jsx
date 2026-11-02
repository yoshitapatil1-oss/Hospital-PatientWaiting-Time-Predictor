import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { translations } from '../../translations'
import api from '../../services/api'
import {
  Stethoscope,
  Building2,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  AlertTriangle,
  Trash2,
  ShieldAlert,
  UserCheck
} from 'lucide-react'

export default function DoctorManagement() {
  const { user, language } = useAuth()
  const t = translations[language] || translations.en

  const [activeTab, setActiveTab] = useState('doctors') // 'doctors' | 'departments'
  const [doctors, setDoctors] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('All')

  // Add doctor modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    department: 'General Medicine',
    average_consultation_time: 15,
    available: true
  })
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [docs, depts] = await Promise.all([
        api.doctors.getAll().catch(() => []),
        api.departments.getAll().catch(() => [])
      ])
      setDoctors(docs)
      setDepartments(depts)
    } catch (err) {
      console.error('Failed to load doctor/department data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleToggleAvailability = async (id) => {
    try {
      const updated = await api.doctors.toggleAvailability(id)
      setDoctors(prev => prev.map(d => (d.id === id ? updated : d)))
      showToast(`Doctor availability updated: ${updated.name} is now ${updated.available ? 'Available' : 'Unavailable'}`)
      // Reload department stats to reflect updated available doctors
      api.departments.getAll().then(setDepartments).catch(() => {})
    } catch (err) {
      alert('Failed to update availability: ' + err.message)
    }
  }

  const handleDeleteDoctor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove Dr. ${name}?`)) return
    try {
      await api.doctors.delete(id)
      setDoctors(prev => prev.filter(d => d.id !== id))
      showToast(`Doctor ${name} removed from registry`)
      api.departments.getAll().then(setDepartments).catch(() => {})
    } catch (err) {
      alert('Failed to delete doctor: ' + err.message)
    }
  }

  const handleCreateDoctor = async (e) => {
    e.preventDefault()
    if (!newDoctor.name.trim()) return
    setSubmitting(true)
    try {
      const created = await api.doctors.create({
        name: newDoctor.name.trim(),
        department: newDoctor.department,
        average_consultation_time: Number(newDoctor.average_consultation_time) || 15,
        available: Boolean(newDoctor.available)
      })
      setDoctors(prev => [...prev, created])
      setShowAddModal(false)
      setNewDoctor({
        name: '',
        department: 'General Medicine',
        average_consultation_time: 15,
        available: true
      })
      showToast(`Dr. ${created.name} registered successfully`)
      api.departments.getAll().then(setDepartments).catch(() => {})
    } catch (err) {
      alert('Failed to register doctor: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.department.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDept = selectedDept === 'All' || doc.department === selectedDept
    return matchesSearch && matchesDept
  })

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-fade-in border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-blue-600" />
            <span>{t.doctorManagement || 'Doctor & Department Management'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage physician duty rosters, consultation timing, and clinic departmental capacities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role !== 'patient' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addDoctor || 'Add Doctor'}</span>
            </button>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('doctors')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'doctors'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>{t.doctorsRoster || 'Doctor Roster'} ({doctors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'departments'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{t.departmentsOverview || 'Departments Overview'} ({departments.length})</span>
        </button>
      </div>

      {/* TAB 1: DOCTOR ROSTER */}
      {activeTab === 'doctors' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchDoctorPlaceholder || 'Search by name or department...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Department:
              </span>
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="w-full sm:w-auto py-1.5 px-3 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="All">All Departments</option>
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

          {/* Doctors Grid */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              Loading medical roster...
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 text-center text-slate-400 text-xs space-y-2">
              <Stethoscope className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-bold text-slate-700">No doctors match your criteria</p>
              <p className="text-[11px]">Try adjusting your search query or department filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDoctors.map(doc => (
                <div
                  key={doc.id}
                  className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-black text-sm">
                        {doc.name.replace('Dr. ', '').charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{doc.name}</h4>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {doc.department}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        doc.available
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {doc.available ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Available</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span>Off Duty</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>Avg: <strong className="text-slate-900">{doc.average_consultation_time} min</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <UserCheck className="w-3.5 h-3.5 text-teal-500" />
                      <span>ID: <strong className="text-slate-900">#{doc.id}</strong></span>
                    </div>
                  </div>

                  {user?.role !== 'patient' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleToggleAvailability(doc.id)}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          doc.available
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                        }`}
                      >
                        {doc.available ? 'Set Off Duty' : 'Set Available'}
                      </button>

                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                          className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Remove Doctor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DEPARTMENTS OVERVIEW */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept, idx) => (
              <div
                key={idx}
                className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{dept.name}</h4>
                      <p className="text-[10px] text-slate-400">CareQueue OPD Unit</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      dept.status === 'Optimal'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : dept.status === 'Moderate Load'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : dept.status === 'High Congestion'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {dept.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Doctors:</span>
                    <p className="font-extrabold text-slate-900 text-sm">
                      {dept.available_doctors} <span className="text-slate-400 text-xs">/ {dept.total_doctors} on duty</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Wait Time:</span>
                    <p className="font-extrabold text-blue-700 text-sm">
                      ~{dept.estimated_wait_time} min
                    </p>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Waiting Queue:</span>
                    <p className="font-extrabold text-slate-900">
                      {dept.waiting_patients} patients
                    </p>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Emergency:</span>
                    <p className="font-extrabold text-rose-600">
                      {dept.emergency_cases} case(s)
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                  <span>Avg Consult: <strong>{dept.average_consultation_time} min</strong></span>
                  <span className="text-[10px] font-mono text-slate-400">Active OPD</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                <span>Register New Physician</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Verma"
                  value={newDoctor.name}
                  onChange={e => setNewDoctor({ ...newDoctor, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Department *</label>
                <select
                  value={newDoctor.department}
                  onChange={e => setNewDoctor({ ...newDoctor, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
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
                <label className="block font-bold text-slate-700 mb-1">
                  Average Consultation Time (Minutes) *
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  required
                  value={newDoctor.average_consultation_time}
                  onChange={e => setNewDoctor({ ...newDoctor, average_consultation_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="avail_chk"
                  checked={newDoctor.available}
                  onChange={e => setNewDoctor({ ...newDoctor, available: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="avail_chk" className="font-semibold text-slate-700 cursor-pointer">
                  Available on duty immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? 'Registering...' : 'Save Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
