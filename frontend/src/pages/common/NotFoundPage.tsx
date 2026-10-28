import React from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, BookOpen, Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 animate-fade-in">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gold-500/10 border border-gold-500/20 text-gold-500 mb-2">
          <span className="font-display font-extrabold text-3xl">404</span>
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-dark-900">
            Page Not Found
          </h1>
          <p className="text-dark-500 text-sm max-w-sm mx-auto">
            The material listing, upcycling guide, or page you were looking for has moved or does not exist.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/marketplace"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-dark-900 font-bold text-sm transition-all shadow-md shadow-gold-500/20"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Browse Materials</span>
          </Link>

          <Link
            to="/learn"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-cream-100 hover:bg-cream-200 text-dark-800 font-semibold text-sm transition-colors border border-cream-300"
          >
            <BookOpen className="w-4 h-4" />
            <span>Reva Learn Guides</span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-dark-600 hover:text-dark-900 font-medium text-sm transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </div>

        <div className="pt-6 border-t border-cream-200">
          <p className="text-xs text-dark-400">
            Looking for something specific? Trade plastics, fabric offcuts, timber, and cardboard on <Link to="/marketplace" className="text-gold-600 font-medium underline">Reva Marketplace</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
