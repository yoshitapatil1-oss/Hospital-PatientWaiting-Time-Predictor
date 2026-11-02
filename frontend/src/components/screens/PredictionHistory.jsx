import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { translations } from '../../translations'
import api from '../../services/api'
import {
  History,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Database,
  ArrowRight,
  Sparkles,
  Calendar,
  Eye,
  CheckCircle2,
  Stethoscope,
  Users
} from 'lucide-react'

export default function PredictionHistory() {
  const { language } = useAuth()
  const t = translations[language] || translations.en
  const navigate = useNavigate()

  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('All')

  const loadHistory = async () => {
    setLoading(true)
    try {
      const data = await api.predictions.getHistory(100)
      setHistory(data)
    } catch (err) {
      console.error('Failed to load prediction history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const filteredHistory = history.filter((item) => {
    const matchesDept = selectedDept === 'All' || item.department === selectedDept
    const matchesSearch =
      !searchQuery ||
      item.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id?.toString().includes(searchQuery)
    return matchesDept && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" />
            {t.screenPredictionHistory || 'Prediction History'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Complete chronological audit trail of Random Forest ML predictions recorded in SQLite.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadHistory}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-colors shadow-2xs cursor-pointer"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/prediction')}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-teal-300" />
            <span>{t.predictWaitTime || 'New Prediction'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by patient, doctor, department, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 font-semibold text-slate-700 focus:outline-none"
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

      {/* History Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <span>Loading SQLite records...</span>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600 text-sm">No prediction records found</p>
            <p className="mt-1">Predictions will be recorded here when calculated.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3.5 px-4">Prediction ID</th>
                  <th className="py-3.5 px-4">{t.patient}</th>
                  <th className="py-3.5 px-4">{t.department}</th>
                  <th className="py-3.5 px-4">{t.doctor}</th>
                  <th className="py-3.5 px-4 text-center">{t.patientsAhead}</th>
                  <th className="py-3.5 px-4">{t.predictedWaitTime}</th>
                  <th className="py-3.5 px-4">{t.priority}</th>
                  <th className="py-3.5 px-4">{t.predictionTimestamp}</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      #{item.id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.patient_name || 'Walk-in Patient'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{item.department}</td>
                    <td className="py-3 px-4 text-slate-600">{item.doctor_name || 'On Duty'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-center text-slate-800">
                      {item.patients_ahead}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-extrabold text-blue-700">
                        {item.predicted_waiting_time}
                      </span>{' '}
                      <span className="text-[10px] text-slate-400 font-normal">min</span>
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() =>
                          navigate('/prediction-result', { state: { prediction: item } })
                        }
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="View Detailed Focus Result"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
