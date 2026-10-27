import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Check, X, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { LoadingPage, EmptyState } from '../../components/ui/index'

export default function AdminLearnPage() {
  const queryClient = useQueryClient()

  const { data: tutorials, isLoading } = useQuery({
    queryKey: ['adminTutorials'],
    queryFn: async () => {
      const res = await api.get('/admin/learn/tutorials', { params: { status: 'pending_review' } })
      return res.data
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/learn/tutorials/${id}/approve`),
    onSuccess: () => {
      toast.success('Tutorial approved and published!')
      queryClient.invalidateQueries({ queryKey: ['adminTutorials'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-dark-900">Reva Hub Learn Moderation</h1>
        <p className="text-xs text-dark-500 mt-1">Review educational submissions, verify material DIY safety, and screen for plagiarism.</p>
      </div>

      {!tutorials || tutorials.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No pending tutorials"
          description="All submitted tutorials and DIY guides have been reviewed."
        />
      ) : (
        <div className="space-y-4">
          {tutorials.map((t: any) => (
            <div
              key={t.id}
              className="bg-white p-5 rounded-2xl border border-cream-200 hover:border-gold-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cream-100 text-dark-700 capitalize">
                  {t.material_type} · {t.difficulty}
                </span>
                <h3 className="font-display font-bold text-base text-dark-900">{t.title}</h3>
                <p className="text-xs text-dark-600 line-clamp-2">{t.description}</p>
                <p className="text-[11px] text-dark-400">Author: {t.author_name || 'Staff'}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(t.id)}
                  isLoading={approveMutation.isPending}
                  className="bg-green-700 hover:bg-green-800 text-white"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
