"use client"

import { motion } from "framer-motion"

export default function HeroSection() {
  return (
    <div className="relative py-24 flex flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-white border-b border-amber-100">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(217, 119, 6, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(217, 119, 6, 0.1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <motion.div
        className="relative z-10 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h1
          className="text-5xl md:text-7xl font-bold tracking-tight mb-4 text-amber-950"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          Make My Home
        </motion.h1>
        <motion.p
          className="text-sm tracking-widest text-amber-600 mb-6 font-bold uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          AI-Powered Floor Plan Generation
        </motion.p>
        <motion.p
          className="text-lg md:text-xl text-amber-800 font-medium max-w-2xl mx-auto tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          Generate optimized, beautiful floor plans tailored to your exact requirements in seconds. Select your square footage, bedrooms, and amenities to get started.
        </motion.p>
      </motion.div>

      {/* Bottom accent line */}
      <motion.div
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent w-1/2"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
      />
    </div>
  )
}
