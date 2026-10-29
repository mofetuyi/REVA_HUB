import React, { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Bot, User, ArrowRight, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return

    const userText = textToSend.trim()
    const userMsg: ChatMessage = { id: String(Date.now()), role: 'user', content: userText }

    const updatedHistory = [...messages, userMsg]
    setMessages(updatedHistory)
    setInput('')
    setIsLoading(true)

    try {
      // Build history for context
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
    <div className="max-w-3xl mx-auto flex flex-col h-[78vh] bg-white rounded-3xl border border-cream-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cream-100 flex items-center justify-between bg-gradient-to-r from-cream-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#062E12] text-gold-400 flex items-center justify-center shadow-sm border border-gold-500/30 font-bold text-lg">
            🌿
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-base text-dark-900">Revi — Reva Hub AI</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Gemini Powered
              </span>
            </div>
            <p className="text-[11px] text-dark-500">Lagos circular marketplace, material pricing & upcycling guide.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={clearChat}
          className="p-2 text-dark-400 hover:text-dark-700 hover:bg-cream-100 rounded-xl transition-colors text-xs flex items-center gap-1"
          title="Clear Conversation"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

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
            <span>Revi is thinking with Gemini...</span>
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
              className="shrink-0 px-3 py-1 bg-cream-100 hover:bg-gold-50 hover:text-gold-900 text-dark-700 rounded-full text-[11px] font-medium border border-cream-200 transition-colors"
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
          className="bg-[#062E12] hover:bg-[#08421a] text-white rounded-2xl px-5"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}
