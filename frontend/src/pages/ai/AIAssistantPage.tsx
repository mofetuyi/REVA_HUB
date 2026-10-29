import React, { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, User, RefreshCw, Crown, Lock, ArrowRight, Image as ImageIcon, X, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
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
        "Hello! I'm **Revi**, Reva Hub's circular economy and marketplace assistant in Lagos, Nigeria. 🌿\n\nAsk me how to identify, price, or transform recovered materials (plastics, fabric scraps, wood, sawdust, metals, agro-waste), or ask how Paystack Escrow, automated bank payouts, and Lagos 3PL delivery work!\n\n💡 *Tip: Premium members can also upload photos of waste materials for instant visual identification and price estimation!*",
    },
  ])
  const [input, setInput] = useState('')
  const [selectedImage, setSelectedImage] = useState<{ dataUrl: string; mimeType: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isPremium = Boolean(user?.is_premium || user?.is_admin)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, selectedImage])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!isPremium) {
      toast.error('Only Premium accounts can upload images and chat with Revi AI.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image must be under 8MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage({
        dataUrl: reader.result as string,
        mimeType: file.type || 'image/jpeg',
      })
      toast.success('Image attached! Send a message or ask Revi to analyze it.')
    }
    reader.readAsDataURL(file)
  }

  const removeSelectedImage = () => {
    setSelectedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const sendMessage = async (textToSend?: string) => {
    if (!isPremium) {
      toast.error('Free accounts are restricted from sending messages. Upgrade to Premium to chat with Revi!')
      return
    }

    const userText = (textToSend || input).trim()
    if ((!userText && !selectedImage) || isLoading) return

    const imageToSend = selectedImage
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: userText || (imageToSend ? 'Please analyze this material image.' : ''),
      imageUrl: imageToSend?.dataUrl,
    }

    const updatedHistory = [...messages, userMsg]
    setMessages(updatedHistory)
    setInput('')
    setSelectedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setIsLoading(true)

    try {
      const historyPayload = updatedHistory.slice(-6).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.content,
      }))

      const res = await api.post('/ai/chat', {
        message: userText || 'Please analyze this material image.',
        prompt: userText || 'Please analyze this material image.',
        history: historyPayload,
        image_data: imageToSend?.dataUrl,
        image_mime_type: imageToSend?.mimeType,
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
            "I couldn't process that request right now. Premium members can ask any circular question or upload another photo!",
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
    sendMessage()
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
    <div className="max-w-4xl mx-auto flex flex-col h-[82vh] bg-white rounded-3xl border border-cream-200 shadow-sm overflow-hidden animate-fade-in">
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
                  Premium Required to Chat
                </span>
              )}
            </div>
            <p className="text-[11px] text-dark-500">Lagos circular marketplace, material vision analysis, pricing & upcycling guide.</p>
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

      {/* Messages Feed (Visible to all users) */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#FAF8F5]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-[#062E12] text-gold-400 shrink-0 mt-0.5 flex items-center justify-center text-xs font-bold shadow-sm">
                🌿
              </div>
            )}
            <div
              className={`max-w-xl p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[#062E12] text-white rounded-br-none shadow-sm'
                  : 'bg-white text-dark-900 rounded-bl-none border border-cream-200 shadow-sm'
              }`}
            >
              {/* Display uploaded image thumbnail if user attached one */}
              {m.imageUrl && (
                <div className="mb-3 rounded-xl overflow-hidden border border-white/20 bg-dark-900/30 max-w-sm">
                  <img src={m.imageUrl} alt="Attached material" className="w-full max-h-56 object-cover" />
                </div>
              )}
              {m.content}
            </div>
            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-gold-400 text-dark-900 shrink-0 mt-0.5 flex items-center justify-center text-xs font-bold shadow-sm">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2.5 text-xs text-dark-500 p-3 bg-white/80 rounded-2xl max-w-xs border border-cream-200 shadow-xs animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-gold-500 animate-ping" />
            <span className="font-medium">Revi is analyzing with Gemini...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length <= 4 && !isLoading && (
        <div className="px-4 py-2 bg-white border-t border-cream-100 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
          <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wide shrink-0">Try asking:</span>
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (!isPremium) {
                  toast.error('👑 Upgrade to Premium to send messages to Revi AI!')
                } else {
                  sendMessage(p)
                }
              }}
              className="shrink-0 px-3 py-1 bg-cream-100 hover:bg-gold-50 hover:text-gold-900 text-dark-700 rounded-full text-[11px] font-medium border border-cream-200 transition-colors cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Attached Image Preview above input */}
      {selectedImage && (
        <div className="px-4 py-2.5 bg-gold-50/90 border-t border-gold-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={selectedImage.dataUrl}
              alt="Thumbnail"
              className="w-10 h-10 rounded-xl object-cover border border-gold-400 shadow-xs"
            />
            <div>
              <p className="text-xs font-bold text-gold-950">Photo attached for Revi AI analysis</p>
              <p className="text-[11px] text-gold-800">Ask Revi to inspect material purity, quality grade, or pricing</p>
            </div>
          </div>
          <button
            type="button"
            onClick={removeSelectedImage}
            className="p-1.5 text-gold-800 hover:text-red-600 rounded-full hover:bg-gold-100 transition-colors cursor-pointer"
            title="Remove attached photo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Form or Free Account Restricted Notice */}
      {!isPremium ? (
        <div className="p-4 bg-gradient-to-r from-cream-100 via-gold-50/50 to-cream-50 border-t border-cream-200 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-dark-900">Free Account: Chatbot is for Premium Users Only</p>
                <p className="text-[11px] text-dark-500">
                  Only premium accounts can send messages and upload waste material photos to Revi.
                </p>
              </div>
            </div>
            {!isAuthenticated ? (
              <Link
                to="/login"
                state={{ from: '/ai' }}
                className="py-2.5 px-5 bg-[#062E12] hover:bg-[#08421a] text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-2"
              >
                Sign In to Unlock Premium
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleActivatePremium}
                disabled={activating}
                className="py-2.5 px-5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 text-xs font-black rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <Crown className="w-4 h-4 text-dark-900" />
                {activating ? 'Activating Premium...' : '👑 Upgrade to Premium to Chat'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSend} className="p-3 border-t border-cream-200 bg-white flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleImageSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-dark-500 hover:text-[#062E12] hover:bg-cream-100 rounded-2xl transition-colors cursor-pointer border border-cream-200"
            title="Upload photo of material for Revi to analyze"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedImage
                ? 'Ask Revi about this material photo...'
                : 'Ask Revi about scrap prices, plastic grades, Lagos logistics, or Paystack escrow...'
            }
            className="flex-1 text-xs sm:text-sm border border-cream-300 rounded-2xl px-4 py-3 bg-cream-50/50 focus:outline-none focus:ring-2 focus:ring-[#062E12] text-dark-900 placeholder:text-dark-400"
          />
          <Button
            type="submit"
            disabled={(!input.trim() && !selectedImage) || isLoading}
            className="bg-[#062E12] hover:bg-[#08421a] text-white rounded-2xl px-5 py-3 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      )}
    </div>
  )
}
