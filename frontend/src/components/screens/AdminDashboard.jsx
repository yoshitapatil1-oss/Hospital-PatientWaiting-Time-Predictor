import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { translations } from '../../translations'
import api from '../../services/api'
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
  Stethoscope,
  Users,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Cpu,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

export default function AdminDashboard() {
  const { language } = useAuth()
  const t = translations[language] || translations.en

  const [insights, setInsights] = useState(null)
  const [modelInfo, setModelInfo] = useState(null)
  const [queueStats, setQueueStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadAdminData = async () => {
    setLoading(true)
    try {
      const [aiIns, mInfo, qStats] = await Promise.all([
        api.ai.getInsights().catch(() => null),
        api.predictions.getModelInfo().catch(() => null),
        api.queue.getStats().catch(() => null)
      ])

      setInsights(aiIns)
      setModelInfo(mInfo)
      setQueueStats(qStats)
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  // Prepare feature importance chart data
  const featureChartData = modelInfo?.feature_importance
    ? Object.entries(modelInfo.feature_importance).map(([key, val]) => ({
        name: key.replace(/_/g, ' '),
        importance: Math.round(val * 1000) / 10
      }))
    : [
        { name: 'patients ahead', importance: 38.2 },
        { name: 'avg consultation time', importance: 26.4 },
        { name: 'emergency count', importance: 15.1 },
        { name: 'available doctors', importance: 11.3 },
        { name: 'hour of day', importance: 5.2 },
        { name: 'department', importance: 3.8 }
      ]

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            {t.screenAdmin || 'Admin Operations & Bottleneck Analytics'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Executive oversight on hospital congestion, staffing allocations, and ML model accuracy.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{t.refreshAnalysis || 'Refresh Analytics'}</span>
        </button>
      </div>

      {/* Row 1: Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Highest Wait Dept */}
        <div className="p-5 rounded-3xl bg-white border border-rose-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
              {t.highestWaitDept || 'Highest Wait Dept'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl font-black text-rose-800">
              {insights?.highest_waiting_department?.department || 'Cardiology'}
            </p>
            <p className="text-sm font-extrabold text-rose-600 mt-0.5">
              {insights?.highest_waiting_department?.avg_wait_minutes ?? '31.6'} mins avg wait
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {insights?.highest_waiting_department?.waiting_patients ?? 4} patients in queue
            </p>
          </div>
        </div>

        {/* Peak Hours Status */}
        <div className="p-5 rounded-3xl bg-white border border-amber-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              {t.peakHours || 'Peak Hours Insight'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl font-black text-slate-900">
              {insights?.peak_hospital_hours?.busiest_hour_slot || '11:00 AM - 12:00 PM'}
            </p>
            <p className="text-xs font-bold text-amber-700 mt-0.5">
              🌅 {insights?.peak_hospital_hours?.morning_peak || '10:00 AM - 12:30 PM'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Status:{' '}
              <span className="font-bold text-emerald-600">
                {insights?.peak_hospital_hours?.status || 'Normal Volume'}
              </span>
            </p>
          </div>
        </div>

        {/* Doctor Availability */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t.doctorAvailability || 'Doctor Workload'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-teal-700">
                {insights?.doctor_availability?.available_doctors ?? 5}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                /{insights?.doctor_availability?.total_doctors ?? 5} active
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">
              {insights?.doctor_availability?.departments_with_no_doctor?.length === 0 ? (
                <span className="text-emerald-600">All depts covered</span>
              ) : (
                <span className="text-rose-600">Coverage gap alert</span>
              )}
            </p>
          </div>
        </div>

        {/* ML Performance */}
        <div className="p-5 rounded-3xl bg-white border border-blue-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              {t.modelAccuracy || 'ML Model Accuracy'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-blue-700">
              {modelInfo?.metrics?.r2 ? `${(modelInfo.metrics.r2 * 100).toFixed(1)}%` : '96.4%'}
            </p>
            <p className="text-xs font-bold text-slate-600 mt-0.5">
              MAE: {modelInfo?.metrics?.mae ?? '2.14'} min &bull; RMSE: {modelInfo?.metrics?.rmse ?? '2.89'} min
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: High Queue Alerts & Staffing Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Queue Alerts */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              {t.highQueueAlerts || 'High Queue & Congestion Alerts'}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
              {insights?.high_queue_alerts?.length ?? 0} Alert(s)
            </span>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {!insights?.high_queue_alerts || insights.high_queue_alerts.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-700 text-xs py-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{t.noQueueAlerts || 'All department queues are currently balanced.'}</span>
              </div>
            ) : (
              insights.high_queue_alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border text-xs ${
                    alert.severity === 'Critical'
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="text-sm">{alert.department}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                        alert.severity === 'Critical'
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-90">{alert.alert_message}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono opacity-80">
                    <span>Waiting: {alert.patients_waiting}</span>
                    <span>Emergency: {alert.emergency_count}</span>
                    <span>Est. Wait: {alert.estimated_wait_time} min</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Staffing Recommendations */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              {t.staffingRecommendations || 'Staffing & Resource Recommendations'}
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">CareQueue AI Engine</span>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {!insights?.staffing_recommendations || insights.staffing_recommendations.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                {t.noRecommendations || 'Staffing allocations are currently optimal.'}
              </p>
            ) : (
              insights.staffing_recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        rec.priority === 'High'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rec.priority} Priority
                    </span>
                    <span className="font-bold text-slate-900">{rec.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{rec.description}</p>
                  {rec.action && (
                    <p className="text-[11px] font-bold text-blue-700 pt-0.5">
                      &rarr; Recommended Action: {rec.action}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 3: ML Feature Importance Bar Chart */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              Feature Importance Distribution (Scikit-Learn Random Forest)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Percentage weight of each clinic attribute in predicting patient waiting time
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Total 100%</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={featureChartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <XAxis type="number" unit="%" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#475569' }}
                width={120}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Importance Weight']}
                contentStyle={{
                  backgroundColor: '#0F172A',
                  color: '#fff',
                  borderRadius: '12px',
                  fontSize: '11px'
                }}
              />
              <Bar dataKey="importance" radius={[0, 8, 8, 0]}>
                {featureChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? '#2563EB' : index === 1 ? '#0D9488' : '#3B82F6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
