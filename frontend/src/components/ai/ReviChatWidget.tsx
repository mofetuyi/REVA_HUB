import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Sparkles, RefreshCw, Crown, Lock, Image as ImageIcon, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { useAuthStore, isUserPremium } from '../../store/authStore'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
}

const QUICK_PROMPTS = [
  '🌱 How do I sell recovered plastics?',
  '🛡️ How does Paystack escrow work?',
  '💼 Switch between Buyer & Seller mode?',
  '🚚 Check Lagos delivery fees',
]

export default function ReviChatWidget() {
  const { user, isAuthenticated } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'revi-welcome',
      role: 'assistant',
      content:
        "Hi! I'm **Revi**, your circular economy AI assistant. 🌿\n\nAsk me about buying or selling recovered materials, Lagos courier delivery, or safe Paystack escrow!\n\n💡 *Tip: Reva Premium members can also upload photos of materials for instant visual identification and price estimation!*",
    },
  ])
  const [input, setInput] = useState('')
  const [selectedImage, setSelectedImage] = useState<{ dataUrl: string; mimeType: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Strictly check active premium subscription. Free accounts (including non-subscribed admins) cannot chat.
  const isPremium = isUserPremium(user)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isLoading, isOpen, selectedImage])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!isPremium) {
      toast.error('Free accounts cannot use Revi the chatbot. Upgrade to Premium to upload photos and chat!')
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

  const handleSend = async (textToSend?: string) => {
    if (!isPremium) {
      toast.error('Free accounts cannot use Revi the chatbot. Please subscribe to Premium!')
      return
    }

    const text = (textToSend || input).trim()
    if ((!text && !selectedImage) || isLoading) return

    const imageToSend = selectedImage
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: text || (imageToSend ? 'Please analyze this material image.' : ''),
      imageUrl: imageToSend?.dataUrl,
    }

    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setSelectedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setIsLoading(true)

    try {
      const historyPayload = updated.slice(-6).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.content,
      }))

      const res = await api.post('/ai/chat', {
        message: text || 'Please analyze this material image.',
        prompt: text || 'Please analyze this material image.',
        history: historyPayload,
        image_data: imageToSend?.dataUrl,
        image_mime_type: imageToSend?.mimeType,
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
    } catch (err) {
      const errorMsg = extractError(err)
      toast.error(errorMsg)
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
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 bg-[#062E12] hover:bg-[#08421a] text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 border border-gold-500/40 cursor-pointer active:scale-95"
          aria-label="Open Revi AI Chat"
        >
          <div className="relative">
            <span className="text-xl">🌿</span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gold-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gold-400 rounded-full" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold flex items-center gap-1 text-gold-300">
              Ask Revi AI
              {isPremium ? (
                <Crown className="w-3 h-3 text-gold-400 fill-gold-400" />
              ) : (
                <Lock className="w-3 h-3 text-amber-300" />
              )}
            </div>
            <div className="text-[10px] text-cream-200">
              {isPremium ? 'Circular Assistant Active' : 'Premium Only'}
            </div>
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[550px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-cream-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-[#062E12] text-white p-4 flex items-center justify-between border-b border-gold-500/30">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-lg">
                🌿
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display font-bold text-sm text-white">Revi</h3>
                  <span className="text-[10px] bg-gold-500/20 text-gold-300 px-1.5 py-0.5 rounded-full border border-gold-400/40 font-semibold">
                    AI
                  </span>
                  {isPremium ? (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-400/40 font-semibold flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5 text-gold-400 fill-gold-400" />
                      Premium
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-400/40 font-semibold flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5 text-amber-300" />
                      Locked
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-cream-200">
                  {isPremium ? 'Circular Economy & Vision Guide' : 'Free Account — Chatbot Locked'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isPremium && (
                <button
                  type="button"
                  onClick={resetChat}
                  className="p-1.5 text-cream-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Reset conversation"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-cream-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conversation Feed */}
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
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#062E12] text-white rounded-br-none shadow-sm'
                      : 'bg-white text-dark-900 rounded-bl-none border border-cream-200 shadow-sm'
                  }`}
                >
                  {/* Display uploaded image thumbnail if user attached one */}
                  {m.imageUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-white/20 bg-dark-900/30">
                      <img src={m.imageUrl} alt="Uploaded material" className="w-full max-h-48 object-cover" />
                    </div>
                  )}
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-cream-200 max-w-[220px] text-[11px] text-dark-500">
                <span className="w-2 h-2 rounded-full bg-gold-500 animate-ping" />
                <span>Revi is analyzing with Gemini...</span>
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
                  onClick={() => {
                    if (!isPremium) {
                      toast.error('Free accounts cannot use Revi. Upgrade to Premium to chat!')
                    } else {
                      handleSend(p)
                    }
                  }}
                  className="shrink-0 text-[10px] font-medium px-2.5 py-1 bg-white hover:bg-gold-50 text-dark-700 hover:text-gold-900 rounded-full border border-cream-200 transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Attached Image Preview above input */}
          {selectedImage && (
            <div className="px-3 py-2 bg-gold-50/80 border-t border-gold-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={selectedImage.dataUrl}
                  alt="Thumbnail"
                  className="w-8 h-8 rounded-lg object-cover border border-gold-400"
                />
                <span className="text-[11px] font-semibold text-gold-950">Image attached for Revi analysis</span>
              </div>
              <button
                type="button"
                onClick={removeSelectedImage}
                className="p-1 text-gold-800 hover:text-red-600 rounded-full cursor-pointer"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Free Account Locked Bar OR Active Premium Input */}
          {!isPremium ? (
            <div className="p-3 bg-gradient-to-r from-cream-100 to-cream-50 border-t border-cream-200 space-y-2">
              <div className="flex items-center justify-between text-xs text-dark-700">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-bold text-dark-900">Free Account — Chatbot Locked</span>
                </div>
                <span className="text-[10px] text-amber-800 bg-amber-100 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                  Premium Required
                </span>
              </div>
              <p className="text-[11px] text-dark-600 leading-snug">
                Free accounts cannot use Revi the chatbot. Subscribe to Reva Premium to chat with Revi and upload material photos for instant valuation.
              </p>
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2.5 px-3 bg-[#062E12] hover:bg-[#08421a] text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Sign In to Access Premium
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Link
                  to="/premium"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 text-xs font-black rounded-xl shadow transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5 text-dark-900" />
                  <span>👑 Upgrade to Premium on Paystack</span>
                  <ArrowRight className="w-3.5 h-3.5 text-dark-900" />
                </Link>
              )}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="p-2.5 bg-white border-t border-cream-200 flex items-center gap-2"
            >
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
                className="p-2 text-dark-500 hover:text-brandGreen-800 hover:bg-cream-100 rounded-xl transition-colors cursor-pointer"
                title="Upload photo of material for Revi to analyze"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedImage ? 'Ask Revi about this photo...' : 'Ask Revi about materials, prices, escrow...'}
                className="flex-1 text-xs border border-cream-300 rounded-xl px-3 py-2 bg-cream-50/60 focus:outline-none focus:ring-2 focus:ring-[#062E12] text-dark-900"
              />
              <button
                type="submit"
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className="p-2 bg-[#062E12] hover:bg-[#08421a] disabled:opacity-40 text-white rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
