import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, PlayCircle, BookOpen } from 'lucide-react'
import { api } from '../../lib/api'
import { LoadingPage, EmptyState } from '../../components/ui/index'

export default function SkillPathDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: path, isLoading } = useQuery({
    queryKey: ['skillPath', id],
    queryFn: async () => {
      const res = await api.get(`/learn/paths/${id}`)
      return res.data
    },
  })

  if (isLoading) return <LoadingPage />
  if (!path) return <EmptyState icon="🧭" title="Skill path not found" description="The requested path does not exist." />

  const tutorials = path.tutorials || []

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <Link to="/learn/paths" className="inline-flex items-center gap-1.5 text-xs text-dark-500 hover:text-dark-900">
        <ArrowLeft className="w-4 h-4" /> Back to Skill Paths
      </Link>

      <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-sm space-y-3">
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-cream-100 text-dark-700">
          {path.material_type}
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-dark-900">{path.title}</h1>
        <p className="text-xs text-dark-600 leading-relaxed">{path.description}</p>
      </div>

      <div className="space-y-4">
        <h2 className="font-display font-bold text-lg text-dark-900">Tutorial Curriculum in this Path</h2>
        {tutorials.length === 0 ? (
          <p className="text-xs text-dark-400">Curriculum tutorials are being finalized.</p>
        ) : (
          <div className="space-y-3">
            {tutorials.map((t: any, index: number) => (
              <Link
                key={t.id}
                to={`/learn/tutorials/${t.slug}`}
                className="p-4 bg-white rounded-2xl border border-cream-200 hover:border-gold-400 transition-all flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gold-50 text-gold-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-dark-900 group-hover:text-gold-600 transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-[11px] text-dark-500">{t.estimated_minutes} min read</p>
                  </div>
                </div>
                <PlayCircle className="w-5 h-5 text-dark-400 group-hover:text-gold-600 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
