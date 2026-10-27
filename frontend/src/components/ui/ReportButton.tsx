import React, { useState } from 'react'
import { Flag, X, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from './Button'
import type { ReportTargetType, ReportReason } from '../../types'

interface ReportButtonProps {
  targetType: ReportTargetType
  targetId: string
  className?: string
  buttonText?: string
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'fraud_scam', label: 'Fraud or scam' },
  { value: 'stolen_goods', label: 'Stolen or illegally obtained goods' },
  { value: 'prohibited_item', label: 'Prohibited material or hazardous waste' },
  { value: 'harassment', label: 'Harassment, threats or discrimination' },
  { value: 'spam', label: 'Spam or misleading listing' },
  { value: 'fake_account', label: 'Fake account or impersonation' },
  { value: 'payment_abuse', label: 'Payment abuse or off-platform payment request' },
  { value: 'other', label: 'Other acceptable use violation' },
]

export function ReportButton({ targetType, targetId, className = '', buttonText = 'Report' }: ReportButtonProps) {
  const { isAuthenticated } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('fraud_scam')
  const [description, setDescription] = useState('')
  const [evidenceUrls, setEvidenceUrls] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isAuthenticated) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (description.trim().length < 10) {
      toast.error('Please describe the issue in at least 10 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      const urls = evidenceUrls
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0)

      await api.post('/compliance/reports', {
        target_type: targetType,
        target_id: targetId,
        reason,
        description: description.trim(),
        evidence_urls: urls,
      })

      toast.success('Report submitted. Reva Hub staff will review it according to our Trust & Safety Policy.')
      setIsOpen(false)
      setDescription('')
      setEvidenceUrls('')
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs text-dark-500 hover:text-red-600 transition-colors ${className}`}
        title={`Report this ${targetType}`}
      >
        <Flag className="w-3.5 h-3.5" />
        <span>{buttonText}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-cream-200">
            <div className="flex items-center justify-between pb-4 border-b border-cream-100">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-display font-bold text-lg text-dark-900">
                  Report {targetType.charAt(0).toUpperCase() + targetType.slice(1)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-dark-400 hover:text-dark-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <p className="text-xs text-dark-600">
                Reports are treated confidentially and reviewed under Reva Hub's Trust, Safety and Acceptable Use Policy.
              </p>

              <div>
                <label className="block text-xs font-semibold text-dark-800 mb-1">
                  Reason for report *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReportReason)}
                  className="w-full text-sm border border-cream-300 rounded-xl px-3 py-2 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-800 mb-1">
                  Description of violation * (min 10 characters)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide specific details about what is wrong with this item or user..."
                  className="w-full text-sm border border-cream-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-800 mb-1">
                  Evidence URLs (optional, one per line)
                </label>
                <textarea
                  rows={2}
                  value={evidenceUrls}
                  onChange={(e) => setEvidenceUrls(e.target.value)}
                  placeholder="https://... (links to screenshots, messages, or documents)"
                  className="w-full text-xs border border-cream-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-cream-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  isLoading={isSubmitting}
                >
                  Submit Report
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
