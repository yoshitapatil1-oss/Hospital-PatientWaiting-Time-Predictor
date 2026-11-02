import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { translations } from '../../translations'
import api from '../../services/api'
import {
  ListOrdered,
  RefreshCw,
  Plus,
  Filter,
  AlertTriangle,
  Clock,
  Users,
  Stethoscope,
  PlayCircle,
  CheckCircle2,
  Trash2,
  X,
  Sparkles
} from 'lucide-react'

export default function QueueManagement() {
  const { language } = useAuth()
  const t = translations[language] || translations.en

  const [queueItems, setQueueItems] = useState([])
  const [stats, setStats] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedDept, setSelectedDept] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')

  // Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newItem, setNewItem] = useState({
    patient_id: '',
    patient_name: '',
    department: 'General Medicine',
    doctor_id: '',
    priority: 'Normal',
    patients_waiting: 3,
    patients_ahead: 2,
    emergency_patients: 0,
    current_status: 'Waiting'
  })

  const departments = [
    'All',
    'General Medicine',
    'Cardiology',
    'Orthopedics',
    'Pediatrics',
    'Emergency Care',
    'Neurology',
    'Dermatology'
  ]

  const loadQueueData = async () => {
    setLoading(true)
    try {
      const deptFilter = selectedDept === 'All' ? null : selectedDept
      const statusFilter = selectedStatus === 'All' ? null : selectedStatus

      const [items, queueStats, docs, pts] = await Promise.all([
        api.queue.getAll(deptFilter, statusFilter),
        api.queue.getStats(),
        api.doctors.getAll().catch(() => []),
        api.patients.getAll().catch(() => [])
      ])

      setQueueItems(items)
      setStats(queueStats)
      setDoctors(docs)
      setPatients(pts)
    } catch (err) {
      console.error('Failed to load queue data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQueueData()
  }, [selectedDept, selectedStatus])

  // Call Next Patient (advances waiting patient into consultation)
  const handleCallNext = async (item) => {
    try {
      await api.queue.update(item.id, {
        current_status: 'In Consultation',
        patients_ahead: Math.max(0, item.patients_ahead - 1)
      })
      await loadQueueData()
    } catch (err) {
      alert('Failed to update status: ' + err.message)
    }
  }

  // Mark Completed
  const handleComplete = async (item) => {
    try {
      await api.queue.update(item.id, {
        current_status: 'Completed'
      })
      await loadQueueData()
    } catch (err) {
      alert('Failed to update status: ' + err.message)
    }
  }

  // Delete from Queue
  const handleDelete = async (id) => {
    if (!window.confirm('Remove patient from live queue?')) return
    try {
      await api.queue.delete(id)
      await loadQueueData()
    } catch (err) {
      alert('Failed to delete item: ' + err.message)
    }
  }

  // Submit Add to Queue
  const handleAddSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.queue.create({
        patient_id: newItem.patient_id ? parseInt(newItem.patient_id, 10) : null,
        patient_name: newItem.patient_name || 'Walk-in Patient',
        doctor_id: newItem.doctor_id ? parseInt(newItem.doctor_id, 10) : null,
        department: newItem.department,
        patients_waiting: parseInt(newItem.patients_waiting, 10) || 0,
        patients_ahead: parseInt(newItem.patients_ahead, 10) || 0,
        emergency_patients: parseInt(newItem.emergency_patients, 10) || 0,
        priority: newItem.priority,
        current_status: newItem.current_status
      })
      setShowAddModal(false)
      setNewItem({
        patient_id: '',
        patient_name: '',
        department: 'General Medicine',
        doctor_id: '',
        priority: 'Normal',
        patients_waiting: 3,
        patients_ahead: 2,
        emergency_patients: 0,
        current_status: 'Waiting'
      })
      await loadQueueData()
    } catch (err) {
      alert('Failed to add to queue: ' + err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ListOrdered className="w-6 h-6 text-blue-600" />
            {t.queueManagement || 'Live Hospital Queue Management'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time outpatient queue tracking with automated Random Forest ML wait times.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadQueueData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addToQueue || 'Add to Queue'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t.currentWaitingPatients}
            </p>
            <p className="text-2xl font-black text-slate-900">
              {stats?.current_waiting_patients ?? 0}
            </p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t.avgPredictedWaitTime}
            </p>
            <p className="text-2xl font-black text-teal-700">
              {stats?.average_predicted_waiting_time || '0.0'}{' '}
              <span className="text-xs font-semibold text-teal-600">min</span>
            </p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t.emergencyCases}
            </p>
            <p className="text-2xl font-black text-rose-600">{stats?.emergency_cases ?? 0}</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              stats?.queue_status === 'High'
                ? 'bg-rose-50 text-rose-600'
                : stats?.queue_status === 'Moderate'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            <ListOrdered className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t.queueStatus}
            </p>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-extrabold ${
                stats?.queue_status === 'High'
                  ? 'bg-rose-100 text-rose-700'
                  : stats?.queue_status === 'Moderate'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {stats?.queue_status === 'High'
                ? t.statusHigh
                : stats?.queue_status === 'Moderate'
                ? t.statusModerate
                : t.statusLow}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            {t.filterByDepartment || 'Filter by Department'}
          </span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Waiting">Waiting</option>
            <option value="In Consultation">In Consultation</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedDept === dept
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {dept === 'All' ? t.allDepartments || 'All Departments' : dept}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {queueItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ListOrdered className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No patients in selected queue</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "+ Add to Queue" above to admit a patient.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Token #</th>
                  <th className="py-3 px-4">{t.patient}</th>
                  <th className="py-3 px-4">{t.department}</th>
                  <th className="py-3 px-4">{t.doctor}</th>
                  <th className="py-3 px-4">{t.priority}</th>
                  <th className="py-3 px-4 text-center">{t.patientsAhead}</th>
                  <th className="py-3 px-4">{t.estimatedWaitTime}</th>
                  <th className="py-3 px-4">{t.status}</th>
                  <th className="py-3 px-4 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {queueItems.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">#{item.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {item.patient_name || 'Walk-in'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{item.department}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.doctor_name || 'On Duty'}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.priority === 'Emergency'
                            ? 'bg-rose-100 text-rose-700'
                            : item.priority === 'Priority' || item.priority === 'Urgent'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-center text-slate-800">
                      {item.patients_ahead}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-teal-700">
                      {item.estimated_wait_time}{' '}
                      <span className="text-[10px] font-normal text-slate-400">mins</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.current_status === 'Waiting'
                            ? 'bg-blue-100 text-blue-700'
                            : item.current_status === 'In Consultation'
                            ? 'bg-teal-100 text-teal-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {item.current_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.current_status === 'Waiting' && (
                          <button
                            onClick={() => handleCallNext(item)}
                            title="Call Next into Consultation"
                            className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[11px] border border-teal-200 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>{t.callNext || 'Call'}</span>
                          </button>
                        )}
                        {item.current_status === 'In Consultation' && (
                          <button
                            onClick={() => handleComplete(item)}
                            title="Mark Consultation Completed"
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t.markCompleted || 'Done'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          title="Remove from queue"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

      {/* Modal: Add to Queue */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-blue-600" />
                {t.addToQueue}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Registered Patient or Walk-in Name
                </label>
                <select
                  value={newItem.patient_id}
                  onChange={(e) => {
                    const pid = e.target.value
                    const pt = patients.find((p) => p.id === parseInt(pid, 10))
                    setNewItem({
                      ...newItem,
                      patient_id: pid,
                      patient_name: pt ? pt.name : ''
                    })
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl mb-1.5 bg-slate-50"
                >
                  <option value="">-- Choose Registered Patient (Optional) --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} - {p.name} ({p.phone})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or enter Walk-in Patient Name..."
                  value={newItem.patient_name}
                  onChange={(e) => setNewItem({ ...newItem, patient_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.department}</label>
                  <select
                    value={newItem.department}
                    onChange={(e) => setNewItem({ ...newItem, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
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
                    value={newItem.doctor_id}
                    onChange={(e) => setNewItem({ ...newItem, doctor_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                  >
                    <option value="">Any Available Doctor</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Waiting</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newItem.patients_waiting}
                    onChange={(e) =>
                      setNewItem({ ...newItem, patients_waiting: e.target.value })
                    }
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl font-mono text-center"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ahead</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newItem.patients_ahead}
                    onChange={(e) =>
                      setNewItem({ ...newItem, patients_ahead: e.target.value })
                    }
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl font-mono text-center"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Emergency</label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.emergency_patients}
                    onChange={(e) =>
                      setNewItem({ ...newItem, emergency_patients: e.target.value })
                    }
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl font-mono text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.priority}</label>
                  <select
                    value={newItem.priority}
                    onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Normal">{t.normal}</option>
                    <option value="Priority">{t.urgent}</option>
                    <option value="Emergency">{t.emergency}</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">{t.status}</label>
                  <select
                    value={newItem.current_status}
                    onChange={(e) => setNewItem({ ...newItem, current_status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Waiting">Waiting</option>
                    <option value="In Consultation">In Consultation</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  {t.addToQueue}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
