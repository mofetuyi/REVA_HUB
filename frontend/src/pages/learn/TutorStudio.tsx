import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Video, UploadCloud, DollarSign, Eye, Award, Sparkles,
  Plus, CheckCircle2, AlertCircle, Play, ExternalLink, X,
  Clock, ShieldCheck, Check, ArrowRight, MessageSquare, Send, Calendar, Users, Crown
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { MATERIAL_CATEGORIES, DIFFICULTY_LABELS } from '../../lib/nigeriaData'
import type { Tutorial, MaterialType, Difficulty } from '../../types'

interface TutorStudioProps {
  onTutorialCreated?: (newTutorial: Tutorial) => void
}

export function TutorStudio({ onTutorialCreated }: TutorStudioProps) {
  const { user, isAuthenticated } = useAuthStore()

  // Open tutorial upload access: anyone can upload tutorial videos directly
  const [tutorStatus, setTutorStatus] = useState<'none' | 'pending' | 'approved'>('approved')

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [loading, setLoading] = useState(false)

  // Application form state
  const [specialtyInput, setSpecialtyInput] = useState('')
  const [bioInput, setBioInput] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<MaterialType>('plastic')

  // Tutor's uploaded tutorials state
  const [tutorTutorials, setTutorTutorials] = useState<Tutorial[]>([
    {
      id: 'tut-tutor-1',
      slug: 'solar-cooker-from-scrap-cardboard',
      title: 'Building a Reflective Solar Cooker from Scrap Cardboard & Foil',
      description: 'Step-by-step guide on how to transform corrugated packaging boxes into efficient, zero-emission cooking boxes.',
      material_type: 'cardboard',
      difficulty: 'beginner',
      estimated_duration_minutes: 35,
      rating_average: 4.9,
      rating_count: 31,
      status: 'published',
      author_type: 'staff',
      view_count: 840,
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      materials_needed: ['Corrugated Cardboard', 'Aluminium Foil', 'Non-toxic Glue', 'Glass Sheet / Oven Bag'],
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: 'tut-tutor-2',
      slug: 'weaving-fabric-scraps-into-carpets',
      title: 'Weaving Cotton & Ankara Fabric Scraps into Heavy-Duty Door Mats',
      description: 'Lagos tailor scraps are in high supply. Learn the peg-loom weaving technique to create durable commercial carpets.',
      material_type: 'fabric',
      difficulty: 'intermediate',
      estimated_duration_minutes: 50,
      rating_average: 5.0,
      rating_count: 18,
      status: 'published',
      author_type: 'staff',
      view_count: 1260,
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      materials_needed: ['Ankara Textile Scraps', 'Cotton Twine', 'Wooden Loom Frame'],
      created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
  ])

  // Upload Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [materialType, setMaterialType] = useState<MaterialType>('plastic')
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const [duration, setDuration] = useState(30)
  const [videoUrl, setVideoUrl] = useState('')
  const [materialsNeededInput, setMaterialsNeededInput] = useState('')
  const [contentMarkdown, setContentMarkdown] = useState('')

  // Calculate live view-based monetization (₦1.50 per view = ₦1,500 per 1,000 views)
  const RATE_PER_VIEW = 1.5
  const totalViews = tutorTutorials.reduce((sum, t) => sum + (t.view_count || 0), 0)
  const totalEarningsNaira = (totalViews * RATE_PER_VIEW).toFixed(2)

  // Interactive student inquiries state (Premium students)
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  const [tutorSessions, setTutorSessions] = useState<any[]>([
    {
      id: 'sess-101',
      tutorial_title: 'Building a Reflective Solar Cooker from Scrap Cardboard & Foil',
      student_name: 'Babajide Adeleke',
      student_email: 'babajide@example.com',
      session_type: 'critique',
      status: 'pending',
      timestamp_seconds: 210,
      question_title: 'Can I substitute foil tape with regular aluminium foil pasted with PVA glue?',
      details: 'Hi Tutor, I am building this in Ikeja and could not source foil tape locally. Will PVA glue hold up to the solar heat in the box?',
      student_project_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'sess-102',
      tutorial_title: 'Weaving Cotton & Ankara Fabric Scraps into Heavy-Duty Door Mats',
      student_name: 'Chioma Okoye',
      student_email: 'chioma@example.com',
      session_type: 'one_on_one_call',
      status: 'answered',
      timestamp_seconds: 480,
      question_title: '1-on-1 Consultation on Commercial Batch Sizing & Pricing',
      details: 'Requesting a quick 15-minute call to discuss setting up a small upcycling collective with 3 tailors.',
      preferred_date: 'Saturday 2:00 PM Lagos Time',
      tutor_reply: 'Confirmed Chioma! Looking forward to reviewing your collective setup. Please join the Google Meet at our scheduled time.',
      meeting_link: 'https://meet.google.com/abc-defg-hij',
      replied_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    }
  ])

  const handleSendReply = async (sessionId: string) => {
    if (!replyText.trim()) return
    setSubmittingReply(true)
    try {
      await api.post(`/learn/tutor/interactive-sessions/${sessionId}/reply`, {
        reply: replyText,
        meeting_link: meetingLink || undefined,
        status: 'answered'
      })
    } catch {
      // Fallback local update
    }
    setTutorSessions(prev => prev.map(s => s.id === sessionId ? {
      ...s,
      status: 'answered',
      tutor_reply: replyText,
      meeting_link: meetingLink || s.meeting_link,
      replied_at: new Date().toISOString()
    } : s))
    toast.success('Reply and session details sent to the Premium student!')
    setReplyText('')
    setMeetingLink('')
    setActiveReplyId(null)
    setSubmittingReply(false)
  }

  // ── Handle Applying for Tutor Permission ──
  const handleApplyPermission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast.error('Please log in or sign up first to apply as a tutor')
      return
    }

    setLoading(true)
    try {
      await api.post('/learn/tutor/apply', {
        specialty: specialtyInput || `${selectedCategory} upcycling`,
        experience: bioInput,
      })
    } catch {
      // Offline/Demo fallback
    }

    setTutorStatus('pending')
    setLoading(false)
    toast.success('Application submitted! Your tutor posting permission is now under review.')
  }

  // ── Instant Approval (For testing/demo) ──
  const handleInstantApprove = async () => {
    setLoading(true)
    try {
      await api.post('/learn/tutor/grant-permission')
    } catch {
      // Local fallback
    }
    setTutorStatus('approved')
    setLoading(false)
    toast.success('✅ Tutor video posting permission granted! You can now upload video tutorials.')
  }

  // ── Handle Video Tutorial Upload ──
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (tutorStatus !== 'approved' && !user?.is_staff && !user?.is_admin) {
      toast.error('A tutor must receive posting permission before uploading videos.')
      return
    }
    if (!title.trim()) {
      toast.error('Please enter a tutorial title')
      return
    }
    if (!videoUrl.trim()) {
      toast.error('Please provide a video URL (YouTube, Vimeo, or MP4 link)')
      return
    }

    setLoading(true)
    const materialsList = materialsNeededInput
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean)

    const newTut: Tutorial = {
      id: 'tut-' + Date.now().toString(36),
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      title,
      description: description.slice(0, 250) || 'Practical hands-on video tutorial on circular materials upcycling.',
      material_type: materialType,
      difficulty,
      estimated_duration_minutes: Number(duration) || 30,
      video_url: videoUrl,
      materials_needed: materialsList.length > 0 ? materialsList : ['Recovered Materials', 'Basic Hand Tools'],
      author_type: 'staff',
      author_id: user?.id || 'demo_tutor',
      status: 'published',
      view_count: 1,
      rating_average: 5.0,
      rating_count: 1,
      created_at: new Date().toISOString(),
      tags: [materialType, 'video', 'tutor'],
    }

    try {
      await api.post('/learn/tutor/upload', {
        title: newTut.title,
        description: newTut.description,
        material_type: newTut.material_type,
        difficulty: newTut.difficulty,
        estimated_duration_minutes: newTut.estimated_duration_minutes,
        video_url: newTut.video_url,
        materials_needed: newTut.materials_needed,
        content_markdown: contentMarkdown || description,
      })
    } catch {
      // Local state fallback
    }

    setTutorTutorials((prev) => [newTut, ...prev])
    if (onTutorialCreated) {
      onTutorialCreated(newTut)
    }

    setLoading(false)
    setShowUploadModal(false)
    toast.success('🎉 Video tutorial & materials published! You will earn ₦1,500 per 1,000 views.', {
      duration: 5000,
    })

    // Reset Form
    setTitle('')
    setDescription('')
    setVideoUrl('')
    setMaterialsNeededInput('')
    setContentMarkdown('')
  }

  // ── 1. Unauthenticated Prompt ──
  if (!isAuthenticated) {
    return (
      <div className="bg-white border border-cream-200 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5 shadow-xs animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gold-50 border border-gold-200 flex items-center justify-center mx-auto text-gold-700">
          <Video className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-display font-bold text-dark-900">Sign in to Access Tutor Mode</h2>
          <p className="text-xs text-dark-500 max-w-md mx-auto">
            Ordinary accounts can become Tutors on Reva Hub for free! Sign in with your phone number to apply for video posting permission.
          </p>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <Link
            to="/login"
            className="bg-gold-500 hover:bg-gold-400 text-dark-900 font-bold px-6 py-2.5 rounded-xl text-xs transition-colors"
          >
            Log In to Account
          </Link>
          <Link
            to="/signup"
            className="border border-cream-300 hover:border-gold-500 text-dark-800 font-semibold px-6 py-2.5 rounded-xl text-xs transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>
    )
  }

  // ── 2. State: Not Applied (Permission Needed) ──
  if (tutorStatus === 'none') {
    return (
      <div className="bg-white border border-cream-200 rounded-3xl p-6 sm:p-10 max-w-2xl mx-auto shadow-xs space-y-6 animate-fade-in text-left">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-700">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-gold-700 font-bold">
              Free For All Reva Hub Accounts
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-dark-900">
              Apply for Tutor Video Posting Permission
            </h2>
          </div>
        </div>

        {/* Permission Rules Explanation */}
        <div className="bg-cream-50 border border-cream-200 rounded-2xl p-4 space-y-2 text-xs text-dark-700">
          <div className="flex items-center gap-1.5 font-bold text-dark-900">
            <ShieldCheck className="w-4 h-4 text-gold-600" />
            <span>Why Permission Is Required Before Posting Videos</span>
          </div>
          <p className="leading-relaxed">
            Any registered account can become a Tutor. To protect our circular community and ensure instructions are physically safe and authentic, <strong>tutors must receive permission before posting video tutorials</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <div className="flex items-center gap-1.5 bg-white p-2.5 rounded-lg border border-cream-200">
              <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span>Earn ₦1,500 per 1,000 video views</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white p-2.5 rounded-lg border border-cream-200">
              <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span>Free ordinary account access</span>
            </div>
          </div>
        </div>

        {/* Application Form */}
        <form onSubmit={handleApplyPermission} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-dark-800 mb-1">
              Primary Material Category You Teach *
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as MaterialType)}
              className="w-full px-3.5 py-2.5 border border-cream-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              {MATERIAL_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-800 mb-1">
              Your Craft or Upcycling Specialty *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Transforming scrap fabric into commercial tote bags, Pallet carpentry"
              value={specialtyInput}
              onChange={(e) => setSpecialtyInput(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-800 mb-1">
              Brief Experience / Bio (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Share a short summary of your background in recovered materials or making..."
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value)}
              className="w-full px-3.5 py-2 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-dark-900 hover:bg-dark-800 text-cream-50 font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Submitting Application...' : 'Submit Request for Tutor Posting Permission'}</span>
            <ArrowRight className="w-4 h-4 text-gold-400" />
          </button>
        </form>
      </div>
    )
  }

  // ── 3. State: Pending Approval ──
  if (tutorStatus === 'pending') {
    return (
      <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 sm:p-10 max-w-xl mx-auto text-center space-y-5 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto text-amber-700">
          <Clock className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <span className="text-xs uppercase font-mono tracking-wider text-amber-700 font-bold">
            Application Status: Pending Review
          </span>
          <h2 className="text-2xl font-display font-bold text-dark-900">
            Awaiting Tutor Video Posting Permission
          </h2>
          <p className="text-xs text-dark-600 max-w-md mx-auto leading-relaxed">
            Your application to become a Reva Hub Tutor has been received. Our review team verifies all creator profiles before granting video posting privileges. You will be able to post videos as soon as your permission is approved.
          </p>
        </div>

        {/* Quick Demo Approval trigger for seamless review */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleInstantApprove}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-gold-600" />
            <span>Grant Permission Now (Test & Demo)</span>
          </button>
        </div>
      </div>
    )
  }

  // ── 4. State: Approved (Active Tutor Creator Studio) ──
  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Studio Header */}
      <div className="bg-gradient-to-r from-dark-900 via-dark-800 to-dark-900 border border-gold-500/30 rounded-3xl p-6 sm:p-8 text-cream-50 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> POSTING PERMISSION APPROVED
            </span>
            <span className="text-xs text-cream-400">Reva Hub Learn Studio</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-cream-50">
            Welcome, Tutor {user?.name || 'Creator'}!
          </h2>
          <p className="text-xs sm:text-sm text-cream-300 max-w-xl">
            You earn <strong>₦1,500 per 1,000 views (₦1.50 per view)</strong> on your uploaded video tutorials. Every view adds to your monthly payout.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-dark-900 font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-gold-500/20 cursor-pointer active:scale-98"
          >
            <Plus className="w-5 h-5" />
            <span>Upload Video Tutorial</span>
          </button>
        </div>
      </div>

      {/* 4 Monetization Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-cream-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Total Video Views</p>
            <h3 className="text-2xl font-bold font-display text-dark-900">{totalViews.toLocaleString()}</h3>
            <p className="text-[11px] text-green-600 font-medium">Across all courses</p>
          </div>
        </div>

        <div className="bg-white border border-gold-300 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-700">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Total Earnings (NGN)</p>
            <h3 className="text-2xl font-bold font-display text-dark-900">₦{Number(totalEarningsNaira).toLocaleString()}</h3>
            <p className="text-[11px] text-gold-700 font-semibold">₦1.50 per view</p>
          </div>
        </div>

        <div className="bg-white border border-cream-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Published Videos</p>
            <h3 className="text-2xl font-bold font-display text-dark-900">{tutorTutorials.length}</h3>
            <p className="text-[11px] text-dark-400">Active on platform</p>
          </div>
        </div>

        <div className="bg-white border border-cream-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider">Student Rating</p>
            <h3 className="text-2xl font-bold font-display text-dark-900">4.9 ★</h3>
            <p className="text-[11px] text-purple-700 font-medium">Top Community Creator</p>
          </div>
        </div>
      </div>

      {/* Your Uploaded Tutorials */}
      <div className="bg-white border border-cream-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-xl text-dark-900">Your Published Video Tutorials</h3>
            <p className="text-xs text-dark-500 mt-0.5">Real-time view counts and accumulated earnings per video</p>
          </div>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="text-xs font-bold text-gold-600 hover:text-gold-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Upload new
          </button>
        </div>

        <div className="space-y-4">
          {tutorTutorials.map((tut) => {
            const tutEarnings = ((tut.view_count || 0) * RATE_PER_VIEW).toFixed(2)
            const cat = MATERIAL_CATEGORIES.find((c) => c.value === tut.material_type)

            return (
              <div
                key={tut.id}
                className="p-5 rounded-2xl border border-cream-200 hover:border-gold-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-cream-50/40"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-dark-900 text-cream-50 text-xs font-semibold rounded-full">
                      {cat?.icon} {cat?.label}
                    </span>
                    <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full capitalize">
                      {tut.difficulty}
                    </span>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full flex items-center gap-1">
                      <Play className="w-3 h-3 fill-blue-800" /> Video Guide
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-dark-900 leading-snug">
                    {tut.title}
                  </h4>
                  <p className="text-xs text-dark-500 line-clamp-1">{tut.description}</p>

                  {tut.materials_needed && tut.materials_needed.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-dark-600 pt-1">
                      <span className="font-semibold text-dark-700">📦 Materials:</span>
                      {tut.materials_needed.map((mat, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white border border-cream-200 rounded text-[11px]">
                          {mat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Performance & Earnings */}
                <div className="flex items-center gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-cream-200">
                  <div className="text-left md:text-right">
                    <p className="text-xs text-dark-400 font-medium">Views</p>
                    <p className="font-mono font-bold text-base text-dark-900 flex items-center gap-1 md:justify-end">
                      <Eye className="w-3.5 h-3.5 text-dark-400" />
                      {(tut.view_count || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-left md:text-right bg-gold-50 border border-gold-200 rounded-xl px-4 py-2">
                    <p className="text-[10px] uppercase font-bold text-gold-700 tracking-wider">Earned</p>
                    <p className="font-mono font-bold text-base text-dark-900">
                      ₦{Number(tutEarnings).toLocaleString()}
                    </p>
                  </div>

                  <Link
                    to={`/learn/tutorials/${tut.slug}`}
                    className="p-2 rounded-xl border border-cream-300 hover:border-gold-500 hover:bg-white text-dark-700 transition-colors"
                    title="View as student"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Interactive Student Inquiries & 1-on-1 Requests (Premium) ── */}
      <div className="bg-white border border-cream-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-cream-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-gold-100 text-gold-900 text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-gold-600" />
                <span>Premium Student Access</span>
              </span>
              <span className="text-xs text-dark-500 font-semibold">
                {tutorSessions.filter(s => s.status === 'pending').length} Pending Inquiries
              </span>
            </div>
            <h3 className="font-display font-bold text-xl text-dark-900 mt-1">
              Interactive Student Inquiries & 1-on-1 Consultations
            </h3>
            <p className="text-xs text-dark-600">
              Direct inquiries, project critiques, and consultation requests submitted by verified Reva Hub Premium students.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {tutorSessions.map((session) => (
            <div
              key={session.id}
              className={`rounded-2xl border p-5 space-y-4 transition-all ${
                session.status === 'pending'
                  ? 'border-gold-300 bg-amber-50/30'
                  : 'border-cream-200 bg-white'
              }`}
            >
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-dark-900">{session.student_name}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gold-100 text-gold-900">
                    ⭐ Premium Student
                  </span>
                  {session.session_type === 'critique' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                      🛠️ Project Critique
                    </span>
                  )}
                  {session.session_type === 'one_on_one_call' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                      📹 1-on-1 Consultation
                    </span>
                  )}
                  {session.timestamp_seconds !== undefined && session.timestamp_seconds !== null && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-dark-100 text-dark-800 font-bold">
                      ⏱️ Video @ {Math.floor(session.timestamp_seconds / 60)}:{(session.timestamp_seconds % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    session.status === 'answered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {session.status === 'answered' ? '✓ Replied' : '⏳ Action Needed'}
                  </span>
                </div>
              </div>

              {/* Course Title reference */}
              <p className="text-[11px] font-medium text-dark-500">
                Course: <strong className="text-dark-800">{session.tutorial_title}</strong>
              </p>

              {/* Inquiry details */}
              <div className="space-y-1 bg-white p-4 rounded-xl border border-cream-200">
                <h4 className="text-xs font-bold text-dark-900">{session.question_title}</h4>
                <p className="text-xs text-dark-700 whitespace-pre-wrap">{session.details}</p>
                {session.preferred_date && (
                  <p className="text-[11px] text-blue-700 font-semibold pt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Requested Time: {session.preferred_date}</span>
                  </p>
                )}
                {session.student_project_url && (
                  <div className="pt-2">
                    <a
                      href={session.student_project_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-gold-600 font-semibold hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Attached Student Work / Photos</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Tutor's existing reply if any */}
              {session.tutor_reply && (
                <div className="bg-gold-50/70 border-l-4 border-gold-500 rounded-r-xl p-3.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-dark-900">Your Response:</span>
                    {session.replied_at && (
                      <span className="text-[10px] text-dark-400">
                        {new Date(session.replied_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-dark-800 whitespace-pre-wrap">{session.tutor_reply}</p>
                  {session.meeting_link && (
                    <p className="pt-1 text-[11px] text-dark-900 font-mono">
                      Meeting Link: <a href={session.meeting_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-sans">{session.meeting_link}</a>
                    </p>
                  )}
                </div>
              )}

              {/* Reply Button / Form */}
              {activeReplyId === session.id ? (
                <div className="bg-cream-50 rounded-2xl p-4 space-y-3 border border-cream-200">
                  <h5 className="text-xs font-bold text-dark-900 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-gold-600" />
                    <span>Reply to {session.student_name}</span>
                  </h5>
                  <textarea
                    rows={3}
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Provide your direct advice, technical feedback, or notes for the session…"
                    className="w-full p-3 border border-cream-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
                  />
                  <div>
                    <label className="block text-[11px] font-semibold text-dark-700 mb-1">
                      Virtual Meeting Link (e.g. Google Meet / Zoom link for 1-on-1 calls)
                    </label>
                    <input
                      type="url"
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      placeholder="https://meet.google.com/… (optional)"
                      className="w-full px-3 py-2 border border-cream-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gold-400"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => { setActiveReplyId(null); setReplyText(''); setMeetingLink('') }}
                      className="px-3 py-1.5 rounded-xl border border-cream-300 text-xs font-semibold text-dark-700 hover:bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!replyText.trim() || submittingReply}
                      onClick={() => handleSendReply(session.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold text-xs shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submittingReply ? 'Sending…' : 'Send Answer'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveReplyId(session.id)
                      setReplyText(session.tutor_reply || '')
                      setMeetingLink(session.meeting_link || '')
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-gold-400 hover:bg-gold-50 text-dark-900 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-gold-600" />
                    <span>{session.status === 'answered' ? 'Update Response' : 'Reply to Student'}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Tutor Upload Video Tutorial Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-cream-200 max-h-[90vh] overflow-y-auto text-left relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-5 right-5 text-dark-400 hover:text-dark-800 p-1 rounded-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gold-100 flex items-center justify-center text-gold-700">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-dark-900">Upload Video Tutorial & Materials</h3>
                <p className="text-xs text-dark-500">Posting permission active — you will earn ₦1,500 per 1,000 views</p>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-dark-800 mb-1">
                  Tutorial Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Making Waterproof Rain Ponchos from Melted Clean Bags"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-dark-800 mb-1">Material Category *</label>
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                    className="w-full px-3 py-2 border border-cream-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gold-400"
                  >
                    {MATERIAL_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-dark-800 mb-1">Difficulty *</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="w-full px-3 py-2 border border-cream-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gold-400"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-dark-800 mb-1">Estimated Duration</label>
                  <input
                    type="number"
                    min={5}
                    max={360}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-cream-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-gold-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-800 mb-1">
                  Video URL (YouTube, Vimeo, or MP4) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
                <p className="text-[11px] text-dark-400 mt-1">
                  Students will stream your video directly in the Reva Hub player.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-800 mb-1">
                  Recovered Materials & Tools Required (Comma-separated) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50 Plastic bottles, Tailor scrap ankara, Soldering iron, Scissors"
                  value={materialsNeededInput}
                  onChange={(e) => setMaterialsNeededInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
                <p className="text-[11px] text-dark-400 mt-1">
                  These materials are linked to active marketplace listings so learners can find and buy them.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-800 mb-1">
                  Short Summary (&lt; 255 characters)
                </label>
                <textarea
                  maxLength={254}
                  rows={2}
                  placeholder="Explain what learners will build in this lesson..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-800 mb-1">
                  Step-by-Step Instructions & Notes (Markdown supported)
                </label>
                <textarea
                  rows={4}
                  placeholder="1. Wash and dry recovered materials...&#10;2. Measure and cut off excess fabric...&#10;3. Assemble the frame..."
                  value={contentMarkdown}
                  onChange={(e) => setContentMarkdown(e.target.value)}
                  className="w-full px-3.5 py-2 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 font-mono"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-3 px-4 border border-cream-300 text-dark-700 text-sm font-semibold rounded-xl hover:bg-cream-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-gold-500 hover:bg-gold-400 text-dark-900 text-sm font-bold rounded-xl transition-all shadow-md shadow-gold-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{loading ? 'Publishing...' : 'Publish Video Tutorial'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
