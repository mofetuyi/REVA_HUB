import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Sparkles, RefreshCw, ChevronDown, Minimize2 } from 'lucide-react'
import { api } from '../../lib/api'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  '🌱 How do I sell recovered plastics?',
  '🛡️ How does Paystack escrow work?',
  '💼 Switch between Buyer & Seller mode?',
  '🚚 Check Lagos delivery fees',
]

export default function ReviChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'revi-welcome',
      role: 'assistant',
      content:
        "Hi! I'm **Revi**, your circular economy AI assistant. 🌿\n\nAsk me about buying or selling recovered materials, Lagos courier delivery, or safe Paystack escrow!",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isLoading, isOpen])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = { id: String(Date.now()), role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setIsLoading(true)

    try {
      const historyPayload = updated.slice(-6).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.content,
      }))

      const res = await api.post('/ai/chat', {
        message: text,
        prompt: text,
        history: historyPayload,
      })

      const botText = res.data?.response || res.data?.message || 'Ready to assist with your circular trades.'
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: botText,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content:
            "I'm momentarily busy connecting to the circular database. You can explore our circular products hub or ask another question in a moment!",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const resetChat = () => {
    setMessages([
      {
        id: 'revi-reset',
        role: 'assistant',
        content: "Chat cleared! How can I help you today with Reva Hub? 🌿",
      },
    ])
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-[#062E12] hover:bg-[#08421a] text-white rounded-full shadow-2xl border-2 border-gold-400 hover:scale-105 active:scale-95 transition-all duration-200 group"
          aria-label="Chat with Revi AI"
        >
          <div className="relative">
            <span className="text-xl">🌿</span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border border-dark-900 animate-pulse" />
          </div>
          <div className="text-left">
            <span className="block text-xs font-black tracking-wide text-white group-hover:text-gold-300">
              Chat with Revi
            </span>
            <span className="block text-[10px] text-gold-300/80 font-medium leading-none">
              Inbuilt AI Assistant
            </span>
          </div>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="w-[90vw] sm:w-[380px] h-[520px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-cream-300 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-[#062E12] text-white p-3.5 px-4 flex items-center justify-between border-b border-gold-500/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-dark-900/40 border border-gold-400 flex items-center justify-center text-sm">
                🌿
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display font-bold text-sm text-white">Revi AI</h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-green-500/20 text-green-300 border border-green-500/40">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-gold-200/90">Lagos Circular Economy Guide</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetChat}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Reset Conversation"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Close Revi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#FAF8F5] text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-[#062E12] text-gold-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                    🌿
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[82%] leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#062E12] text-white rounded-br-none shadow-sm'
                      : 'bg-white text-dark-900 rounded-bl-none border border-cream-200 shadow-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-cream-200 max-w-[200px] text-[11px] text-dark-500">
                <span className="w-2 h-2 rounded-full bg-gold-500 animate-ping" />
                <span>Revi is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 3 && !isLoading && (
            <div className="px-3 py-2 bg-cream-50/80 border-t border-cream-200 flex gap-1.5 overflow-x-auto no-scrollbar">
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(p)}
                  className="shrink-0 text-[10px] font-medium px-2.5 py-1 bg-white hover:bg-gold-50 text-dark-700 hover:text-gold-900 rounded-full border border-cream-200 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="p-2.5 bg-white border-t border-cream-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Revi anything about Reva..."
              className="flex-1 text-xs border border-cream-300 rounded-xl px-3 py-2 bg-cream-50/60 focus:outline-none focus:ring-2 focus:ring-[#062E12] text-dark-900"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-[#062E12] hover:bg-[#08421a] disabled:opacity-40 text-white rounded-xl transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
