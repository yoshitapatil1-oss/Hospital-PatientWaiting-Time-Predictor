import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { translations } from '../../translations'
import api from '../../services/api'
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  Radio,
  Clock,
  MapPin,
  HelpCircle,
  ArrowRight,
  User,
  RefreshCw
} from 'lucide-react'

export default function AIAssistant() {
  const { user, language } = useAuth()
  const t = translations[language] || translations.en

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text:
        language === 'mr'
          ? 'नमस्कार! मी केअरक्यू एआय रुग्णालय साहाय्यक आहे. मी थेट SQLite डेटाबेस आणि रँडम फॉरेस्ट ML मॉडेलचा वापर करून तुमच्या प्रतीक्षा वेळेच्या, रांगेच्या आणि डॉक्टरांच्या प्रश्नांची अचूक उत्तरे देतो. मी तुम्हाला कशी मदत करू?'
          : language === 'hi'
          ? 'नमस्ते! मैं केयरक्यू एआई अस्पताल सहायक हूँ। मैं लाइव SQLite डेटाबेस और रैंडम फ़ॉरेस्ट ML मॉडल के आधार पर आपकी प्रतीक्षा समय, कतार और डॉक्टरों से जुड़े सवालों के सटीक उत्तर देता हूँ। मैं आपकी क्या मदद कर सकता हूँ?'
          : 'Hello! I am the CareQueue AI Hospital Assistant. I provide real-time, grounded answers about waiting times, current queues, doctor availability, and hospital navigation directly from our SQLite database and Random Forest ML model. How may I assist you today?',
      ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [prompts, setPrompts] = useState([])
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  // Load starter prompts
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const data = await api.ai.getPrompts(language)
        if (data && data.prompts) {
          setPrompts(data.prompts)
        }
      } catch (err) {
        console.error('Failed to load starter prompts:', err)
      }
    }
    fetchPrompts()
  }, [language])

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input).trim()
    if (!query || loading) return

    const userMsg = {
      role: 'user',
      text: query,
      ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await api.ai.chat(query, language)
      const assistantMsg = {
        role: 'assistant',
        text: res.response,
        intent: res.detected_intent,
        context: res.context_data,
        suggested: res.suggested_questions,
        ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Error connecting to AI service: ${err.message}`,
          ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-600" />
            {t.screenAIAssistant || 'CareQueue AI Hospital Assistant'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Multilingual assistant providing strictly grounded answers from SQLite and Random Forest ML.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Zero Hallucination &bull; SQLite Grounded</span>
        </div>
      </div>

      {/* Chat Window Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-[650px] overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 px-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">CareQueue AI Medical Desk</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 font-medium">
                  Active &bull; English / मराठी / हिंदी
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setMessages([
                {
                  role: 'assistant',
                  text: 'Chat history cleared. How can I assist you?',
                  ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ])
            }}
            className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
          >
            Clear Chat
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed space-y-1.5 shadow-2xs ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs font-medium'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs'
                }`}
              >
                {msg.role === 'assistant' ? (
                  msg.text.split('\n').map((line, idx) => (
                    <p
                      key={idx}
                      className={line.startsWith('**') ? 'font-semibold' : ''}
                      dangerouslySetInnerHTML={{
                        __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      }}
                    />
                  ))
                ) : (
                  <p>{msg.text}</p>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  {msg.intent && (
                    <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 font-mono text-[9px] font-bold uppercase">
                      Intent: {msg.intent}
                    </span>
                  )}
                  <span className="text-[10px] opacity-60 ml-auto">{msg.ts}</span>
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  {user?.name ? user.name.charAt(0) : 'U'}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs p-4 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Starter Prompts Carousel */}
        {prompts.length > 0 && messages.length < 5 && (
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {t.suggestedQueries || 'Suggested Prompts'}
            </p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {prompts.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  disabled={loading}
                  className="px-3 py-1 rounded-full bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold whitespace-nowrap transition-colors shadow-2xs cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                t.askAiPlaceholder ||
                'Ask about waiting times, live queues, doctors, or hospital navigation...'
              }
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-xs bg-slate-50/70"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-2xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
