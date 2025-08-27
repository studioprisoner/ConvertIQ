'use client';

import { motion } from 'framer-motion';
import { CompanyIcon } from '@/components/common/company-logo';
import { SparklesIcon, RocketLaunchIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export function WelcomeHero() {
  const features = [
    {
      icon: RocketLaunchIcon,
      title: "AI-Powered Analysis",
      description: "Get instant insights on your website's conversion potential"
    },
    {
      icon: ChartBarIcon,
      title: "Actionable Reports", 
      description: "Detailed recommendations to improve your conversion rates"
    },
    {
      icon: SparklesIcon,
      title: "Real-Time Monitoring",
      description: "Track your optimization progress over time"
    }
  ];

  return (
    <motion.div
      className="text-center space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Logo and Title */}
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <motion.div
          className="flex justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.3
          }}
        >
          <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full">
            <CompanyIcon width={64} height={64} />
          </div>
        </motion.div>

        <div className="space-y-4">
          <motion.h1
            className="text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Welcome to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ConvertIQ
            </span>
          </motion.h1>

          <motion.p
            className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Let's get your account set up so you can start optimizing your website's 
            conversion rate with AI-powered insights.
          </motion.p>
        </div>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            className="bg-white dark:bg-zinc-800 rounded-lg p-6 border border-zinc-200 dark:border-zinc-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
            whileHover={{ 
              scale: 1.05,
              transition: { duration: 0.2 }
            }}
          >
            <motion.div
              className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4"
              whileHover={{ rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </motion.div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Success metrics */}
      <motion.div
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl p-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.9 }}
      >
        <motion.div
          className="grid grid-cols-3 gap-4 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <div>
            <motion.div
              className="text-2xl font-bold text-blue-600 dark:text-blue-400"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 1.1 }}
            >
              98%
            </motion.div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Accuracy Rate
            </div>
          </div>
          <div>
            <motion.div
              className="text-2xl font-bold text-green-600 dark:text-green-400"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 1.2 }}
            >
              2.5x
            </motion.div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Avg. Conversion Lift
            </div>
          </div>
          <div>
            <motion.div
              className="text-2xl font-bold text-purple-600 dark:text-purple-400"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 1.3 }}
            >
              &lt;60s
            </motion.div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Setup Time
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}