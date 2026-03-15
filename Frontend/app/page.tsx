"use client"

import Link from "next/link"
import { ArrowRight, Zap, Maximize, Settings, MessageSquare, LayoutGrid } from "lucide-react"

export default function HomeLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 text-amber-950 font-sans">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-6xl mx-auto">
        <div className="font-bold text-2xl tracking-tighter text-amber-900">VaastuGPT</div>
        <div className="space-x-4 flex items-center">
          <Link href="/chat" className="text-sm font-medium hover:text-amber-600 transition-colors hidden sm:inline-block">
            Chat UI
          </Link>
          <Link href="/manual" className="text-sm font-medium hover:text-amber-600 transition-colors hidden sm:inline-block">
            Manual UI
          </Link>
          <Link 
            href="#waitlist" 
            className="px-4 py-2 bg-amber-900 text-amber-50 rounded-full text-sm font-medium hover:bg-amber-800 transition-colors ml-4"
          >
            Join Waitlist
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-3xl mx-auto space-y-8">
          <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100/50 px-3 py-1 text-sm font-medium text-amber-800 mb-4">
            <span className="flex h-2 w-2 rounded-full bg-amber-600 mr-2"></span>
            Private Beta v1.0
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-amber-950 leading-tight">
            AI-Powered Floor Plans in <span className="text-amber-600">Seconds</span>
          </h1>
          
          <p className="text-xl text-amber-800 font-medium tracking-wide leading-relaxed">
            Stop waiting weeks for architects to draft initial ideas. Generate optimized, beautiful floor plans tailored to your exact requirements instantly.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link 
              href="/chat" 
              className="flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              <MessageSquare className="mr-2 w-5 h-5" />
              Try Chat Assistant
            </Link>
            <Link 
              href="/manual" 
              className="flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-white border-2 border-amber-200 text-amber-900 font-semibold rounded-lg hover:bg-amber-50 transition-all hover:-translate-y-1"
            >
              <LayoutGrid className="mr-2 w-5 h-5 text-amber-700" />
              Manual Builder
            </Link>
          </div>
        </div>

        {/* Features Preview */}
        <div className="grid md:grid-cols-3 gap-8 py-24 mt-12 border-t border-amber-200/50 relative">
          <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Lightning Fast</h3>
            <p className="text-amber-800 leading-relaxed">Skip the long drafting processes. VaastuGPT generates high-quality functional layouts in a matter of seconds.</p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6">
              <Maximize className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Spatially Optimized</h3>
            <p className="text-amber-800 leading-relaxed">Advanced models trained on thousands of successful house plans to ensure practical flow and highly usable spaces.</p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6">
              <Settings className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Fully Customizable</h3>
            <p className="text-amber-800 leading-relaxed">Specify exactly what you need—from precise square footage down to the number of bedrooms and garage capacities.</p>
          </div>
        </div>

        {/* Waitlist Section */}
        <div id="waitlist" className="max-w-md mx-auto bg-amber-900 rounded-3xl p-8 sm:p-12 text-center text-amber-50 shadow-2xl mt-12">
          <h2 className="text-3xl font-bold mb-4">Get Early Access</h2>
          <p className="text-amber-200/80 mb-8">Join the waitlist to get notified when we launch our full generative AI model and premium features.</p>
          <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
            <input 
              type="email" 
              placeholder="Enter your email address" 
              className="px-4 py-3 rounded-xl bg-amber-950/50 border border-amber-700/50 text-white placeholder:text-amber-500/50 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              required
            />
            <button 
              type="submit"
              className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold rounded-xl transition-colors"
            >
              Join Waitlist
            </button>
          </form>
          <p className="text-xs text-amber-500/60 mt-4">We respect your privacy. No spam.</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-amber-200/50 bg-amber-50/50 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center justify-center text-amber-700/70">
          <div className="font-bold text-xl tracking-tighter text-amber-900/50 mb-4">VaastuGPT</div>
          <p>© 2026 VaastuGPT. All rights reserved.</p>
          <p className="text-sm mt-2">Built for fast architectural ideation.</p>
        </div>
      </footer>
    </div>
  )
}
