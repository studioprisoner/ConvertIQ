import type React from 'react'
import { CompanyIcon } from '@/components/common/company-logo'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Gradient Background - matching marketing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-cyan-100 via-blue-200 to-indigo-300 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-blue-400/30 to-white/80 dark:from-blue-500/20 dark:to-gray-900/80"></div>

      {/* Animated background elements - matching marketing page */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-200/30 dark:bg-cyan-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-300/25 dark:bg-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-300/20 dark:bg-indigo-400/15 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Logo */}
      <div className="absolute top-6 left-6 z-10">
        <a href="/" className="flex items-center space-x-3">
          <CompanyIcon width={36} height={36} className="flex-shrink-0" />
          <span className="text-2xl font-bold font-mono text-gray-800 dark:text-gray-100">
            ConvertIQ
          </span>
        </a>
      </div>

      {/* Auth Form Container */}
      <div className="relative z-10 w-full max-w-md mx-auto p-6">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-blue-200/50 dark:border-gray-600/50 rounded-2xl p-8 shadow-xl">
          {children}
        </div>
      </div>
    </main>
  )
}
