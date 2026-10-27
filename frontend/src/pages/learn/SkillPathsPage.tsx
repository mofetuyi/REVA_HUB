import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, Compass, ArrowRight, Layers } from 'lucide-react'
import { api } from '../../lib/api'
import { LoadingPage, EmptyState } from '../../components/ui/index'

export default function SkillPathsPage() {
  const { data: paths, isLoading } = useQuery({
    queryKey: ['skillPaths'],
    queryFn: async () => {
      try {
        const res = await api.get('/learn/paths')
        const items = Array.isArray(res.data) ? res.data : (res.data?.items || [])
        if (items.length > 0) return items
      } catch {
        // Fallback sample paths
      }
      return [
        {
          id: 'path-plastic',
          title: 'Zero-Waste Plastic Upcycling Mastery',
          description: 'From sorting shredded HDPE/PP to compression moulding durable tiles and pots.',
          material_type: 'plastic',
          difficulty: 'beginner',
          tutorial_count: 3,
        },
        {
          id: 'path-fabric',
          title: 'Lagos Textile & Fashion Waste Recovery',
          description: 'Source tailoring scraps, patch fabric sheets, and craft commercial bags & accessories.',
          material_type: 'fabric',
          difficulty: 'intermediate',
          tutorial_count: 4,
        },
      ]
    },
  })

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-dark-900 flex items-center gap-2">
          <Compass className="w-7 h-7 text-gold-600" />
          Reva Hub Learn: Skill Paths
        </h1>
        <p className="text-xs text-dark-500 mt-1">
          Structured learning journeys guiding you step-by-step from raw waste recovery to finished, commercial upcycled goods.
        </p>
      </div>

      {!paths || paths.length === 0 ? (
        <EmptyState
          icon="🧭"
          title="No skill paths available yet"
          description="Curated staff skill paths will appear here soon. Check individual DIY tutorials in the meantime."
          action={
            <Link to="/learn/tutorials">
              <span className="text-xs font-semibold text-gold-600 hover:underline">Browse Tutorials →</span>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paths.map((p: any) => (
            <Link
              key={p.id}
              to={`/learn/paths/${p.id}`}
              className="p-5 bg-white rounded-2xl border border-cream-200 hover:border-gold-400 hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
            >
              <div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-cream-100 text-dark-700">
                  {p.material_type}
                </span>
                <h2 className="font-display font-bold text-lg text-dark-900 group-hover:text-gold-600 transition-colors mt-1">
                  {p.title}
                </h2>
                <p className="text-xs text-dark-600 line-clamp-2 mt-1">{p.description}</p>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-cream-100">
                <span className="text-dark-500 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Linear Skill Journey
                </span>
                <span className="text-gold-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                  View Path →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
