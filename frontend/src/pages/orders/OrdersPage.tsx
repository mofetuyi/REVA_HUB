import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { StatusBadge, EmptyState, LoadingPage, PriceDisplay } from '../../components/ui/index'
import { formatNGN, formatDate } from '../../lib/nigeriaData'
import type { Order } from '../../types'

function FeeBreakdown({ order }: { order: Order }) {
  const sellerProceeds = order.seller_proceeds_ngn || (order.total_amount_ngn * 0.94)
  const commission = order.commission_ngn || (order.total_amount_ngn * 0.06)

  return (
    <div className="bg-cream-50 rounded-xl p-3.5 text-xs space-y-1.5 border border-cream-200">
      <h3 className="font-bold text-dark-900 mb-1">Fee & Escrow Breakdown (6% Platform / 94% Payout)</h3>
      <div className="flex justify-between text-dark-700">
        <span>Order Material Total</span>
        <span className="font-medium">{formatNGN(order.total_amount_ngn)}</span>
      </div>
      <div className="flex justify-between text-dark-500">
        <span>Reva Hub Marketplace Commission (6%)</span>
        <span>−{formatNGN(commission)}</span>
      </div>
      <div className="border-t border-cream-200 pt-1 mt-1 flex justify-between font-bold text-dark-900">
        <span className="text-emerald-700">Paystack Automatic Seller Payout (94%)</span>
        <span className="text-emerald-700 font-mono">{formatNGN(sellerProceeds)}</span>
      </div>
      <p className="text-[10px] text-dark-400 mt-1">
        Funds are released to the seller via Paystack transfer the moment the buyer clicks "Delivered & Confirmed".
      </p>
    </div>
  )
}

function DisputeModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const [reason, setReason] = React.useState('')
  const [description, setDescription] = React.useState('')
  const queryClient = useQueryClient()

  const REASONS = [
    { value: 'condition_not_as_described', label: 'Condition not as described' },
    { value: 'quantity_mismatch', label: 'Quantity mismatch' },
    { value: 'delivery_not_received', label: 'Delivery not received' },
    { value: 'damaged_in_transit', label: 'Damaged in transit' },
    { value: 'other', label: 'Other' },
  ]

  const disputeMutation = useMutation({
    mutationFn: () => api.post(`/orders/${order.id}/dispute`, { reason, description }),
    onSuccess: () => {
      toast.success('Dispute raised. Our team will review it.')
      queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-dark-900/60 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-bold text-xl text-red-700">Raise a Dispute</h2>
        <div>
          <label className="label">Reason *</label>
          <select className="input-field" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Select a reason</option>
            {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Description * <span className="text-dark-400 font-normal">(min 20 chars)</span></label>
          <textarea rows={4} className="input-field resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Please describe the issue in detail…" />
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => disputeMutation.mutate()} loading={disputeMutation.isPending} disabled={!reason || description.length < 20} className="flex-1">
            Raise Dispute
          </Button>
        </div>
      </div>
    </div>
  )
}

function ReviewModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const [rating, setRating] = React.useState(0)
  const [comment, setComment] = React.useState('')
  const queryClient = useQueryClient()

  const reviewMutation = useMutation({
    mutationFn: () => api.post('/reviews', { order_id: order.id, rating, comment }),
    onSuccess: () => {
      toast.success('Review submitted!')
      queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-dark-900/60" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-bold text-xl">Leave a Review</h2>
        <div>
          <label className="label">Rating *</label>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(s => (
              <button key={s} type="button" onClick={() => setRating(s)} className={`text-3xl transition-transform hover:scale-110 ${s <= rating ? '' : 'opacity-30'}`}>⭐</button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Comment (optional)</label>
          <textarea rows={3} className="input-field resize-none text-sm" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience with this transaction…" />
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => reviewMutation.mutate()} loading={reviewMutation.isPending} disabled={rating === 0} className="flex-1">Submit Review</Button>
        </div>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = React.useState<'buying' | 'selling'>('buying')
  const [disputeOrder, setDisputeOrder] = React.useState<Order | null>(null)
  const [reviewOrder, setReviewOrder] = React.useState<Order | null>(null)
  const queryClient = useQueryClient()

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['orders', tab],
    queryFn: async () => (await api.get('/orders', { params: { role: tab === 'buying' ? 'buyer' : 'seller' } })).data,
  })

  const paymentMutation = useMutation({
    mutationFn: (orderId: string) => api.post(`/orders/${orderId}/initiate-payment`),
    onSuccess: (res) => {
      if (res.data.checkout_url) window.location.href = res.data.checkout_url
      else toast.error('Payment provider not configured. Set PAYMENT_SECRET_KEY.')
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const deliveryMutation = useMutation({
    mutationFn: (orderId: string) => api.post(`/orders/${orderId}/confirm-delivery`, { notes: '' }),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Delivery confirmed! 94% automatically transferred to seller via Paystack.')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const inTransitMutation = useMutation({
    mutationFn: (orderId: string) => api.put(`/orders/${orderId}/in-transit`),
    onSuccess: () => {
      toast.success('Order marked as in transit')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <LoadingPage />

  const STATUS_TIMELINE = ['created', 'payment_pending', 'funded', 'in_transit', 'delivered', 'confirmed', 'completed']

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      <h1 className="text-2xl font-display font-bold">My Orders</h1>

      <div className="flex border-b border-cream-200">
        {(['buying', 'selling'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-gold-500 text-gold-600' : 'border-transparent text-dark-500 hover:text-dark-800'}`}>
            {t === 'buying' ? 'As Buyer' : 'As Seller'}
          </button>
        ))}
      </div>

      {!orders?.length ? (
        <EmptyState icon="📦" title="No orders yet" description={tab === 'buying' ? "When you make an offer and it's accepted, your order will appear here." : "When a buyer accepts your listing offer, orders will appear here."} />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={order.status} />
                    <span className="text-xs text-dark-400">{formatDate(order.created_at)}</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <PriceDisplay amount={order.total_amount_ngn} className="text-xl" />
                    <span className="text-sm text-dark-500">{order.quantity} {order.unit}</span>
                  </div>
                </div>
                <Link to={`/listings/${order.listing_id}`} className="text-xs text-gold-600 hover:underline whitespace-nowrap">View listing →</Link>
              </div>

              {/* Status timeline */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {STATUS_TIMELINE.map((s, i) => {
                  const currentIdx = STATUS_TIMELINE.indexOf(order.status)
                  const done = i <= currentIdx
                  return (
                    <React.Fragment key={s}>
                      <div className={`flex-shrink-0 w-3 h-3 rounded-full border-2 ${done ? 'bg-gold-500 border-gold-500' : 'bg-white border-cream-200'}`} title={s.replace(/_/g, ' ')} />
                      {i < STATUS_TIMELINE.length - 1 && <div className={`flex-1 h-0.5 min-w-[12px] ${i < currentIdx ? 'bg-gold-500' : 'bg-cream-200'}`} />}
                    </React.Fragment>
                  )
                })}
              </div>

              {/* Logistics & Delivery Info */}
              <div className="bg-cream-50/80 p-3 rounded-xl border border-cream-200 text-xs space-y-1">
                <span className="font-bold text-dark-800 uppercase tracking-wider text-[10px]">
                  Fulfillment & Logistics: {order.delivery_method ? order.delivery_method.replace('_', ' ') : 'Self Pickup'}
                </span>
                {order.delivery_method === 'reva_logistics' ? (
                  <p className="text-dark-700">
                    <strong>Delivery Address:</strong> {order.buyer_delivery_address || 'Lagos, Nigeria'} · <strong>Phone:</strong> {order.buyer_phone || 'On file'}
                  </p>
                ) : (
                  <p className="text-dark-700">
                    <strong>Pickup Point:</strong> {order.seller_pickup_address || 'Lagos, Nigeria'} · <strong>Seller Contact:</strong> {order.seller_contact_phone || 'Provided for dispatch'}
                  </p>
                )}
                {order.seller_payout_status === 'released' && (
                  <div className="text-emerald-700 font-semibold pt-1 flex items-center gap-1">
                    <span>✓ 94% Seller Payout Transferred:</span>
                    <span className="font-mono">{formatNGN(order.seller_proceeds_ngn || (order.total_amount_ngn * 0.94))}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {tab === 'buying' && order.status === 'payment_pending' && (
                  <Button size="sm" onClick={() => paymentMutation.mutate(order.id)} loading={paymentMutation.isPending}>
                    Pay Now
                  </Button>
                )}
                {tab === 'buying' && (order.status === 'funded' || order.status === 'in_transit' || order.status === 'delivered') && (
                  <Button
                    size="sm"
                    onClick={() => deliveryMutation.mutate(order.id)}
                    loading={deliveryMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    ✓ Delivered & Confirmed (Release 94% Payout)
                  </Button>
                )}
                {tab === 'selling' && order.status === 'funded' && (
                  <Button size="sm" variant="secondary" onClick={() => inTransitMutation.mutate(order.id)} loading={inTransitMutation.isPending}>
                    Mark Ready / In Transit
                  </Button>
                )}
                {['funded', 'in_transit', 'delivered', 'confirmed'].includes(order.status) && (
                  <Button size="sm" variant="danger" onClick={() => setDisputeOrder(order)}>
                    Raise Dispute
                  </Button>
                )}
                {order.status === 'completed' && (
                  <Button size="sm" variant="secondary" onClick={() => setReviewOrder(order)}>
                    Leave Review
                  </Button>
                )}
              </div>

              {order.commission_ngn > 0 && <FeeBreakdown order={order} />}

              {/* Event log */}
              {order.events?.length > 0 && (
                <details className="text-xs text-dark-500">
                  <summary className="cursor-pointer hover:text-dark-800 font-medium">Order history ({order.events.length} events)</summary>
                  <div className="mt-2 space-y-1 pl-2 border-l-2 border-cream-100">
                    {order.events.map((e, i) => (
                      <div key={i}>
                        <span className="font-medium capitalize">{e.event_type.replace(/_/g, ' ')}</span>
                        {' — '}{e.description}
                        <span className="text-dark-300 ml-1">{formatDate(e.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {disputeOrder && <DisputeModal order={disputeOrder} onClose={() => setDisputeOrder(null)} />}
      {reviewOrder && <ReviewModal order={reviewOrder} onClose={() => setReviewOrder(null)} />}
    </div>
  )
}
