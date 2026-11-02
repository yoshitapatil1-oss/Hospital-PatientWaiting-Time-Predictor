import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { translations } from '../../translations'
import api from '../../services/api'
import {
  FileText,
  Clock,
  Filter,
  Download,
  Search,
  Database,
  BarChart3,
  Calendar,
  Sparkles,
  RefreshCw
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts'

export default function PredictionReports() {
  const { language } = useAuth()
  const t = translations[language] || translations.en

  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDept, setSelectedDept] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const loadHistoryData = async () => {
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
    loadHistoryData()
  }, [])

  // Filter history
  const filteredHistory = history.filter((item) => {
    const matchesDept = selectedDept === 'All' || item.department === selectedDept
    const matchesSearch =
      !searchQuery ||
      item.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.department?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesDept && matchesSearch
  })

  // Chart 1: Recent Admissions Wait-Time Trend
  const trendChartData = filteredHistory
    .slice(0, 15)
    .reverse()
    .map((item, idx) => ({
      index: `#${item.id}`,
      predicted: item.predicted_waiting_time,
      department: item.department
    }))

  // Chart 2: Average Wait Time by Department
  const deptAverages = {}
  history.forEach((h) => {
    if (!deptAverages[h.department]) {
      deptAverages[h.department] = { total: 0, count: 0 }
    }
    deptAverages[h.department].total += h.predicted_waiting_time
    deptAverages[h.department].count += 1
  })

  const deptComparisonData = Object.entries(deptAverages).map(([dept, val]) => ({
    department: dept,
    avgWait: Math.round((val.total / val.count) * 10) / 10
  }))

  const handleExportCSV = () => {
    if (filteredHistory.length === 0) return
    const headers = [
      'ID',
      'Patient Name',
      'Department',
      'Doctor Name',
      'Patients Ahead',
      'Predicted Wait Time (mins)',
      'Priority',
      'Created At'
    ]
    const rows = filteredHistory.map((item) => [
      item.id,
      `"${item.patient_name || 'Walk-in'}"`,
      `"${item.department}"`,
      `"${item.doctor_name || 'On Duty'}"`,
      item.patients_ahead,
      item.predicted_waiting_time,
      item.priority,
      item.created_at
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `carequeue_prediction_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            {t.screenReports || 'Prediction Reports & Analytics'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Audit log of trained Random Forest predictions saved directly into SQLite.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadHistoryData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-colors shadow-2xs cursor-pointer"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredHistory.length === 0}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Row 1: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Trend over Admissions */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                {t.queueTrend || 'Wait-Time Trend over Recent Admissions'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated by Random Forest Regressor (minutes)
              </p>
            </div>
          </div>

          <div className="h-60 w-full">
            {trendChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No admission data recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="index" tick={{ fontSize: 10 }} />
                  <YAxis unit="m" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      color: '#fff',
                      borderRadius: '12px',
                      fontSize: '11px'
                    }}
                    formatter={(val) => [`${val} mins`, 'Predicted Wait']}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#2563EB"
                    strokeWidth={3}
                    dot={{ fill: '#0D9488', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Department Comparison */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                {t.deptWaitComparison || 'Department Average Wait-Time Comparison'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Aggregate average waiting time in minutes
              </p>
            </div>
          </div>

          <div className="h-60 w-full">
            {deptComparisonData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No department records available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="department" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis unit="m" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      color: '#fff',
                      borderRadius: '12px',
                      fontSize: '11px'
                    }}
                    formatter={(val) => [`${val} mins`, 'Avg Wait']}
                  />
                  <Bar dataKey="avgWait" fill="#0D9488" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Search, Filters & History Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              SQLite Prediction History ({filteredHistory.length} records)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological log of machine learning inferences
            </p>
          </div>

          {/* Search & Dept Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:outline-none"
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

        {/* Table */}
        {filteredHistory.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            {t.noHistory || 'No prediction history recorded in SQLite yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-3">ID</th>
                  <th className="py-3 px-3">{t.patient}</th>
                  <th className="py-3 px-3">{t.department}</th>
                  <th className="py-3 px-3">{t.doctor}</th>
                  <th className="py-3 px-3 text-center">{t.patientsAhead}</th>
                  <th className="py-3 px-3">{t.predictedWaitTime}</th>
                  <th className="py-3 px-3">{t.priority}</th>
                  <th className="py-3 px-3">{t.predictionTimestamp}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-blue-600">#{item.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {item.patient_name || 'Walk-in Patient'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{item.department}</td>
                    <td className="py-3 px-3 text-slate-600">{item.doctor_name || 'On Duty'}</td>
                    <td className="py-3 px-3 font-mono font-bold text-center text-slate-800">
                      {item.patients_ahead}
                    </td>
                    <td className="py-3 px-3 font-black text-blue-700">
                      {item.predicted_waiting_time}{' '}
                      <span className="text-[10px] font-normal text-slate-400">min</span>
                    </td>
                    <td className="py-3 px-3">
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
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}
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
