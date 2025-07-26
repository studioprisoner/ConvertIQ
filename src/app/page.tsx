"use client";

import { useState } from "react";
import {
  ArrowRightIcon,
  CheckIcon,
  SparklesIcon,
  ChartBarIcon,
  LightBulbIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { CompanyIcon } from "@/components/company-logo";

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
    <div className="relative bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl p-6 hover:bg-white/90 transition-all duration-300 shadow-lg">
      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-700 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

const PricingCard = ({
  plan,
  price,
  features,
  popular = false,
  delay = 0,
}: {
  plan: string;
  price: string;
  features: string[];
  popular?: boolean;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className={`relative ${popular ? "scale-105" : ""}`}
  >
    {popular && (
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium px-4 py-1 rounded-full">
          Most Popular
        </span>
      </div>
    )}
    <div
      className={`relative bg-white/90 backdrop-blur-sm border ${popular ? "border-blue-300" : "border-gray-200"} rounded-xl p-6 hover:bg-white transition-all duration-300 shadow-lg`}
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan}</h3>
      <div className="mb-6">
        <span className="text-3xl font-bold text-gray-900">{price}</span>
        {price !== "Free" && <span className="text-gray-600">/month</span>}
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center text-gray-700">
            <CheckIcon className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      <button
        className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
          popular
            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
            : "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200"
        }`}
      >
        Get Started
      </button>
    </div>
  </motion.div>
);

export default function Home() {
  const [email, setEmail] = useState("");

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle email submission
    console.log("Email submitted:", email);
    setEmail("");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-cyan-100 via-blue-200 to-indigo-300"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-blue-400/30 to-white/80"></div>

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
              href="/login"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20 text-center">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-8">
              <SparklesIcon className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-700">
                AI-Powered Conversion Optimization
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              Turn Your Website Into a{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Conversion Machine
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-3xl mx-auto leading-relaxed">
              Get data-driven insights and actionable recommendations that were
              once only available to enterprise companies. Transform your small
              business website with AI-powered analysis.
            </p>

            <div className="flex justify-center mb-12">
              <a
                href="/login"
                className="group bg-blue-600 text-white hover:bg-blue-700 font-semibold py-4 px-8 rounded-xl transition-all duration-300 text-lg flex items-center shadow-lg"
              >
                Get Started
                <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            <div className="flex items-center justify-center space-x-8 text-gray-600 text-sm">
              <div className="flex items-center">
                <CheckIcon className="w-4 h-4 text-blue-600 mr-2" />
                Instant AI analysis
              </div>
              <div className="flex items-center">
                <CheckIcon className="w-4 h-4 text-blue-600 mr-2" />
                Actionable recommendations
              </div>
              <div className="flex items-center">
                <CheckIcon className="w-4 h-4 text-blue-600 mr-2" />
                Cancel anytime
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 py-20">
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
      <section className="relative z-10 px-6 py-20">
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
              <div className="bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl p-8 shadow-lg">
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

              <div className="bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl p-8 shadow-lg">
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

              <div className="bg-white/80 backdrop-blur-sm border border-blue-200/50 rounded-xl p-8 shadow-lg">
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
      <section id="pricing" className="relative z-10 px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Choose the plan that's right for your business. Start optimizing
              your conversions today.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <PricingCard
              plan="Basic Plan"
              price="$19"
              features={[
                "1 domain per account",
                "Unlimited scans",
                "AI-powered analysis & reporting",
                "Conversion optimization insights",
                "Email support",
                "Historical data tracking",
              ]}
              delay={0.1}
            />
            <PricingCard
              plan="Pro Plan"
              price="$49"
              features={[
                "Up to 10 domains",
                "Unlimited scans",
                "Advanced AI analysis",
                "Priority support",
                "Custom recommendations",
                "Export reports (PDF)",
                "Multi-website support",
              ]}
              popular={true}
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/90 backdrop-blur-sm border border-blue-200/50 rounded-2xl p-12 shadow-xl"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Ready to boost your conversions?
            </h2>
            <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
              Join thousands of small businesses that have transformed their
              websites with ConvertIQ's AI-powered optimization.
            </p>

            <form
              onSubmit={handleEmailSubmit}
              className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto mb-6"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-semibold py-3 px-8 rounded-lg transition-all duration-300"
              >
                Get Started
              </button>
            </form>

            <p className="text-sm text-gray-600">
              Get started today and transform your website conversions.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12">
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
                href="/contact"
                className="hover:text-gray-800 transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8  text-center text-gray-600">
            <p>
              &copy; 2024 ConvertIQ. All rights reserved. Transform your website
              into a conversion machine.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
