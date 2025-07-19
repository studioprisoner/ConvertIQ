export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            ConvertIQ
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8">
            AI-Powered Conversion Optimization for Small Businesses
          </p>
          <p className="text-lg text-gray-700 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            Transform your website into a conversion machine with data-driven insights and actionable recommendations that were once only available to enterprise companies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg text-center">
              Sign In / Get Early Access
            </a>
            <button className="border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 px-8 rounded-lg transition-colors text-lg">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Why Choose ConvertIQ?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">AI-Powered Analysis</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Advanced AI analyzes your website for conversion opportunities using proven psychology principles and UX best practices.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Actionable Recommendations</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Get specific, prioritized recommendations with step-by-step implementation guides that you can act on immediately.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Track Your Progress</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Monitor your improvements over time with detailed analytics and see the real impact of your optimization efforts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="px-6 py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">
            Perfect for Growing Businesses
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Local Services</h3>
              <p className="text-gray-600 dark:text-gray-400">Plumbers, electricians, consultants, and beauty salons</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Creative Businesses</h3>
              <p className="text-gray-600 dark:text-gray-400">Photographers, designers, content creators, and artists</p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">E-commerce Stores</h3>
              <p className="text-gray-600 dark:text-gray-400">Online retailers selling physical or digital products</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-blue-600 dark:bg-blue-800 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Boost Your Conversions?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join the waitlist and be among the first to transform your website into a conversion powerhouse.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button className="bg-white text-blue-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors">
              Get Early Access
            </button>
          </div>
          <p className="text-sm mt-4 opacity-75">
            No spam, unsubscribe anytime. We respect your privacy.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 bg-gray-900 text-gray-400 text-center">
        <p>&copy; 2024 ConvertIQ. All rights reserved.</p>
      </footer>
    </div>
  );
}
