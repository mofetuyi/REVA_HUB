import React, { useState } from 'react'
import {
  Building2, Copy, Check, Upload, Sparkles, CheckCircle2,
  AlertCircle, ShieldCheck, ArrowRight, RefreshCw, FileText, Camera
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'

export interface BankTransferAIVerifierProps {
  amount: number // in NGN
  title?: string
  subtitle?: string
  revaId?: string
  orderId?: string
  paymentType: 'premium' | 'goods'
  onSuccess: (reference: string) => void | Promise<void>
  onCancel?: () => void
}

export default function BankTransferAIVerifier({
  amount,
  title = 'Direct Bank Transfer',
  subtitle,
  revaId = '',
  orderId,
  paymentType,
  onSuccess,
  onCancel,
}: BankTransferAIVerifierProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState('')
  const [senderName, setSenderName] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [scanStep, setScanStep] = useState<string>('')
  const [verifiedResult, setVerifiedResult] = useState<any | null>(null)

  const bankDetails = {
    bankName: 'PalmPay',
    accountNumber: '7040396575',
    accountName: 'GBENGA ADEBAYO ADETUNJI',
  }

  const narration = revaId || (orderId ? `ORDER-${orderId.slice(0, 8)}` : 'REVA PAYMENT')

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success(`${field} copied to clipboard!`)
    setTimeout(() => setCopiedField(null), 2500)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, or WEBP)')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image size must be less than 8MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setReceiptImage(reader.result as string)
      toast.success('Receipt uploaded! Click "I Have Paid & Verify with AI" below.')
    }
    reader.readAsDataURL(file)
  }

  const handleVerify = async () => {
    if (!receiptImage && !sessionId.trim()) {
      toast.error('Please upload your transfer receipt screenshot OR enter the NIBSS Session ID.')
      return
    }

    setIsVerifying(true)
    setScanStep('Connecting to Reva AI Vision Auditor...')

    try {
      setTimeout(() => {
        setScanStep('Auditing transfer receipt with Gemini Multimodal AI...')
      }, 700)
      setTimeout(() => {
        setScanStep('Verifying PalmPay 7040396575 destination & amount...')
      }, 1500)

      const payload = {
        image_b64: receiptImage || undefined,
        session_id: sessionId.trim() || undefined,
        sender_name: senderName.trim() || undefined,
      }

      let res
      if (paymentType === 'premium') {
        res = await api.post('/auth/premium/verify-transfer-ai', payload)
      } else if (orderId) {
        res = await api.post(`/orders/${orderId}/verify-transfer-ai`, payload)
      } else {
        // Pre-order checkout verification
        res = await api.post('/orders/verify-receipt-ai', {
          ...payload,
          expected_amount_ngn: amount,
        })
      }

      setScanStep('Payment successfully verified by AI! 🎉')
      setVerifiedResult(res.data)
      toast.success(res.data.message || 'Payment verified!')

      setTimeout(async () => {
        await onSuccess(res.data.reference || res.data.audit?.transaction_reference || 'AI_VERIFIED')
      }, 1200)
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Verification failed. Please check the receipt.'
      toast.error(msg)
      setScanStep('')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-xs text-neutral-400">
                {subtitle || 'Transfer directly from your banking app. AI verifies in seconds.'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3 h-3" />
            Instant AI Audit
          </span>
        </div>
      </div>

      {/* Official Bank Account Card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/30 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Official Platform Bank Account
          </span>
          <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
            Zero Gateway Fee
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Bank */}
          <div className="bg-neutral-800/60 rounded-lg p-2.5 border border-neutral-700/60">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">Bank Name</div>
            <div className="font-bold text-white text-sm mt-0.5">{bankDetails.bankName}</div>
          </div>

          {/* Amount */}
          <div className="bg-neutral-800/60 rounded-lg p-2.5 border border-neutral-700/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">Exact Amount</div>
              <div className="font-bold text-emerald-400 text-sm mt-0.5">₦{amount.toLocaleString()}</div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(amount.toString(), 'Amount')}
              className="text-neutral-400 hover:text-white p-1"
              title="Copy amount"
            >
              {copiedField === 'Amount' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Account Number */}
          <div className="col-span-2 bg-neutral-800/80 rounded-lg p-3 border border-emerald-500/40 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">Account Number</div>
              <div className="font-mono font-extrabold text-white text-lg tracking-wider">
                {bankDetails.accountNumber}
              </div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(bankDetails.accountNumber, 'Account number')}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-neutral-950 font-semibold rounded-md hover:bg-emerald-400 text-xs transition"
            >
              {copiedField === 'Account number' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Account Name */}
          <div className="col-span-2 bg-neutral-800/60 rounded-lg p-2.5 border border-neutral-700/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">Account Name</div>
              <div className="font-semibold text-white text-xs mt-0.5">{bankDetails.accountName}</div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(bankDetails.accountName, 'Account name')}
              className="text-neutral-400 hover:text-white p-1"
            >
              {copiedField === 'Account name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Narration / Reference */}
          <div className="col-span-2 bg-neutral-800/60 rounded-lg p-2.5 border border-neutral-700/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">Payment Narration / Reference</div>
              <div className="font-mono text-xs text-neutral-300 mt-0.5">{narration}</div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(narration, 'Narration')}
              className="text-neutral-400 hover:text-white p-1"
            >
              {copiedField === 'Narration' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Step Instructions */}
      <div className="rounded-lg bg-neutral-900 border border-neutral-800 p-3 space-y-2 text-xs text-neutral-300">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          How to Complete Payment:
        </div>
        <ol className="list-decimal list-inside space-y-1 text-neutral-400 pl-1">
          <li>Open your bank app (OPay, Kuda, PalmPay, GTBank, Zenith, Access, etc.).</li>
          <li>Transfer <strong className="text-white">₦{amount.toLocaleString()}</strong> to PalmPay <strong className="text-emerald-400 font-mono">7040396575</strong>.</li>
          <li>Screenshot the successful receipt or copy the NIBSS Session ID.</li>
          <li>Upload it below and click <strong className="text-white">"I Have Paid & Verify with AI"</strong>.</li>
        </ol>
      </div>

      {/* Upload Receipt or Enter Session ID */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1.5">
            Upload Transfer Receipt (Recommended)
          </label>
          {receiptImage ? (
            <div className="relative rounded-lg border border-emerald-500/40 bg-neutral-900 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={receiptImage}
                  alt="Receipt Preview"
                  className="w-14 h-14 object-cover rounded border border-neutral-700"
                />
                <div>
                  <div className="text-xs font-medium text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Receipt Attached
                  </div>
                  <div className="text-[11px] text-neutral-400">Ready for Gemini AI audit</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptImage(null)}
                className="text-xs text-neutral-400 hover:text-red-400 px-2 py-1"
              >
                Change
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-neutral-700 rounded-lg cursor-pointer bg-neutral-900/60 hover:bg-neutral-800/60 hover:border-emerald-500/50 transition">
              <div className="flex flex-col items-center justify-center pt-2 pb-2">
                <Camera className="w-7 h-7 text-neutral-400 mb-1" />
                <p className="text-xs text-neutral-300">
                  <span className="font-semibold text-emerald-400">Click to upload receipt</span> or drag & drop
                </p>
                <p className="text-[10px] text-neutral-500">PNG, JPG, WEBP from your bank app</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}
        </div>

        <div className="relative flex items-center justify-center my-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-800"></div></div>
          <span className="relative bg-neutral-950 px-2 text-[10px] uppercase tracking-wider text-neutral-500">or enter reference</span>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1">
            NIBSS Session ID / Bank Reference
          </label>
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="e.g. 999991240101123456789012345678"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1">
            Sender Account Name (Optional)
          </label>
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="e.g. Your name on your bank app"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* AI Scan Status Banner */}
      {isVerifying && (
        <div className="rounded-lg bg-emerald-950/50 border border-emerald-500/40 p-3 flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
          <div className="text-xs text-emerald-300 font-medium">{scanStep}</div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        disabled={isVerifying || (!receiptImage && !sessionId.trim())}
        onClick={handleVerify}
        className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-neutral-950 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition"
      >
        {isVerifying ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>AI Verifying Transfer...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>I Have Paid & Verify with AI</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isVerifying}
          className="w-full py-2 text-xs text-neutral-400 hover:text-white transition"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
