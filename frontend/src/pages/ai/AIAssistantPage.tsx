import React, { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, User, RefreshCw, Crown, Lock, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  '🌱 How do I sell recovered plastics or materials?',
  '🛡️ How does Paystack Escrow protect buyers and sellers?',
  '💼 How do I switch between Buyer and Seller mode?',
  '🚚 How are Lagos delivery fees calculated across LGAs?',
  '💡 Suggest a beginner upcycling project with fabric scraps',
]

export default function AIAssistantPage() {
  const { user, isAuthenticated, activatePremium } = useAuthStore()
  const [activating, setActivating] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm **Revi**, Reva Hub's circular economy and marketplace assistant in Lagos, Nigeria. 🌿\n\nAsk me how to identify, price, or transform recovered materials (plastics, fabric scraps, wood, sawdust, metals), or ask how Paystack Escrow, automated bank payouts, and Lagos 3PL delivery work!",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isPremium = Boolean(user?.is_premium || user?.is_admin)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isPremium) {
      scrollToBottom()
    }
  }, [messages, isLoading, isPremium])

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return

    if (!isPremium) {
      toast.error('Revi AI is reserved for Reva Premium members.')
      return
    }

    const userText = textToSend.trim()
    const userMsg: ChatMessage = { id: String(Date.now()), role: 'user', content: userText }

    const updatedHistory = [...messages, userMsg]
    setMessages(updatedHistory)
    setInput('')
    setIsLoading(true)

    try {
      const historyPayload = updatedHistory.slice(-6).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.content,
      }))

      const res = await api.post('/ai/chat', {
        message: userText,
        prompt: userText,
        history: historyPayload,
      })

      const botText = res.data?.response || res.data?.message || 'I am ready to help with your circular trade questions.'
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: botText,
        },
      ])
    } catch (err) {
      toast.error(extractError(err))
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content:
            "I'm momentarily busy connecting to the circular database. You can browse active materials, check your order escrow status, or ask another question in a moment!",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivatePremium = async () => {
    setActivating(true)
    try {
      await api.post('/auth/premium/activate-month')
      activatePremium(30)
      toast.success('👑 Welcome to Reva Premium! Revi AI is now unlocked.')
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setActivating(false)
    }
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: "Chat reset. I'm **Revi**, your circular assistant! How can I help you today? 🌿",
      },
    ])
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[80vh] bg-white rounded-3xl border border-cream-200 shadow-sm overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-cream-100 flex items-center justify-between bg-gradient-to-r from-cream-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#062E12] text-gold-400 flex items-center justify-center shadow-sm border border-gold-500/30 font-bold text-lg">
            🌿
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-base text-dark-900">Revi — Reva Hub AI</h1>
              {isPremium ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold-400/20 text-gold-800 border border-gold-400/40 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-gold-600" />
                  Premium Active
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-700" />
                  Premium Only
                </span>
              )}
            </div>
            <p className="text-[11px] text-dark-500">Lagos circular marketplace, material pricing & upcycling guide.</p>
          </div>
        </div>

        {isPremium && (
          <button
            type="button"
            onClick={clearChat}
            className="p-2 text-dark-400 hover:text-dark-700 hover:bg-cream-100 rounded-xl transition-colors text-xs flex items-center gap-1 cursor-pointer"
            title="Clear Conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>

      {/* Premium Gate if not Premium */}
      {!isPremium ? (
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#FAF8F5] to-white">
          <div className="w-20 h-20 rounded-3xl bg-gold-50 border border-gold-200 flex items-center justify-center text-4xl mb-4 shadow-sm">
            👑
          </div>
          <h2 className="text-2xl font-display font-bold text-dark-900 mb-2">
            Revi AI Chatbot is for Premium Users Only
          </h2>
          <p className="text-sm text-dark-600 max-w-md leading-relaxed mb-6">
            Get 24/7 personalized circular economy intelligence, real-time material market price suggestions, and priority match assistance for all your buying and selling across Lagos.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full mb-8 text-left text-xs">
            <div className="p-3 bg-white rounded-xl border border-cream-200 flex items-start gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span>Real-time Lagos scrap, plastic, and biomass price intelligence</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-cream-200 flex items-start gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span>Instant material identification & upcycling transformation guides</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-cream-200 flex items-start gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span>Verified Seller Badge & priority listing rankings</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-cream-200 flex items-start gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span>Automated Paystack Escrow & door-to-door courier quotes</span>
            </div>
          </div>

          {!isAuthenticated ? (
            <Link
              to="/login"
              state={{ from: '/ai' }}
              className="py-3 px-8 bg-[#062E12] hover:bg-[#08421a] text-white font-bold rounded-xl shadow transition-colors text-sm flex items-center gap-2"
            >
              Sign In to Unlock Premium
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleActivatePremium}
              disabled={activating}
              className="py-3.5 px-8 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 font-black rounded-xl shadow-md transition-all active:scale-[0.98] text-sm cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-dark-900" />
              {activating ? 'Activating Premium...' : 'Activate Reva Premium (Instant Access)'}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#FAF8F5]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-[#062E12] text-gold-400 shrink-0 mt-0.5 flex items-center justify-center text-xs font-bold shadow-sm">
                    🌿
                  </div>
                )}
                <div
                  className={`max-w-lg p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#062E12] text-white rounded-br-none shadow-sm'
                      : 'bg-white text-dark-900 rounded-bl-none border border-cream-200 shadow-sm'
                  }`}
                >
                  {m.content}
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-gold-400 text-dark-900 shrink-0 mt-0.5 flex items-center justify-center text-xs font-bold shadow-sm">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-dark-500 p-2 bg-white/70 rounded-xl max-w-xs border border-cream-200 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-gold-500 animate-ping" />
                <span>Revi is thinking with Gemini 3.5...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts */}
          {messages.length <= 3 && !isLoading && (
            <div className="px-4 py-2 bg-white border-t border-cream-100 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
              <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wide shrink-0">Try asking:</span>
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(p)}
                  className="shrink-0 px-3 py-1 bg-cream-100 hover:bg-gold-50 hover:text-gold-900 text-dark-700 rounded-full text-[11px] font-medium border border-cream-200 transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 border-t border-cream-200 bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Revi about materials, selling, escrow, Lagos delivery or upcycling..."
              className="flex-1 text-xs sm:text-sm border border-cream-300 rounded-2xl px-4 py-3 bg-cream-50/50 focus:outline-none focus:ring-2 focus:ring-[#062E12] text-dark-900 placeholder:text-dark-400"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-[#062E12] hover:bg-[#08421a] text-white rounded-2xl px-5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </>
      )}
    </div>
  )
}
