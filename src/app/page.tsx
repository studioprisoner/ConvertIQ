"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  SparklesIcon,
  ChartBarIcon,
  LightBulbIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { motion } from "framer-motion";
import Image from "next/image";
import { CompanyIcon } from "@/components/company-logo";
import { useSession } from "@/lib/auth-client";

const FeatureCard = ({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  icon: any;
  title: string;
  description: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="relative group"
  >
    <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 rounded-xl blur-xl transition-all duration-300 group-hover:blur-2xl group-hover:scale-105"></div>
    <div className="relative bg-white/70 backdrop-blur-sm border border-blue-200/50 rounded-xl p-6 hover:bg-white/80 transition-all duration-300 shadow-lg">
      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-700 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-cyan-100 via-blue-200 to-indigo-300 pb-0">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden">
        <svg
          aria-hidden="true"
          className="absolute inset-0 -z-10 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-blue-300/20"
        >
          <defs>
            <pattern
              x="50%"
              y={-1}
              id="983e3e4c-de6d-4c3f-8d64-b9761d1534cc"
              width={200}
              height={200}
              patternUnits="userSpaceOnUse"
            >
              <path d="M.5 200V.5H200" fill="none" />
            </pattern>
          </defs>
          <svg x="50%" y={-1} className="overflow-visible fill-blue-200/30">
            <path
              d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
              strokeWidth={0}
            />
          </svg>
          <rect
            fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)"
            width="100%"
            height="100%"
            strokeWidth={0}
          />
        </svg>
        <div
          aria-hidden="true"
          className="absolute top-10 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-48 xl:left-[calc(50%-24rem)]"
        >
          <div
            style={{
              clipPath:
                "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
            }}
            className="aspect-[1108/632] w-[69.25rem] bg-gradient-to-r from-[#80caff] to-[#4f46e5] opacity-20"
          />
        </div>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-300/25 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 px-6 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CompanyIcon width={36} height={36} className="flex-shrink-0" />
              <span className="text-2xl font-bold font-mono text-gray-800">
                ConvertIQ
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                Pricing
              </a>
              <a
                href={session ? "/dashboard" : "/login"}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {session ? "Open App" : "Sign In"}
              </a>
            </div>
          </div>
        </nav>

        <div className="mx-auto max-w-7xl px-6 pt-10 pb-24 sm:pb-32 lg:flex lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl shrink-0 lg:mx-0 lg:pt-8">
            <div className="mt-24 sm:mt-32 lg:mt-16">
              <div className="inline-flex items-center space-x-6">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm/6 font-semibold text-blue-700 ring-1 ring-blue-200 ring-inset">
                  <SparklesIcon className="w-4 h-4 inline mr-2" />
                  AI-Powered Conversion Optimization
                </span>
              </div>
            </div>
            <h1 className="mt-10 text-5xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-7xl">
              Turn Your Website Into a{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Conversion Machine
              </span>
            </h1>
            <p className="mt-8 text-lg font-medium text-pretty text-gray-700 sm:text-xl/8">
              Get data-driven insights and actionable recommendations that were
              once only available to enterprise companies. Transform your small
              business website with AI-powered analysis.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <a
                href={session ? "/dashboard" : "/login"}
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {session ? "Open App" : "Get Started"}
              </a>
              <a
                href="#features"
                className="text-sm/6 font-semibold text-gray-800"
              >
                Learn more <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
          <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:mt-0 lg:mr-0 lg:ml-10 lg:max-w-none lg:flex-none xl:ml-32">
            <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
              <Image
                alt="ConvertIQ Reports Dashboard"
                src="/reports.png"
                width={2432}
                height={1442}
                className="w-[76rem] rounded-md bg-white/80 shadow-2xl ring-1 ring-gray-300/20"
                priority
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                optimize conversions
              </span>
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Our AI analyzes your website using proven psychology principles
              and UX best practices, then provides specific recommendations you
              can implement today.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={SparklesIcon}
              title="AI-Powered Analysis"
              description="Advanced AI scans your website for conversion opportunities using psychology principles and UX best practices proven to increase sales."
              delay={0.1}
            />
            <FeatureCard
              icon={LightBulbIcon}
              title="Actionable Insights"
              description="Get specific, prioritized recommendations with step-by-step implementation guides that you can act on immediately."
              delay={0.2}
            />
            <FeatureCard
              icon={ChartBarIcon}
              title="Performance Tracking"
              description="Monitor your improvements over time with detailed analytics and see the real impact of your optimization efforts."
              delay={0.3}
            />
            <FeatureCard
              icon={RocketLaunchIcon}
              title="Quick Implementation"
              description="No technical expertise required. Our recommendations come with clear instructions and code snippets where needed."
              delay={0.4}
            />
            <FeatureCard
              icon={CheckIcon}
              title="Conversion Psychology"
              description="Leverage proven psychological triggers like scarcity, social proof, and authority to boost your conversion rates."
              delay={0.5}
            />
            <FeatureCard
              icon={SparklesIcon}
              title="Mobile Optimization"
              description="Ensure your website converts on all devices with mobile-specific recommendations and responsive design insights."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="relative px-6 py-20">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12">
              Perfect for growing businesses
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white/70 backdrop-blur-sm border border-blue-200/50 rounded-xl p-8 shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔧</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Local Services
                </h3>
                <p className="text-gray-700">
                  Perfect for plumbers, electricians, consultants, beauty
                  salons, and other service-based businesses.
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm border border-blue-200/50 rounded-xl p-8 shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎨</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Creative Businesses
                </h3>
                <p className="text-gray-700">
                  Ideal for photographers, designers, content creators, artists,
                  and creative professionals.
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm border border-blue-200/50 rounded-xl p-8 shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🛒</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  E-commerce
                </h3>
                <p className="text-gray-700">
                  Great for online stores selling physical or digital products,
                  dropshipping businesses, and marketplaces.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-base font-semibold text-blue-600 mb-4">
              Pricing
            </h2>
            <p className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">
              Choose the right plan for you
            </p>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose an affordable plan that's packed with the best features for
              engaging your audience, creating customer loyalty, and driving
              sales.
            </p>
          </motion.div>
        </div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 items-center gap-y-6 sm:mt-20 sm:gap-y-0 lg:max-w-4xl lg:grid-cols-2">
          {/* Basic Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="bg-white/70 backdrop-blur-sm border border-blue-200/50 sm:mx-8 lg:mx-0 rounded-t-3xl sm:rounded-b-none lg:rounded-tr-none lg:rounded-bl-3xl rounded-3xl p-8 sm:p-10 shadow-lg"
          >
            <h3 className="text-base font-semibold text-blue-600">
              Basic Plan
            </h3>
            <p className="mt-4 flex items-baseline gap-x-2">
              <span className="text-5xl font-bold tracking-tight text-gray-900">
                $19
              </span>
              <span className="text-base text-gray-600">/month</span>
            </p>
            <p className="mt-6 text-base text-gray-700">
              Perfect for small businesses with a single website to optimize
            </p>
            <ul
              role="list"
              className="mt-8 space-y-3 text-sm text-gray-700 sm:mt-10"
            >
              <li className="flex gap-x-3">
                <CheckIcon className="h-6 w-5 flex-none text-blue-600" />1
                domain per account
              </li>
              <li className="flex gap-x-3">
                <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                Unlimited scans
              </li>
              <li className="flex gap-x-3">
                <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                AI-powered analysis & reporting
              </li>
              <li className="flex gap-x-3">
                <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                Conversion optimization insights
              </li>
              <li className="flex gap-x-3">
                <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                Email support
              </li>
              <li className="flex gap-x-3">
                <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                Historical data tracking
              </li>
            </ul>
            <a
              href={session ? "/dashboard" : "/login"}
              className="mt-8 block rounded-lg px-3.5 py-2.5 text-center text-sm font-semibold bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200 transition-all duration-300 sm:mt-10"
            >
              {session ? "Open App" : "Get started today"}
            </a>
          </motion.div>

          {/* Pro Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative bg-gradient-to-br from-blue-600 to-indigo-600 shadow-2xl rounded-3xl p-8 sm:p-10"
          >
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 text-white text-sm font-medium px-4 py-1 rounded-full shadow-lg">
                Most Popular
              </span>
            </div>
            <h3 className="text-base font-semibold text-cyan-200">Pro Plan</h3>
            <p className="mt-4 flex items-baseline gap-x-2">
              <span className="text-5xl font-bold tracking-tight text-white">
                $49
              </span>
              <span className="text-base text-blue-200">/month</span>
            </p>
            <p className="mt-6 text-base text-blue-100">
              For growing businesses managing multiple websites and domains
            </p>
            <ul
              role="list"
              className="mt-8 space-y-3 text-sm text-blue-100 sm:mt-10"
            >
              <li className="flex gap-x-3">
                <CheckIcon className="h-6 w-5 flex-none text-cyan-300" />
                Up to 10 domains
              </li>
              <li className="flex gap-x-3">
                <CheckIcon className="h-6 w-5 flex-none text-cyan-300" />
                Unlimited scans
              </li>
              <li className="flex gap-x-3">
                <CheckIcon className="h-6 w-5 flex-none text-cyan-300" />
                AI-powered analysis & reporting
              </li>
              <li className="flex gap-x-3">
                <CheckIcon className="h-6 w-5 flex-none text-cyan-300" />
                Advanced conversion optimization
              </li>
              <li className="flex gap-x-3">
                <CheckIcon className="h-6 w-5 flex-none text-cyan-300" />
                Email support
              </li>
              <li className="flex gap-x-3">
                <CheckIcon className="h-6 w-5 flex-none text-cyan-300" />
                Task management (coming soon)
              </li>
              <li className="flex gap-x-3">
                <CheckIcon className="h-6 w-5 flex-none text-cyan-300" />
                Export reports (PDF) (coming soon)
              </li>
              <li className="flex gap-x-3">
                <CheckIcon className="h-6 w-5 flex-none text-cyan-300" />
                API access (coming soon)
              </li>
            </ul>
            <a
              href={session ? "/dashboard" : "/login"}
              className="mt-8 block rounded-lg bg-white px-3.5 py-2.5 text-center text-sm font-semibold text-blue-600 hover:bg-blue-50 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-300 sm:mt-10"
            >
              {session ? "Open App" : "Get started today"}
            </a>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/70 backdrop-blur-sm border border-blue-200/50 rounded-2xl p-12 shadow-xl"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Ready to boost your conversions?
            </h2>
            <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
              Join thousands of small businesses that have transformed their
              websites with ConvertIQ's AI-powered optimization.
            </p>

            <div className="flex justify-center mb-6">
              <a
                href={session ? "/dashboard" : "/login"}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-semibold py-4 px-8 rounded-lg transition-all duration-300 text-lg shadow-lg"
              >
                {session ? "Open App" : "Get Started"}
              </a>
            </div>

            <p className="text-sm text-gray-600">
              Get started today and transform your website conversions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <CompanyIcon width={32} height={32} className="flex-shrink-0" />
              <span className="text-xl font-bold font-mono text-gray-800">
                ConvertIQ
              </span>
            </div>
            <div className="flex items-center space-x-6 text-gray-600">
              <a
                href="/privacy"
                className="hover:text-gray-800 transition-colors"
              >
                Privacy
              </a>
              <a
                href="/terms"
                className="hover:text-gray-800 transition-colors"
              >
                Terms
              </a>
              <a
                href="/changelog"
                className="hover:text-gray-800 transition-colors"
              >
                Changelog
              </a>
              <a
                href="mailto:support@convertiq.cloud"
                className="hover:text-gray-800 transition-colors"
              >
                support@convertiq.cloud
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8  text-center text-gray-600">
            <p>
              &copy; {new Date().getFullYear()} ConvertIQ. All rights reserved.
              Transform your website into a conversion machine.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
