import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bookmark, CheckCircle, BookOpen } from 'lucide-react'
import { api } from '../../lib/api'
import { LoadingPage, EmptyState } from '../../components/ui/index'

export default function MyLearningPage() {
  const { data: learning, isLoading } = useQuery({
    queryKey: ['myLearning'],
    queryFn: async () => {
      const res = await api.get('/learn/my-progress')
      return res.data
    },
  })

  if (isLoading) return <LoadingPage />

  const completed = learning?.completed || []
  const bookmarked = learning?.bookmarked || []

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-dark-900">My Learning Dashboard</h1>
        <p className="text-xs text-dark-500 mt-1">Track completed upcycling tutorials and saved guides.</p>
      </div>

      {/* Bookmarked Tutorials */}
      <div className="space-y-4">
        <h2 className="font-display font-bold text-lg text-dark-900 flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-gold-600" />
          Saved & Bookmarked Guides
        </h2>
        {bookmarked.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-cream-200 text-center text-xs text-dark-400">
            You haven't bookmarked any guides yet. Explore tutorials and click the bookmark icon to save.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bookmarked.map((t: any) => (
              <Link
                key={t.id}
                to={`/learn/tutorials/${t.slug}`}
                className="p-4 bg-white rounded-2xl border border-cream-200 hover:border-gold-400 transition-all space-y-2 group"
              >
                <h3 className="font-bold text-sm text-dark-900 group-hover:text-gold-600 transition-colors line-clamp-1">
                  {t.title}
                </h3>
                <p className="text-xs text-dark-500 line-clamp-2">{t.description}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Completed Tutorials */}
      <div className="space-y-4">
        <h2 className="font-display font-bold text-lg text-dark-900 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-700" />
          Completed Tutorials
        </h2>
        {completed.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-cream-200 text-center text-xs text-dark-400">
            No completed tutorials yet. Mark a tutorial complete when you finish building a project!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {completed.map((t: any) => (
              <Link
                key={t.id}
                to={`/learn/tutorials/${t.slug}`}
                className="p-4 bg-white rounded-2xl border border-cream-200 hover:border-gold-400 transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-dark-900 group-hover:text-gold-600 transition-colors line-clamp-1">
                    {t.title}
                  </h3>
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                </div>
                <p className="text-xs text-dark-500 line-clamp-2">{t.description}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
