import React, { useState } from 'react'
import { Sparkles, Send, Bot, User, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am Reva Hub Assistant. Ask me how to identify, price, or transform recovered materials in Lagos (plastics, fabric scraps, wood, sawdust, cardboard), or ask about DIY tutorials on Reva Hub Learn.',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userText = input.trim()
    const userMsg: ChatMessage = { id: String(Date.now()), role: 'user', content: userText }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await api.post('/gemini/chat', { prompt: userText })
      const botMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: res.data?.response || res.data?.message || 'I could not process that request.',
      }
      setMessages((prev) => [...prev, botMsg])
    } catch (err) {
      toast.error(extractError(err))
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: 'Notice: Gemini AI is currently operating in offline/fallback mode. Please check GEMINI_API_KEY.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[75vh] bg-white rounded-3xl border border-cream-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cream-100 flex items-center justify-between bg-cream-50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gold-100 text-gold-700 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base text-dark-900">Reva Hub Material & Upcycling Assistant</h1>
            <p className="text-[11px] text-dark-500">AI-powered circular economy guidance for Lagos trades.</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="p-1.5 rounded-lg bg-gold-100 text-gold-800 shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-dark-900 text-cream-50 rounded-br-none'
                  : 'bg-cream-100 text-dark-900 rounded-bl-none border border-cream-200'
              }`}
            >
              {m.content}
            </div>
            {m.role === 'user' && (
              <div className="p-1.5 rounded-lg bg-dark-200 text-dark-700 shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-dark-400 p-2">
            <Bot className="w-4 h-4 animate-spin text-gold-600" />
            <span>Consulting circular materials knowledge base...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-cream-100 bg-cream-50 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about materials, HDPE vs PET, scrap pricing in Lagos, or DIY ideas..."
          className="flex-1 text-xs border border-cream-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500"
        />
        <Button type="submit" size="sm" disabled={!input.trim() || isLoading}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}
