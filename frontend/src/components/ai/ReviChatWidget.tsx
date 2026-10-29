import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Sparkles, RefreshCw, Crown, Lock, Image as ImageIcon, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

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
  const { user, isAuthenticated, activatePremium } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [activating, setActivating] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'revi-welcome',
      role: 'assistant',
      content:
        "Hi! I'm **Revi**, your circular economy AI assistant. 🌿\n\nAsk me about buying or selling recovered materials, Lagos courier delivery, or safe Paystack escrow!\n\n💡 *Tip: You can now also upload photos of materials for instant visual identification and price estimation!*",
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
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isLoading, isOpen, selectedImage])

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

  const handleSend = async (textToSend?: string) => {
    if (!isPremium) {
      toast.error('Free accounts are restricted from sending messages. Upgrade to Premium to chat with Revi!')
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

  const handleActivatePremium = async () => {
    setActivating(true)
    try {
      await api.post('/auth/premium/activate-month')
      activatePremium(30)
      toast.success('👑 Welcome to Reva Premium! Revi AI is now fully unlocked.')
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setActivating(false)
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
          className="flex items-center gap-2.5 px-4 py-3 bg-[#062E12] hover:bg-[#08421a] text-white rounded-full shadow-2xl border-2 border-gold-400 hover:scale-105 active:scale-95 transition-all duration-200 group cursor-pointer"
          aria-label="Chat with Revi AI"
        >
          <div className="relative">
            <span className="text-xl">🌿</span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border border-dark-900 animate-pulse" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="block text-xs font-black tracking-wide text-white group-hover:text-gold-300">
                Chat with Revi
              </span>
              <span className="text-[10px] font-bold px-1 rounded bg-gold-400/20 text-gold-300 border border-gold-400/40">
                👑 AI
              </span>
            </div>
            <span className="block text-[10px] text-gold-300/80 font-medium leading-none mt-0.5">
              Circular Economy Guide
            </span>
          </div>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[400px] h-[550px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-cream-300 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-[#062E12] text-white p-3.5 px-4 flex items-center justify-between border-b border-gold-500/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-dark-900/40 border border-gold-400 flex items-center justify-center text-sm">
                🌿
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display font-bold text-sm text-white">Revi AI</h3>
                  {isPremium ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-gold-400/20 text-gold-300 border border-gold-400/40 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5" /> Premium Active
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Free Mode (View Only)
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gold-200/90">Multimodal Material & Price Vision</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetChat}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Reset Conversation"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
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
                      toast.error('👑 Upgrade to Premium to send messages to Revi AI!')
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
                className="p-1 text-gold-800 hover:text-red-600 rounded-full"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input Form or Premium Gate */}
          {!isPremium ? (
            /* Restricted Free Account Bar */
            <div className="p-3 bg-gradient-to-r from-cream-100 to-cream-50 border-t border-cream-200 space-y-2">
              <div className="flex items-center justify-between text-xs text-dark-700">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-bold text-dark-900">Sending is Premium Only</span>
                </div>
                <span className="text-[10px] text-dark-500">Free accounts cannot send</span>
              </div>
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2.5 px-3 bg-[#062E12] hover:bg-[#08421a] text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-1.5"
                >
                  Sign In to Access Premium
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleActivatePremium}
                  disabled={activating}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-dark-900 text-xs font-black rounded-xl shadow transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5 text-dark-900" />
                  {activating ? 'Unlocking Premium...' : '👑 Upgrade to Premium to Chat'}
                </button>
              )}
            </div>
          ) : (
            /* Active Premium Input Form */
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
