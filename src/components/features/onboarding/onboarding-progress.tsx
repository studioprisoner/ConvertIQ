'use client';

import { motion } from 'framer-motion';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { CheckIcon } from '@heroicons/react/24/outline';

export type OnboardingStep = "plan-selection" | "domain-setup" | "complete";

interface Step {
  id: OnboardingStep;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

interface OnboardingProgressProps {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
}

export function OnboardingProgress({ currentStep, completedSteps }: OnboardingProgressProps) {
  const steps: Step[] = [
    {
      id: "plan-selection",
      title: "Choose Plan",
      description: "Select your subscription",
      completed: completedSteps.includes("plan-selection"),
      current: currentStep === "plan-selection",
    },
    {
      id: "domain-setup",
      title: "Domain Setup", 
      description: "Add your primary domain",
      completed: completedSteps.includes("domain-setup"),
      current: currentStep === "domain-setup",
    },
    {
      id: "complete",
      title: "Complete",
      description: "You're all set!",
      completed: completedSteps.includes("complete"),
      current: currentStep === "complete",
    },
  ];

  return (
    <motion.div
      className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <motion.div
                className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
                  step.completed
                    ? 'bg-green-100 dark:bg-green-900/20 border-2 border-green-500'
                    : step.current
                    ? 'bg-blue-100 dark:bg-blue-900/20 border-2 border-blue-500'
                    : 'bg-zinc-100 dark:bg-zinc-700 border-2 border-zinc-300 dark:border-zinc-600'
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                {step.completed ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </motion.div>
                ) : step.current ? (
                  <motion.div
                    className="w-4 h-4 bg-blue-600 dark:bg-blue-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                ) : (
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {index + 1}
                  </span>
                )}
              </motion.div>

              {/* Step details */}
              <motion.div
                className="mt-3 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.2, duration: 0.3 }}
              >
                <p className={`text-sm font-medium ${
                  step.current
                    ? 'text-blue-600 dark:text-blue-400'
                    : step.completed
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-24">
                  {step.description}
                </p>
              </motion.div>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <motion.div
                className={`w-20 h-0.5 mx-4 transition-colors duration-300 ${
                  step.completed
                    ? 'bg-green-500'
                    : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <motion.div
        className="mt-6 bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-green-500"
          initial={{ width: 0 }}
          animate={{ 
            width: `${(completedSteps.length / steps.length) * 100}%` 
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </motion.div>

      {/* Progress text */}
      <motion.p
        className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        {completedSteps.length} of {steps.length} steps completed
      </motion.p>
    </motion.div>
  );
}