"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

const STEPS = ["Analyzing space...", "Generating layout...", "Optimizing design...", "Finalizing plan..."]

export default function LoadingState() {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= STEPS.length - 1) return STEPS.length - 1
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto">
      <div className="relative backdrop-blur-md bg-white/40 border border-amber-200 rounded-lg p-12 shadow-lg">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-orange-50/30 rounded-lg pointer-events-none" />

        <div className="relative z-10 space-y-8">
          {/* Status header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-semibold text-sm text-amber-700">GENERATING</span>
            </div>
            <h2 className="text-lg text-amber-950 font-semibold">Creating Your Floor Plan...</h2>
          </div>

          <div className="space-y-2">
            <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
                initial={{ width: "0%" }}
                animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                transition={{
                  duration: 0.6,
                  ease: "easeOut",
                }}
              />
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-xs text-amber-600">PROCESSING</span>
              <span className="font-medium text-xs text-amber-600">
                {Math.round(((currentStep + 1) / STEPS.length) * 100)}%
              </span>
            </div>
          </div>

          {/* Step display */}
          <div className="space-y-3">
            {STEPS.map((step, index) => (
              <motion.div
                key={step}
                className="flex items-center gap-3"
                animate={{
                  opacity: currentStep === index ? 1 : 0.3,
                  x: currentStep === index ? 8 : 0,
                }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${
                    currentStep === index ? "bg-amber-500" : "bg-amber-200"
                  }`}
                />
                <span
                  className={`text-sm font-medium transition-colors ${
                    currentStep === index ? "text-amber-900" : "text-amber-600"
                  }`}
                >
                  {step}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
