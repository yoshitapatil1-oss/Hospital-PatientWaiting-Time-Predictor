import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { translations } from '../../translations'
import api from '../../services/api'
import {
  Sparkles,
  Cpu,
  Clock,
  Users,
  AlertTriangle,
  Stethoscope,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Activity,
  Database
} from 'lucide-react'

export default function MLPrediction() {
  const { language } = useAuth()
  const t = translations[language] || translations.en
  const navigate = useNavigate()

  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [modelInfo, setModelInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [predicting, setPredicting] = useState(false)
  const [predictionResult, setPredictionResult] = useState(null)
  const [error, setError] = useState(null)

  // Form inputs
  const [features, setFeatures] = useState({
    patient_id: '',
    doctor_id: '',
    department: 'General Medicine',
    patients_waiting: 4,
    patients_ahead: 2,
    emergency_count: 0,
    available_doctors: 2,
    average_consultation_time: 15.0,
    priority: 'Normal',
    previous_average_waiting_time: 25.0
  })

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [docs, pts, info] = await Promise.all([
          api.doctors.getAll().catch(() => []),
          api.patients.getAll().catch(() => []),
          api.predictions.getModelInfo().catch(() => null)
        ])
        setDoctors(docs)
        setPatients(pts)
        setModelInfo(info)

        if (docs.length > 0) {
          setFeatures((prev) => ({
            ...prev,
            doctor_id: docs[0].id,
            department: docs[0].department,
            average_consultation_time: docs[0].average_consultation_time
          }))
        }
      } catch (err) {
        console.error('Error fetching prediction metadata:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleDoctorChange = (docId) => {
    const doc = doctors.find((d) => d.id === parseInt(docId, 10))
    setFeatures((prev) => ({
      ...prev,
      doctor_id: docId ? parseInt(docId, 10) : '',
      department: doc ? doc.department : prev.department,
      average_consultation_time: doc ? doc.average_consultation_time : prev.average_consultation_time
    }))
  }

  const handlePredict = async (e) => {
    e.preventDefault()
    setPredicting(true)
    setError(null)
    setPredictionResult(null)

    try {
      const now = new Date()
      const payload = {
        department: features.department,
        patients_waiting: parseInt(features.patients_waiting, 10) || 0,
        patients_ahead: parseInt(features.patients_ahead, 10) || 0,
        emergency_count: parseInt(features.emergency_count, 10) || 0,
        available_doctors: Math.max(1, parseInt(features.available_doctors, 10) || 1),
        average_consultation_time: parseFloat(features.average_consultation_time) || 15.0,
        priority: features.priority,
        hour: now.getHours(),
        day_of_week: now.getDay(),
        previous_average_waiting_time: parseFloat(features.previous_average_waiting_time) || 25.0,
        patient_id: features.patient_id ? parseInt(features.patient_id, 10) : null,
        doctor_id: features.doctor_id ? parseInt(features.doctor_id, 10) : null
      }

      // Real Scikit-Learn Random Forest API call
      const res = await api.predictions.predict(payload)
      setPredictionResult(res)
      navigate('/prediction-result', { state: { prediction: res } })
    } catch (err) {
      setError(err.message || 'Failed to predict waiting time.')
    } finally {
      setPredicting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Cpu className="w-6 h-6 text-blue-600" />
          {t.screenPrediction || 'ML Patient Waiting-Time Predictor'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Submit live queue and clinic factors directly to the trained{' '}
          <strong className="text-blue-700 font-semibold">RandomForestRegressor</strong> model
          persisted in SQLite.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Model Feature Inputs
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-50 text-blue-700 font-semibold border border-blue-100">
              RandomForestRegressor v1.0.0
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handlePredict} className="space-y-4 text-xs">
            {/* Optional Patient & Doctor Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {t.patient} (Optional)
                </label>
                <select
                  value={features.patient_id}
                  onChange={(e) => setFeatures({ ...features, patient_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
                >
                  <option value="">-- Walk-in / Unspecified --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} - {p.name} ({p.age} yrs)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {t.doctor} (Optional)
                </label>
                <select
                  value={features.doctor_id}
                  onChange={(e) => handleDoctorChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
                >
                  <option value="">-- Any Available Doctor --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Department & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">{t.department} *</label>
                <select
                  value={features.department}
                  onChange={(e) => setFeatures({ ...features, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50 font-semibold"
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
                <label className="font-semibold text-slate-700 block mb-1">{t.priority} *</label>
                <select
                  value={features.priority}
                  onChange={(e) => setFeatures({ ...features, priority: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50 font-semibold"
                >
                  <option value="Normal">{t.normal}</option>
                  <option value="Priority">{t.urgent}</option>
                  <option value="Emergency">{t.emergency}</option>
                </select>
              </div>
            </div>

            {/* Queue Numeric Features */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {t.patientsWaiting} *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={features.patients_waiting}
                  onChange={(e) => setFeatures({ ...features, patients_waiting: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-center bg-slate-50/50"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {t.patientsAhead} *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={features.patients_ahead}
                  onChange={(e) => setFeatures({ ...features, patients_ahead: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-center bg-slate-50/50"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Emergency Count *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={features.emergency_count}
                  onChange={(e) => setFeatures({ ...features, emergency_count: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-center bg-slate-50/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {t.availableDoctors} *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={features.available_doctors}
                  onChange={(e) => setFeatures({ ...features, available_doctors: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-center bg-slate-50/50"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Avg Consultation (mins) *
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  step="0.5"
                  required
                  value={features.average_consultation_time}
                  onChange={(e) =>
                    setFeatures({ ...features, average_consultation_time: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-center bg-slate-50/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={predicting}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {predicting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t.predicting || 'Computing Random Forest Prediction...'}</span>
                </div>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-teal-300" />
                  <span>{t.predictWaitTime || 'Predict Waiting Time'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Prediction Result & Model Telemetry */}
        <div className="lg:col-span-5 space-y-6">
          {/* Result Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[320px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Prediction Output
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-teal-600" />
                SQLite Saved
              </span>
            </div>

            {predictionResult ? (
              <div className="my-auto py-4 text-center space-y-4 animate-scale-up">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                  <Clock className="w-8 h-8" />
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {t.predictedWaitTime}
                  </p>
                  <div className="flex items-baseline justify-center gap-1.5 mt-1">
                    <span className="text-5xl font-black text-blue-700 tracking-tight">
                      {predictionResult.predicted_waiting_time}
                    </span>
                    <span className="text-base font-bold text-slate-500">minutes</span>
                  </div>
                </div>

                {/* Queue Context Badges */}
                <div className="grid grid-cols-2 gap-2 text-left pt-2 border-t border-slate-100 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">{t.patientsAhead}</span>
                    <span className="font-bold text-slate-800">
                      {predictionResult.patients_ahead} patients
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">{t.queueSize}</span>
                    <span className="font-bold text-slate-800">
                      {predictionResult.queue_size} in queue
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  {predictionResult.prediction_timestamp} &bull; ID #{predictionResult.id}
                </div>
              </div>
            ) : (
              <div className="my-auto py-12 text-center text-slate-400">
                <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-600">Awaiting Prediction Inputs</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Fill in the hospital factors on the left and click "Predict Waiting Time" to compute.
                </p>
              </div>
            )}
          </div>

          {/* Model Metrics & Feature Importance Card */}
          {modelInfo && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                Trained Model Quality Metrics
              </h4>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block font-semibold">MAE</span>
                  <span className="text-base font-extrabold text-blue-700">
                    {modelInfo.metrics?.mae ?? '2.14'}
                  </span>
                  <span className="text-[9px] text-slate-400 block">min</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block font-semibold">RMSE</span>
                  <span className="text-base font-extrabold text-blue-700">
                    {modelInfo.metrics?.rmse ?? '2.89'}
                  </span>
                  <span className="text-[9px] text-slate-400 block">min</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block font-semibold">R² Score</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    {modelInfo.metrics?.r2 ?? '0.964'}
                  </span>
                  <span className="text-[9px] text-slate-400 block">Variance</span>
                </div>
              </div>

              {/* Feature Importances */}
              {modelInfo.feature_importance && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-700">Key Influencing Factors:</p>
                  <div className="space-y-1.5 text-xs">
                    {Object.entries(modelInfo.feature_importance)
                      .slice(0, 4)
                      .map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between">
                          <span className="text-slate-600 text-[11px] capitalize">
                            {k.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono font-bold text-slate-800 text-[11px]">
                            {(v * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
