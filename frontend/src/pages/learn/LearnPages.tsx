import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  Search, BookOpen, Clock, Star, ChevronRight, ChevronLeft,
  GraduationCap, Video, Play, Plus, Crown, Sparkles, ExternalLink,
  MessageSquare, Users, CheckCircle2, Calendar, Send, Lock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { LoadingPage, EmptyState, RatingStars, Spinner } from '../../components/ui/index'
import { MATERIAL_CATEGORIES, DIFFICULTY_LABELS, formatDate, formatNGN } from '../../lib/nigeriaData'
import type { Tutorial, SkillPath, PaginatedResponse, MaterialType, Difficulty } from '../../types'
import { TutorStudio } from './TutorStudio'

// ── Default Tutorials Fallback (Guarantees Reva Learn is never blank) ──────
const DEFAULT_SAMPLE_TUTORIALS: Tutorial[] = [
  {
    id: 'tut-knit-1',
    slug: 'how-to-knit-beginner-guide-yarn',
    title: 'How to Knit: Complete Beginner Guide with Recovered Yarn',
    description: 'Learn step-by-step how to cast on, knit, and bind off using recovered wool and textile yarn.',
    material_type: 'fabric',
    difficulty: 'beginner',
    estimated_duration_minutes: 25,
    rating_average: 5.0,
    rating_count: 34,
    status: 'published',
    author_type: 'staff',
    view_count: 850,
    video_url: 'https://www.youtube.com/watch?v=p_R1UDsNOMk',
    materials_needed: ['Reclaimed Wool / Textile Yarn', 'Pair of Knitting Needles (5mm - 8mm)', 'Scissors', 'Tapestry Needle'],
    created_at: new Date().toISOString(),
    tags: ['knitting', 'fabric', 'yarn', 'craft', 'upcycling'],
  },
  {
    id: 'tut-1',
    slug: 'upcycled-plastic-planters',
    title: 'Transforming PET Bottles into Self-Watering Planters',
    description: 'Learn how to recover 2L soft drink bottles into beautiful, durable indoor planters for Lagos urban gardening.',
    material_type: 'plastic',
    difficulty: 'beginner',
    estimated_duration_minutes: 25,
    rating_average: 4.8,
    rating_count: 14,
    status: 'published',
    author_type: 'staff',
    view_count: 320,
    video_url: 'https://www.youtube.com/watch?v=M99b2qW9lB8',
    materials_needed: ['2L Plastic Bottles (PET)', 'Cotton Wick Yarn', 'Soil & Compost', 'Seeds or Cuttings'],
    created_at: new Date().toISOString(),
    tags: ['plastic', 'diy', 'gardening'],
  },
  {
    id: 'tut-2',
    slug: 'ankara-fabric-tote-bags',
    title: 'Crafting Stylish Tote Bags from Tailor Scrap Ankara',
    description: 'Turn offcut textile bundles from Yaba fashion houses into durable commercial shopping bags.',
    material_type: 'fabric',
    difficulty: 'intermediate',
    estimated_duration_minutes: 45,
    rating_average: 4.9,
    rating_count: 22,
    status: 'published',
    author_type: 'staff',
    view_count: 512,
    video_url: 'https://www.youtube.com/watch?v=Jm00Gk6b0pU',
    materials_needed: ['Ankara Fabric Scraps', 'Heavy Denim Offcuts', 'Cotton Thread', 'Sewing Needles'],
    created_at: new Date().toISOString(),
    tags: ['fabric', 'fashion', 'tote'],
  },
  {
    id: 'tut-3',
    slug: 'pallet-wood-coffee-table',
    title: 'Building a Minimalist Pallet Wood Coffee Table',
    description: 'Recover wooden shipping pallets from Apapa ports and turn them into sturdy, modern living room tables.',
    material_type: 'wood',
    difficulty: 'intermediate',
    estimated_duration_minutes: 60,
    rating_average: 4.7,
    rating_count: 9,
    status: 'published',
    author_type: 'staff',
    view_count: 240,
    video_url: 'https://www.youtube.com/watch?v=Gk7432fH_fU',
    materials_needed: ['Shipping Wooden Pallets', 'Wood Screws', 'Sandpaper (80-120 grit)', 'Clear Wood Varnish'],
    created_at: new Date().toISOString(),
    tags: ['wood', 'furniture', 'carpentry'],
  },
]

// ── Tutorial Card ─────────────────────────────────────────────────────────────
function TutorialCard({ tutorial }: { tutorial: Tutorial }) {
  const cat = MATERIAL_CATEGORIES.find(c => c.value === tutorial.material_type)
  const diffColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  }

  const difficultyLabel = (tutorial.difficulty && DIFFICULTY_LABELS[tutorial.difficulty]) || 'All Levels'
  const ratingAvg = typeof tutorial.rating_average === 'number' ? tutorial.rating_average.toFixed(1) : '5.0'
  const ratingCnt = tutorial.rating_count ?? 1

  return (
    <Link to={`/learn/tutorials/${tutorial.slug}`} className="card group hover:shadow-md transition-shadow">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="badge bg-dark-800 text-cream-50 text-xs">{cat?.icon || '♻️'} {cat?.label || 'Material'}</span>
          <div className="flex items-center gap-1.5">
            {tutorial.video_url && (
              <span className="badge bg-blue-100 text-blue-800 text-xs flex items-center gap-1">
                <Play className="w-2.5 h-2.5 fill-blue-800" /> Video
              </span>
            )}
            <span className={`badge text-xs ${diffColors[tutorial.difficulty] || 'bg-cream-100 text-dark-800'}`}>
              {difficultyLabel}
            </span>
          </div>
        </div>
        <h3 className="font-semibold text-dark-900 group-hover:text-gold-600 transition-colors line-clamp-2">
          {tutorial.title}
        </h3>
        <p className="text-sm text-dark-500 line-clamp-2">{tutorial.description}</p>
        <div className="flex items-center gap-3 text-xs text-dark-400">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tutorial.estimated_duration_minutes || 20} min</span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-gold-400 fill-gold-400" />
            {ratingAvg} ({ratingCnt})
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── Learn Home ────────────────────────────────────────────────────────────────
export function LearnHomePage() {
  const [learnMode, setLearnMode] = useState<'student' | 'tutor'>('student')
  const [extraTutorials, setExtraTutorials] = useState<Tutorial[]>([])

  const { data: featured, isLoading } = useQuery<PaginatedResponse<Tutorial>>({
    queryKey: ['tutorials', { page: 1, page_size: 6 }],
    queryFn: async () => (await api.get('/learn/tutorials', { params: { page_size: 6 } })).data,
  })

  const { data: paths } = useQuery<SkillPath[]>({
    queryKey: ['skill-paths'],
    queryFn: async () => (await api.get('/learn/skill-paths')).data?.items || [],
  })

  const allTutorials = [
    ...extraTutorials,
    ...((featured?.items && featured.items.length > 0) ? featured.items : DEFAULT_SAMPLE_TUTORIALS),
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Mode Switcher: Student vs Tutor ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-2.5 rounded-2xl border border-cream-200 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-cream-100/70 rounded-xl">
          <button
            type="button"
            onClick={() => setLearnMode('student')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              learnMode === 'student'
                ? 'bg-white text-dark-900 shadow-xs'
                : 'text-dark-600 hover:text-dark-900'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-gold-600" />
            <span>Student Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setLearnMode('tutor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              learnMode === 'tutor'
                ? 'bg-dark-900 text-gold-400 shadow-xs'
                : 'text-dark-600 hover:text-dark-900'
            }`}
          >
            <Video className="w-4 h-4 text-gold-400" />
            <span>Tutor Mode</span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold-500/20 text-gold-400 font-bold border border-gold-500/30">
              Earn NGN
            </span>
          </button>
        </div>

        <div className="text-xs text-dark-500 flex items-center gap-2 pr-2">
          {learnMode === 'student' ? (
            <span>Explore free upcycling guides & materials</span>
          ) : (
            <span className="text-gold-700 font-medium">💰 Tutors earn ₦1,500 per 1,000 video views</span>
          )}
        </div>
      </div>

      {/* ── Tutor Mode View ── */}
      {learnMode === 'tutor' ? (
        <TutorStudio onTutorialCreated={(newTut) => setExtraTutorials((prev) => [newTut, ...prev])} />
      ) : (
        /* ── Student Mode View ── */
        <div className="space-y-10">
          {/* Hero */}
          <div className="bg-gradient-to-br from-dark-900 to-dark-800 rounded-2xl p-8 md:p-12 text-cream-50 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #C9A227 0%, transparent 60%)' }} />
            <div className="relative max-w-xl">
              <span className="badge bg-gold-500 text-dark-900 mb-4 inline-block">Reva Hub Learn</span>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-3 leading-tight">
                Learn to create with recovered materials
              </h1>
              <p className="text-cream-200 mb-6">Step-by-step video tutorials and guides for artisans, makers, and recyclers in Lagos. Find materials directly on the marketplace.</p>
              <div className="flex gap-3 flex-wrap">
                <Link to="/learn/tutorials">
                  <button className="bg-gold-500 hover:bg-gold-400 text-dark-900 font-semibold px-6 py-3 rounded-xl transition-colors cursor-pointer">
                    Browse Tutorials
                  </button>
                </Link>
                <button
                  type="button"
                  onClick={() => setLearnMode('tutor')}
                  className="bg-gold-500 hover:bg-gold-400 text-dark-900 font-bold px-6 py-3 rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  <Video className="w-4 h-4 text-dark-900" />
                  <span>Upload Video Tutorial</span>
                </button>
              </div>
            </div>
          </div>

          {/* Browse by material */}
          <div>
            <h2 className="text-xl font-display font-bold mb-4">Browse by material</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {MATERIAL_CATEGORIES.map((cat) => (
                <Link
                  key={cat.value}
                  to={`/learn/tutorials?material_type=${cat.value}`}
                  className="card p-4 flex flex-col items-center gap-2 hover:shadow-md hover:border-gold-300 transition-all text-center"
                >
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-sm font-medium text-dark-700">{cat.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Featured tutorials */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold">Featured Video Tutorials & Guides</h2>
              <Link to="/learn/tutorials" className="text-sm text-gold-600 hover:underline flex items-center gap-1">
                See all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card p-4 animate-pulse space-y-3">
                    <div className="h-3 bg-cream-100 rounded w-1/3" />
                    <div className="h-4 bg-cream-100 rounded w-3/4" />
                    <div className="h-3 bg-cream-100 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allTutorials.map(t => (
                  <TutorialCard key={t.id} tutorial={t} />
                ))}
              </div>
            )}
          </div>

          {/* Skill paths */}
          {paths && paths.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display font-bold">Skill Paths</h2>
                <Link to="/learn/paths" className="text-sm text-gold-600 hover:underline flex items-center gap-1">
                  See all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {paths.slice(0, 4).map((path) => {
                  const cat = MATERIAL_CATEGORIES.find(c => c.value === path.material_type)
                  return (
                    <Link key={path.id} to={`/learn/paths/${path.id}`} className="card p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center text-2xl">{cat?.icon}</div>
                        <div>
                          <h3 className="font-semibold text-dark-900">{path.title}</h3>
                          <p className="text-xs text-dark-500">{path.tutorial_count} tutorials · {DIFFICULTY_LABELS[path.difficulty]}</p>
                        </div>
                      </div>
                      <p className="text-sm text-dark-600 mt-3 line-clamp-2">{path.description}</p>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tutorial Browse ───────────────────────────────────────────────────────────
export function TutorialBrowsePage() {
  const [search, setSearch] = React.useState('')
  const [materialType, setMaterialType] = React.useState<string>()
  const [difficulty, setDifficulty] = React.useState<string>()
  const [page, setPage] = React.useState(1)

  const { data, isLoading } = useQuery<PaginatedResponse<Tutorial>>({
    queryKey: ['tutorials', { page, search, materialType, difficulty }],
    queryFn: async () => (await api.get('/learn/tutorials', {
      params: { page, page_size: 18, search: search || undefined, material_type: materialType, difficulty },
    })).data,
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold mb-1">Tutorials</h1>
        <p className="text-dark-600 text-sm">Learn to make useful products from recovered materials</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="search"
            placeholder="Search tutorials…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 border border-cream-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>
        <select value={materialType || ''} onChange={(e) => { setMaterialType(e.target.value || undefined); setPage(1) }} className="px-3 py-2.5 border border-cream-200 rounded-xl bg-white text-sm focus:outline-none">
          <option value="">All materials</option>
          {MATERIAL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
        </select>
        <select value={difficulty || ''} onChange={(e) => { setDifficulty(e.target.value || undefined); setPage(1) }} className="px-3 py-2.5 border border-cream-200 rounded-xl bg-white text-sm focus:outline-none">
          <option value="">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse space-y-3">
              <div className="h-3 bg-cream-100 rounded w-1/3" />
              <div className="h-4 bg-cream-100 rounded w-3/4" />
              <div className="h-3 bg-cream-100 rounded" />
            </div>
          ))}
        </div>
      ) : (!data?.items || data.items.length === 0) ? (
        <div className="space-y-4">
          <p className="text-xs text-dark-500">Sample upcycling guides (live tutorials load when connected):</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEFAULT_SAMPLE_TUTORIALS.map(t => <TutorialCard key={t.id} tutorial={t} />)}
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-dark-500">{data.total} tutorial{data.total !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map(t => <TutorialCard key={t.id} tutorial={t} />)}
          </div>
        </>
      )}
    </div>
  )
}

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null
}

// ── Tutorial Detail ───────────────────────────────────────────────────────────
export function TutorialDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [activeSection, setActiveSection] = React.useState(0)
  const [ratingOpen, setRatingOpen] = React.useState(false)
  const [adDismissed, setAdDismissed] = React.useState(false)
  const [skipCountdown, setSkipCountdown] = React.useState(5)
  const adTimerRef = React.useRef<ReturnType<typeof setInterval>>()

  const { data: tutorial, isLoading } = useQuery<Tutorial>({
    queryKey: ['tutorial', slug],
    queryFn: async () => (await api.get(`/learn/tutorials/${slug}`)).data,
  })

  const { data: materials } = useQuery({
    queryKey: ['tutorial-materials', tutorial?.id],
    queryFn: async () => (await api.get(`/learn/tutorials/${tutorial!.id}/materials`)).data,
    enabled: !!tutorial?.id,
  })

  const completeMutation = useMutation({
    mutationFn: () => api.post(`/learn/tutorials/${tutorial!.id}/complete`),
    onSuccess: () => { toast.success('Tutorial completed! 🎉'); queryClient.invalidateQueries({ queryKey: ['my-progress'] }) },
  })

  const bookmarkMutation = useMutation({
    mutationFn: () => api.post(`/learn/tutorials/${tutorial!.id}/bookmark`),
    onSuccess: (res) => toast.success(res.data.bookmarked ? 'Bookmarked!' : 'Bookmark removed'),
  })

  // Ad skip countdown
  const preAd = tutorial?.ads?.find(a => a.placement_type === 'pre_tutorial')
  const bannerAd = tutorial?.ads?.find(a => a.placement_type === 'banner')
  const inlineAds = tutorial?.ads?.filter(a => a.placement_type === 'inline').slice(0, 3) || []

  React.useEffect(() => {
    if (preAd && !adDismissed && skipCountdown > 0) {
      adTimerRef.current = setInterval(() => setSkipCountdown(s => s - 1), 1000)
      return () => clearInterval(adTimerRef.current)
    }
  }, [preAd, adDismissed])

  const fallbackTutorial = DEFAULT_SAMPLE_TUTORIALS.find(t => t.slug === slug)
  const activeTutorial = tutorial || fallbackTutorial

  if (isLoading && !activeTutorial) return <LoadingPage />
  if (!activeTutorial) return <EmptyState icon="📚" title="Tutorial not found" description="This tutorial may have been archived or removed." />

  const sections = activeTutorial.sections || [
    {
      id: 'sec-1',
      section_id: '1',
      heading: '1. Material Gathering & Preparation',
      body_markdown: 'Collect clean materials from nearby recovery points. Sort and clean before starting your build.',
      order_index: 0,
    },
    {
      id: 'sec-2',
      section_id: '2',
      heading: '2. Cutting, Assembly & Shaping',
      body_markdown: 'Follow basic craft safety protocols. Assemble components step-by-step.',
      order_index: 1,
    },
    {
      id: 'sec-3',
      section_id: '3',
      heading: '3. Finishing & Testing',
      body_markdown: 'Inspect the finished item for stability, durability, and commercial aesthetic appeal.',
      order_index: 2,
    },
  ]
  const cat = MATERIAL_CATEGORIES.find(c => c.value === activeTutorial.material_type)
  const isFreeUser = !user

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <Link to="/learn/tutorials" className="inline-flex items-center gap-1 text-sm text-dark-500 hover:text-dark-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> Back to tutorials
      </Link>

      {/* Pre-tutorial video ad (free users) */}
      {isFreeUser && preAd && !adDismissed && (
        <div className="bg-dark-900 rounded-2xl p-8 mb-6 text-center space-y-3">
          <p className="text-cream-200 text-sm">Advertisement</p>
          <div className="bg-dark-800 rounded-xl aspect-video flex items-center justify-center max-w-lg mx-auto">
            <p className="text-cream-200">📺 Video Ad: {preAd.call_to_action}</p>
          </div>
          {skipCountdown > 0 ? (
            <p className="text-cream-300 text-sm">Skip in {skipCountdown}s…</p>
          ) : (
            <button onClick={() => setAdDismissed(true)} className="bg-gold-500 text-dark-900 px-4 py-2 rounded-lg font-medium text-sm">
              Skip Ad →
            </button>
          )}
        </div>
      )}

      {/* Banner ad */}
      {isFreeUser && bannerAd && (
        <div className="bg-cream-100 border border-cream-200 rounded-xl p-3 mb-4 flex items-center justify-between text-sm">
          <span className="text-dark-500 text-xs">Ad: {bannerAd.call_to_action}</span>
          <span className="text-xs text-dark-300">Sponsored</span>
        </div>
      )}

      <div className="grid lg:grid-cols-[240px_1fr_280px] gap-6">
        {/* Sections sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-1">
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Contents</h3>
            {sections.map((sec, i) => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${i === activeSection ? 'bg-gold-50 text-gold-700 font-medium' : 'text-dark-600 hover:bg-cream-50'}`}
              >
                {i + 1}. {sec.heading}
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <article className="min-w-0 space-y-6">
          {/* Header */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="badge bg-dark-800 text-cream-50">{cat?.icon} {cat?.label}</span>
              <span className={`badge text-xs ${activeTutorial.difficulty === 'beginner' ? 'bg-green-100 text-green-800' : activeTutorial.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                {(activeTutorial.difficulty && DIFFICULTY_LABELS[activeTutorial.difficulty]) || 'All Levels'}
              </span>
              <span className="badge bg-cream-100 text-dark-700"><Clock className="w-3 h-3" /> {activeTutorial.estimated_duration_minutes || 20} min</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-dark-900">{activeTutorial.title}</h1>
            <p className="text-dark-600 mt-2">{activeTutorial.description}</p>
            <div className="flex items-center gap-4 mt-3">
              <RatingStars rating={activeTutorial.rating_average ?? 5} size="sm" label={`Rating: ${(activeTutorial.rating_average ?? 5).toFixed(1)} from ${activeTutorial.rating_count ?? 1} ratings`} />
              <span className="text-sm text-dark-400">{activeTutorial.view_count || 100} views</span>
            </div>
          </div>

          {/* Main Video Guide */}
          {activeTutorial.video_url && (
            <div className="bg-dark-950 rounded-2xl overflow-hidden aspect-video shadow-lg border border-dark-800">
              {getYouTubeEmbedUrl(activeTutorial.video_url) ? (
                <iframe
                  src={getYouTubeEmbedUrl(activeTutorial.video_url)!}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={activeTutorial.title}
                />
              ) : (
                <video
                  controls
                  className="w-full h-full object-contain"
                  src={activeTutorial.video_url}
                  poster="/logo.jpg"
                />
              )}
            </div>
          )}

          {/* Recovered Materials & Tools Required */}
          {activeTutorial.materials_needed && activeTutorial.materials_needed.length > 0 && (
            <div className="bg-amber-50/70 border border-gold-300/70 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-dark-900 text-sm">
                <span className="text-base">📦</span>
                <span>Recovered Materials & Tools Needed for this Project:</span>
              </div>
              <p className="text-xs text-dark-600">
                Click any material below to find and arrange recovery from sellers on Reva Hub:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {activeTutorial.materials_needed.map((mat, idx) => (
                  <Link
                    key={idx}
                    to={`/listings?search=${encodeURIComponent(mat)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-cream-200 hover:border-gold-500 rounded-lg text-xs font-semibold text-dark-800 transition-colors shadow-2xs group"
                    title="Find material on marketplace"
                  >
                    <span>♻️</span>
                    <span>{mat}</span>
                    <span className="text-[10px] text-gold-600 font-bold group-hover:underline">Find on Reva Hub →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {user && (
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="secondary" onClick={() => bookmarkMutation.mutate()}>🔖 Bookmark</Button>
              <Button size="sm" onClick={() => completeMutation.mutate()} loading={completeMutation.isPending}>✓ Mark Complete</Button>
              <Button size="sm" variant="ghost" onClick={() => setRatingOpen(true)}>⭐ Rate</Button>
            </div>
          )}

          {/* Section content */}
          {sections.length > 0 && (
            <div className="space-y-8">
              {sections.map((sec, i) => (
                <React.Fragment key={sec.id}>
                  <section id={`section-${sec.section_id}`}>
                    <h2 className="text-xl font-display font-bold text-dark-900 mb-4">{sec.heading}</h2>
                    <div className="prose prose-sm max-w-none text-dark-700 leading-relaxed whitespace-pre-wrap">
                      {sec.body_markdown}
                    </div>
                    {sec.image_url && (
                      <figure className="mt-4">
                        <img src={sec.image_url} alt={sec.image_alt || sec.heading} className="rounded-xl w-full" loading="lazy" />
                        {sec.image_caption && <figcaption className="text-xs text-dark-400 text-center mt-2">{sec.image_caption}</figcaption>}
                      </figure>
                    )}
                    {sec.video_id && (
                      <div className="mt-4 aspect-video rounded-xl overflow-hidden bg-dark-900">
                        <iframe
                          src={`https://${sec.video_platform === 'youtube' ? 'www.youtube.com/embed' : 'player.vimeo.com/video'}/${sec.video_id}${sec.video_start_time ? `?start=${sec.video_start_time}` : ''}`}
                          className="w-full h-full"
                          allowFullScreen
                          title={sec.heading}
                        />
                      </div>
                    )}
                  </section>
                  {/* Inline ad every ~3 sections, max 3 ads */}
                  {isFreeUser && inlineAds[Math.floor(i / 3)] && (i + 1) % 3 === 0 && (
                    <div className="bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm text-center text-dark-400">
                      Sponsored: {inlineAds[Math.floor(i / 3)].call_to_action}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Tags */}
          {activeTutorial.tags && activeTutorial.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-cream-100">
              {activeTutorial.tags.map(tag => (
                <Link key={tag} to={`/learn/tutorials?search=${tag}`} className="badge bg-cream-100 text-dark-600 hover:bg-gold-50 hover:text-gold-700 transition-colors">
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Interactive Creator Sessions (Exclusive for Premium Users) */}
          <div className="pt-6 border-t border-cream-100">
            <InteractiveCreatorSection tutorial={activeTutorial} />
          </div>

          {/* Comments placeholder */}
          <div className="pt-6 border-t border-cream-100">
            <h3 className="font-display font-bold text-lg mb-3">Questions & Comments</h3>
            {!user ? (
              <p className="text-dark-500 text-sm"><Link to="/login" className="text-gold-600 hover:underline">Log in</Link> to ask questions and leave comments.</p>
            ) : (
              <CommentSection tutorialId={activeTutorial.id} />
            )}
          </div>
        </article>

        {/* Materials sidebar */}
        <aside className="space-y-4">
          <div className="card p-4 sticky top-24">
            <h3 className="font-semibold text-dark-900 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gold-500" /> Get Materials
            </h3>
            {!materials?.length ? (
              <p className="text-sm text-dark-500">No linked marketplace listings yet.</p>
            ) : (
              <div className="space-y-3">
                {materials.map((m: any) => (
                  <Link
                    key={m.link_id}
                    to={`/listings/${m.listing.slug}`}
                    onClick={() => api.post(`/learn/tutorials/${activeTutorial.id}/materials/${m.listing.id}/click`)}
                    className="block p-3 rounded-xl border border-cream-100 hover:border-gold-300 hover:bg-gold-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-dark-900 truncate">{m.listing.title}</p>
                    <p className="text-gold-600 font-semibold text-sm">{formatNGN(m.listing.price_ngn)}</p>
                    <p className="text-xs text-dark-400">{m.listing.lga} · {m.relevance.replace('_', ' ')}</p>
                  </Link>
                ))}
              </div>
            )}
            <Link to={`/?category=${activeTutorial.material_type}`} className="mt-3 block text-center text-xs text-gold-600 hover:underline">
              Browse all {cat?.label} listings →
            </Link>
          </div>
        </aside>
      </div>

      {/* Rating modal */}
      {ratingOpen && (
        <RatingModal tutorialId={activeTutorial.id} onClose={() => setRatingOpen(false)} />
      )}
    </div>
  )
}

function RatingModal({ tutorialId, onClose }: { tutorialId: string; onClose: () => void }) {
  const [rating, setRating] = React.useState(0)
  const [feedback, setFeedback] = React.useState('')
  const queryClient = useQueryClient()

  const rateMutation = useMutation({
    mutationFn: () => api.post(`/learn/tutorials/${tutorialId}/rate`, { rating, feedback }),
    onSuccess: () => { toast.success('Rating submitted!'); queryClient.invalidateQueries({ queryKey: ['tutorial'] }); onClose() },
    onError: (err: any) => toast.error(extractError(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/60" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="font-display font-bold text-xl">Rate this Tutorial</h2>
        <div className="flex gap-2 justify-center">
          {[1,2,3,4,5].map(s => (
            <button key={s} type="button" onClick={() => setRating(s)} className={`text-4xl transition-transform hover:scale-110 ${s <= rating ? '' : 'opacity-30'}`}>⭐</button>
          ))}
        </div>
        <textarea rows={3} className="input-field resize-none text-sm" value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Optional feedback…" />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => rateMutation.mutate()} disabled={rating === 0} loading={rateMutation.isPending} className="flex-1">Submit</Button>
        </div>
      </div>
    </div>
  )
}





function InteractiveCreatorSection({ tutorial }: { tutorial: Tutorial }) {
  const { user, activatePremium } = useAuthStore()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [sessionType, setSessionType] = useState<'qa_priority' | 'critique' | 'one_on_one_call'>('qa_priority')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [timestamp, setTimestamp] = useState('')
  const [projectUrl, setProjectUrl] = useState('')
  const [prefDate, setPrefDate] = useState('')

  const isPremiumUser = !!(user?.is_premium || user?.is_staff || user?.is_admin)

  const nameParts = (user?.name || '').trim().split(/\s+/)
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''
  const userEmail = user?.email || (user?.phone ? `${user.phone.replace(/[^0-9]/g, '')}@reva-marketplace.com.ng` : '')
  const userPhone = user?.phone || ''
  const revaId = user?.reva_id || (user?.id ? `REVA-${user.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}` : 'REVA-MEMBER01')

  const premiumParams = new URLSearchParams()
  if (firstName) premiumParams.set('first_name', firstName)
  if (lastName) premiumParams.set('last_name', lastName)
  if (user?.name) premiumParams.set('name', user.name)
  if (userEmail) premiumParams.set('email', userEmail)
  if (userPhone) premiumParams.set('phone', userPhone)
  premiumParams.set('reva_id_number', revaId)
  premiumParams.set('reva_id', revaId)
  premiumParams.set('REVA ID number', revaId)
  premiumParams.set('REVA_ID_number', revaId)
  premiumParams.set('reva_id_no', revaId)

  const paystackPremiumUrl = `https://paystack.shop/pay/reva?${premiumParams.toString()}`

  const handleQuickActivate = () => {
    try {
      navigator.clipboard.writeText(revaId)
    } catch {}
    activatePremium(30)
    toast.success(`🎉 REVA ID ${revaId} copied & 30-Day Premium active! Opening Paystack...`, { duration: 4500 })
  }

  const { data } = useQuery({
    queryKey: ['interactive-sessions', tutorial.id],
    queryFn: async () => {
      try {
        return (await api.get(`/learn/tutorials/${tutorial.id}/interactive-sessions`)).data
      } catch {
        return {
          is_premium_user: isPremiumUser,
          tutor_name: 'Tutor Creator',
          sessions: [],
        }
      }
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      let seconds: number | undefined
      if (timestamp) {
        const parts = timestamp.split(':').map(Number)
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          seconds = parts[0] * 60 + parts[1]
        }
      }
      return (await api.post(`/learn/tutorials/${tutorial.id}/interactive-sessions`, {
        session_type: sessionType,
        question_title: title,
        details,
        timestamp_seconds: seconds,
        student_project_url: projectUrl || undefined,
        preferred_date: prefDate || undefined,
      })).data
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Interactive request sent to tutor creator!')
      setTitle('')
      setDetails('')
      setTimestamp('')
      setProjectUrl('')
      setPrefDate('')
      setFormOpen(false)
      queryClient.invalidateQueries({ queryKey: ['interactive-sessions', tutorial.id] })
    },
    onError: (err: any) => {
      toast.error(extractError(err))
    },
  })

  const tutorName = data?.tutor_name || 'Tutor Creator'
  const rawSessions = data?.sessions || []
  const sessions = rawSessions.length > 0 ? rawSessions : [
    {
      id: 'sample-s1',
      student_name: 'Amina Lawal',
      session_type: 'critique',
      status: 'answered',
      timestamp_seconds: 145,
      question_title: 'How should I bind the recovered edges for heavy load?',
      details: 'I am building this project using recovered local materials. The edges felt loose after stitching.',
      tutor_name: tutorName,
      tutor_reply: 'Great question! For heavier load carrying, reinforce the seams with cross-stitched nylon thread and use double edge folds as shown at 02:25.',
      replied_at: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date(Date.now() - 172800000).toISOString(),
    }
  ]

  return (
    <div className="bg-gradient-to-br from-amber-50/70 via-white to-gold-50/40 border-2 border-gold-300/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gold-200/70">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-100 text-gold-900 text-xs font-bold uppercase tracking-wide">
            <Crown className="w-3.5 h-3.5 text-gold-600" />
            <span>Premium Exclusive</span>
          </div>
          <h3 className="text-xl font-display font-bold text-dark-900 flex items-center gap-2">
            <span>Interactive Sessions with Creator</span>
          </h3>
          <p className="text-xs text-dark-600">
            Connect directly with <strong className="text-dark-900">{tutorName}</strong> for 1-on-1 consultations, video timestamped Q&A, and technical project critiques.
          </p>
        </div>

        {/* Action Button */}
        {isPremiumUser ? (
          <Button
            size="sm"
            onClick={() => setFormOpen(!formOpen)}
            className="bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold border-0 shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4" />
            {formOpen ? 'Close Form' : 'Start Interactive Session'}
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <a
              href={paystackPremiumUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleQuickActivate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 text-dark-950 font-bold text-xs rounded-xl shadow-md transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Crown className="w-4 h-4" />
              <span>Activate Premium (NGN 3,000)</span>
            </a>
            <Link
              to="/premium"
              className="inline-flex items-center gap-1 px-3 py-2 bg-dark-100 hover:bg-dark-200 text-dark-800 font-semibold text-xs rounded-xl transition-colors"
            >
              <span>See Benefits</span>
            </Link>
          </div>
        )}
      </div>

      {/* Non-Premium Teaser / Lock Notice */}
      {!isPremiumUser && (
        <div className="bg-white/95 border border-gold-200/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-100 text-gold-700 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-dark-900">
                Direct Interaction with Creator is Reserved for Reva Premium Members
              </h4>
              <p className="text-xs text-dark-600 leading-relaxed">
                Standard accounts can watch the tutorial and leave public comments. Upgrade to Reva Hub Premium to submit your personal project photos for custom critiques, ask video timestamp-pinned questions, and schedule 1-on-1 virtual mentoring calls with the tutor creator.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 bg-cream-50/80 rounded-xl border border-cream-200 flex items-center gap-2 font-medium text-dark-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>1-on-1 Virtual Creator Consultations</span>
            </div>
            <div className="p-3 bg-cream-50/80 rounded-xl border border-cream-200 flex items-center gap-2 font-medium text-dark-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Video Timestamp Pinned Q&A</span>
            </div>
            <div className="p-3 bg-cream-50/80 rounded-xl border border-cream-200 flex items-center gap-2 font-medium text-dark-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Personalized Project Critiques</span>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-gold-100">
            <a
              href={paystackPremiumUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleQuickActivate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold text-xs rounded-xl shadow-md transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Crown className="w-4 h-4" />
              <span>Pay NGN 3,000 on Paystack (Autofills Details & REVA ID)</span>
            </a>
            <span className="text-xs text-dark-500">Your REVA ID: <strong className="font-mono text-dark-900 bg-cream-100 px-2 py-0.5 rounded border border-cream-200">{revaId}</strong></span>
          </div>
        </div>
      )}

      {/* Premium Submission Form */}
      {isPremiumUser && formOpen && (
        <form
          onSubmit={(e) => { e.preventDefault(); submitMutation.mutate() }}
          className="bg-white rounded-2xl border border-gold-200 p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-dark-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold-500" />
              <span>New Interactive Request for {tutorName}</span>
            </h4>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              ✓ Verified Premium Student
            </span>
          </div>

          {/* Session Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-dark-800 mb-1.5">Interactive Session Type *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { type: 'qa_priority' as const, label: '⭐ Priority Q&A', desc: 'Direct question to creator' },
                { type: 'critique' as const, label: '🛠️ Project Critique', desc: 'Share photos/work for review' },
                { type: 'one_on_one_call' as const, label: '📹 1-on-1 Consultation', desc: 'Book a 15-min virtual call' },
              ].map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setSessionType(opt.type)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    sessionType === opt.type
                      ? 'border-gold-500 bg-gold-50/70 shadow-2xs'
                      : 'border-cream-200 hover:border-gold-300 bg-white'
                  }`}
                >
                  <p className="text-xs font-bold text-dark-900">{opt.label}</p>
                  <p className="text-[10px] text-dark-500">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-dark-800 mb-1">Inquiry Title / Subject *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. How to reinforce the base joint with wire?"
                className="input-field text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-800 mb-1">Video Timestamp (optional)</label>
              <input
                type="text"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                placeholder="e.g. 02:45"
                className="input-field text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-800 mb-1">Details & Specific Questions *</label>
            <textarea
              required
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe what you are working on, any challenges faced, or questions for the creator…"
              className="input-field text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-dark-800 mb-1">Your Project Photo / Link (optional)</label>
              <input
                type="url"
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
                placeholder="https://drive.google.com/… or image URL"
                className="input-field text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-800 mb-1">Preferred Date / Time for 1-on-1 (optional)</label>
              <input
                type="text"
                value={prefDate}
                onChange={(e) => setPrefDate(e.target.value)}
                placeholder="e.g. Saturday 3:00 PM Lagos Time"
                className="input-field text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={submitMutation.isPending}
              disabled={!title.trim() || !details.trim()}
              className="bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send to Creator
            </Button>
          </div>
        </form>
      )}

      {/* Interactive Threads & Creator Replies */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-dark-700 uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-gold-600" />
          <span>Interactive Threads ({sessions.length})</span>
        </h4>

        <div className="space-y-3">
          {sessions.map((s: any) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-cream-200 p-4 sm:p-5 space-y-3 shadow-2xs hover:border-gold-300 transition-colors"
            >
              {/* Thread Top */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-dark-900">{s.student_name}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gold-100 text-gold-900">
                    ⭐ Premium Student
                  </span>
                  {s.session_type === 'critique' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                      🛠️ Project Critique
                    </span>
                  )}
                  {s.session_type === 'one_on_one_call' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                      📹 1-on-1 Consultation
                    </span>
                  )}
                  {s.timestamp_seconds !== undefined && s.timestamp_seconds !== null && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-dark-100 text-dark-800 font-bold">
                      ⏱️ {Math.floor(s.timestamp_seconds / 60)}:{(s.timestamp_seconds % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    s.status === 'answered' || s.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {s.status === 'answered' ? '✓ Creator Replied' : s.status === 'completed' ? '✓ Completed' : '⏳ Awaiting Creator Reply'}
                  </span>
                  <span className="text-[11px] text-dark-400">{formatDate(s.created_at)}</span>
                </div>
              </div>

              {/* Question */}
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-dark-900">{s.question_title}</h5>
                <p className="text-xs text-dark-700 whitespace-pre-wrap">{s.details}</p>
                {s.student_project_url && (
                  <a
                    href={s.student_project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-gold-600 hover:underline pt-1 font-semibold"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View Attached Student Project/Photos</span>
                  </a>
                )}
              </div>

              {/* Tutor Creator's Verified Reply */}
              {s.tutor_reply ? (
                <div className="mt-3 bg-gold-50/70 border-l-4 border-gold-500 rounded-r-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-dark-900">
                      <GraduationCap className="w-4 h-4 text-gold-600" />
                      <span>{s.tutor_name || tutorName}</span>
                      <span className="text-[10px] bg-dark-900 text-cream-50 px-1.5 py-0.2 rounded font-semibold">
                        Tutor Creator
                      </span>
                    </div>
                    {s.replied_at && (
                      <span className="text-[10px] text-dark-400">{formatDate(s.replied_at)}</span>
                    )}
                  </div>
                  <p className="text-xs text-dark-800 whitespace-pre-wrap leading-relaxed">{s.tutor_reply}</p>
                  {s.meeting_link && (
                    <div className="pt-2">
                      <a
                        href={s.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-dark-900 text-cream-50 rounded-lg text-xs font-bold hover:bg-dark-800 transition-colors shadow-2xs"
                      >
                        <Video className="w-3.5 h-3.5 text-gold-400" />
                        <span>Join 1-on-1 Virtual Creator Session</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-dark-400 italic flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>The tutor creator will review and respond directly to this session request.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CommentSection({ tutorialId }: { tutorialId: string }) {
  const [body, setBody] = React.useState('')
  const queryClient = useQueryClient()

  const { data: comments } = useQuery({
    queryKey: ['tutorial-comments', tutorialId],
    queryFn: async () => (await api.get(`/learn/tutorials/${tutorialId}/comments`)).data,
  })

  const postMutation = useMutation({
    mutationFn: () => api.post(`/learn/tutorials/${tutorialId}/comments`, { body }),
    onSuccess: () => { toast.success('Comment submitted for review'); setBody(''); queryClient.invalidateQueries({ queryKey: ['tutorial-comments', tutorialId] }) },
    onError: (err: any) => toast.error(extractError(err)),
  })

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Ask a question or share a tip… (max 1000 chars)"
          className="input-field resize-none text-sm"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-dark-400">{body.length}/1000</span>
          <Button size="sm" onClick={() => postMutation.mutate()} disabled={!body.trim()} loading={postMutation.isPending}>Post</Button>
        </div>
      </div>
      <div className="space-y-3">
        {comments?.map((c: any) => (
          <div key={c.id} className="bg-cream-50 rounded-xl p-3">
            {c.is_pinned && <span className="badge bg-gold-100 text-gold-700 text-xs mb-1">📌 Pinned</span>}
            <p className="text-sm text-dark-800">{c.body}</p>
            <p className="text-xs text-dark-400 mt-1">{formatDate(c.created_at)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}




