import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { StatusBadge, EmptyState, LoadingPage, PriceDisplay } from '../../components/ui/index'
import { formatDate } from '../../lib/nigeriaData'
import type { Offer } from '../../types'
import { useAuthStore } from '../../store/authStore'

function OfferCard({ offer, isAsBuyer }: { offer: Offer; isAsBuyer: boolean }) {
  const queryClient = useQueryClient()

  const actionMutation = useMutation({
    mutationFn: (action: string) => api.put(`/offers/${offer.id}`, { action }),
    onSuccess: () => {
      toast.success('Offer updated')
      queryClient.invalidateQueries({ queryKey: ['offers'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const canAct = offer.status === 'pending' || offer.status === 'countered'
  const isMine = isAsBuyer ? offer.status === 'pending' : offer.status === 'countered'
  const canAccept = canAct && !isMine
  const canReject = canAct && !isMine
  const canCounter = canAct && !isMine
  const canWithdraw = isAsBuyer && offer.status === 'pending'

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">{isAsBuyer ? 'Offer you made' : 'Offer received'}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={offer.status} />
            <span className="text-xs text-dark-400">Expires {formatDate(offer.expires_at)}</span>
          </div>
        </div>
        <Link to={`/listings/${offer.listing_id}`} className="text-xs text-gold-600 hover:underline whitespace-nowrap">View listing →</Link>
      </div>

      <div className="bg-cream-50 rounded-lg p-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-dark-600">Proposed price</span>
          <PriceDisplay amount={offer.proposed_price} className="text-dark-900" />
        </div>
        {offer.proposed_quantity && (
          <div className="flex justify-between text-sm">
            <span className="text-dark-600">Quantity</span>
            <span>{offer.proposed_quantity} {offer.unit}</span>
          </div>
        )}
        {offer.message && <p className="text-xs text-dark-500 italic border-t border-cream-100 pt-2 mt-2">"{offer.message}"</p>}
      </div>

      {offer.status === 'countered' && offer.counter_price && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 space-y-1">
          <p className="text-xs font-semibold text-purple-700 mb-1">Counter offer</p>
          <div className="flex justify-between text-sm">
            <span className="text-dark-600">Counter price</span>
            <PriceDisplay amount={offer.counter_price} className="font-bold" />
          </div>
          {offer.counter_message && <p className="text-xs text-dark-500 italic">"{offer.counter_message}"</p>}
        </div>
      )}

      {canAct && (
        <div className="flex gap-2 flex-wrap">
          {canAccept && (
            <Button size="sm" onClick={() => actionMutation.mutate('accept')} loading={actionMutation.isPending}>
              Accept
            </Button>
          )}
          {canCounter && !isAsBuyer && (
            <CounterOfferButton offerId={offer.id} />
          )}
          {canReject && (
            <Button size="sm" variant="secondary" onClick={() => actionMutation.mutate('reject')} loading={actionMutation.isPending}>
              Decline
            </Button>
          )}
          {canWithdraw && (
            <Button size="sm" variant="ghost" onClick={() => actionMutation.mutate('withdraw')} loading={actionMutation.isPending}>
              Withdraw
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function CounterOfferButton({ offerId }: { offerId: string }) {
  const [open, setOpen] = React.useState(false)
  const [price, setPrice] = React.useState('')
  const [message, setMessage] = React.useState('')
  const queryClient = useQueryClient()

  const counterMutation = useMutation({
    mutationFn: () => api.put(`/offers/${offerId}`, { action: 'counter', counter_price: parseFloat(price), counter_message: message }),
    onSuccess: () => {
      toast.success('Counter offer sent')
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      setOpen(false)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  if (!open) return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Counter</Button>

  return (
    <div className="w-full space-y-2 border border-cream-200 rounded-lg p-3">
      <input type="number" placeholder="Counter price (₦)" value={price} onChange={(e) => setPrice(e.target.value)} className="input-field text-sm" />
      <input type="text" placeholder="Message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} className="input-field text-sm" />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => counterMutation.mutate()} loading={counterMutation.isPending} disabled={!price}>Send Counter</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  )
}

export default function OffersPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = React.useState<'received' | 'sent'>('received')

  const { data: offers, isLoading } = useQuery<Offer[]>({
    queryKey: ['offers'],
    queryFn: async () => (await api.get('/offers')).data,
  })

  const received = offers?.filter(o => o.seller_id === user?.id) || []
  const sent = offers?.filter(o => o.buyer_id === user?.id) || []

  const displayed = tab === 'received' ? received : sent

  if (isLoading) return <LoadingPage />

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <h1 className="text-2xl font-display font-bold">My Offers</h1>

      <div className="flex border-b border-cream-200">
        {(['received', 'sent'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-gold-500 text-gold-600' : 'border-transparent text-dark-500 hover:text-dark-800'}`}
          >
            {t} {t === 'received' ? `(${received.length})` : `(${sent.length})`}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <EmptyState
          icon="🤝"
          title={`No ${tab} offers`}
          description={tab === 'received' ? 'Offers from buyers will appear here.' : 'Browse listings and make an offer to get started.'}
          action={tab === 'sent' ? <Link to="/"><Button>Browse Listings</Button></Link> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {displayed.map((offer) => (
            <OfferCard key={offer.id} offer={offer} isAsBuyer={tab === 'sent'} />
          ))}
        </div>
      )}
    </div>
  )
}


