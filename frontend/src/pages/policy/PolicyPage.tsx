import React from 'react'
import { Shield, AlertOctagon, CheckCircle2, Flag, Scale, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-10">
      {/* Header */}
      <div className="border-b border-cream-200 pb-8 text-center sm:text-left space-y-3">
        <div className="inline-flex items-center gap-2 bg-gold-100 text-gold-800 px-3 py-1 rounded-full text-xs font-semibold">
          <Shield className="w-3.5 h-3.5" />
          <span>Trust, Safety & Governance</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-dark-900">
          Reva Hub Trust, Safety and Acceptable Use Policy
        </h1>
        <p className="text-sm text-dark-600">
          Effective Version: <strong className="text-dark-900 font-mono">1.0</strong> · Last updated: October 2026 · Applies to all buyers, sellers, and Reva Hub Learn contributors
        </p>
      </div>

      {/* Mandatory User Agreement Notice */}
      <div className="bg-amber-50 border-l-4 border-gold-500 p-5 rounded-r-2xl space-y-2">
        <h2 className="font-bold text-sm text-amber-900 flex items-center gap-2">
          <Scale className="w-4 h-4 text-gold-600" />
          Mandatory User Agreement
        </h2>
        <p className="text-xs text-amber-800 leading-relaxed">
          Every registered user agrees to this policy upon account creation. Reva Hub reserves the right to review listings, restrict transactions, preserve evidence, suspend or terminate accounts, and cooperate with law enforcement authorities in Nigeria to prevent harm and unlawful trading.
        </p>
      </div>

      {/* Section 1: Prohibited Activities */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-cream-200 pb-2">
          <AlertOctagon className="w-5 h-5 text-red-600" />
          <h2 className="font-display text-xl font-bold text-dark-900">1. Prohibited Activities</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
            <h3 className="font-bold text-sm text-dark-900">Fraud and Deception</h3>
            <p className="text-xs text-dark-600 leading-relaxed">
              Fake accounts, impersonation, falsified identities, dishonest price manipulation, fake payment receipts, or deliberately misrepresenting materials, quantities, quality, or ownership.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
            <h3 className="font-bold text-sm text-dark-900">Illegal Materials & Stolen Property</h3>
            <p className="text-xs text-dark-600 leading-relaxed">
              Listing, buying or selling stolen goods, illegally obtained materials, prohibited substances, or hazardous waste (e.g. hazardous battery chemicals, medical waste) in violation of applicable laws in Nigeria.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
            <h3 className="font-bold text-sm text-dark-900">Payment Abuse & Off-Platform Scams</h3>
            <p className="text-xs text-dark-600 leading-relaxed">
              Exploiting payment systems, fraudulent chargebacks, refund manipulation, unauthorized transactions, or demanding off-platform untracked cash advances. Legitimate disputes and accidental overpayments are not automatically considered fraud.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
            <h3 className="font-bold text-sm text-dark-900">Harassment & Discrimination</h3>
            <p className="text-xs text-dark-600 leading-relaxed">
              Threats, stalking, bullying, blackmail, hate-based harassment, sexual harassment, or intimidation. Users must respect physical privacy and personal boundaries during collections and meetups.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
            <h3 className="font-bold text-sm text-dark-900">Cyber Abuse & Privacy Violations</h3>
            <p className="text-xs text-dark-600 leading-relaxed">
              Account theft, unauthorized access, sharing private contact/personal information without lawful basis, malicious links, phishing, or attempting to disrupt or scrape the platform.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
            <h3 className="font-bold text-sm text-dark-900">Content Abuse on Reva Hub Learn</h3>
            <p className="text-xs text-dark-600 leading-relaxed">
              Plagiarized or unlawfully copied tutorials, impersonating instructors, distributing malware, non-consensual content, or posting misleading educational material designed to defraud or physically endanger learners.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Enforcement Levels */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-cream-200 pb-2">
          <Scale className="w-5 h-5 text-gold-600" />
          <h2 className="font-display text-xl font-bold text-dark-900">2. Proportional Enforcement Levels</h2>
        </div>
        <p className="text-xs text-dark-600">
          Enforcement is proportionate to the severity of the violation, credible evidence, and account history. These levels are operational guidelines, not a mandatory rigid sequence:
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-white border border-cream-200 flex gap-3">
            <span className="font-bold text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded h-fit">Level 1</span>
            <div>
              <h4 className="text-sm font-bold text-dark-900">Formal Warning</h4>
              <p className="text-xs text-dark-600">Applied for minor, first-time infractions that can be corrected safely (e.g. incorrect unit selection, minor category mistake).</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-cream-200 flex gap-3">
            <span className="font-bold text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded h-fit">Level 2</span>
            <div>
              <h4 className="text-sm font-bold text-dark-900">Content Removal or Temporary Restriction</h4>
              <p className="text-xs text-dark-600">Applied for repeated minor violations, misleading listings, spam, suspicious price anomalies, or activity under investigation.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-cream-200 flex gap-3">
            <span className="font-bold text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded h-fit">Level 3</span>
            <div>
              <h4 className="text-sm font-bold text-dark-900">Account Suspension or Termination</h4>
              <p className="text-xs text-dark-600">Applied for serious fraud, harassment, repeated abuse, dealing in stolen goods, or deliberate circumvention of platform safety measures.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-cream-200 flex gap-3">
            <span className="font-bold text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded h-fit">Level 4</span>
            <div>
              <h4 className="text-sm font-bold text-dark-900">Urgent Protective Action & Law Enforcement Referral</h4>
              <p className="text-xs text-dark-600">Credible threats of physical violence, serious criminal exploitation, or large-scale illegal waste dumping. Immediate account lock, evidence preservation, and formal escalation to competent Nigerian authorities.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Technical Controls & Appeals */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-cream-200 pb-2">
          <Lock className="w-5 h-5 text-green-700" />
          <h2 className="font-display text-xl font-bold text-dark-900">3. Technical Controls and Human Appeals</h2>
        </div>
        <div className="space-y-3 text-xs text-dark-700 leading-relaxed bg-white p-5 rounded-2xl border border-cream-200">
          <p>
            <strong>Automated AI Screening:</strong> Every new and edited listing passes through an automated compliance review that flags prohibited substances, hazardous waste, and price irregularities against verified benchmark ranges. AI never automatically bans a user; flagged listings enter a human admin moderation queue.
          </p>
          <p>
            <strong>Right to Appeal:</strong> If your listing or account was restricted, you have the right to a human review. You can submit an appeal through your account settings or listing notification screen with supporting documents.
          </p>
          <p>
            <strong>Evidence Preservation:</strong> Moderation logs and transaction histories are securely archived for auditability, dispute resolution, and legitimate law enforcement cooperation requests.
          </p>
        </div>
      </section>

      {/* Related Links */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-cream-200 text-xs text-dark-600">
        <div className="flex items-center gap-4">
          <Link to="/terms" className="hover:text-gold-600 underline">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-gold-600 underline">Privacy Policy</Link>
          <Link to="/premium" className="hover:text-gold-600 underline">Reva Hub Premium</Link>
        </div>
        <p>© {new Date().getFullYear()} Reva Hub Nigeria. All rights reserved.</p>
      </div>
    </div>
  )
}
