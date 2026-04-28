"use client"

import { motion } from "framer-motion"

interface ResultSectionProps {
  imageUrl: string
  onReset: () => void
}

export default function ResultSection({ imageUrl, onReset }: ResultSectionProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "floor-plan.png"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto">
      <div className="space-y-6">
        {/* Image container with subtle border */}
        <div className="relative backdrop-blur-md bg-white/40 border border-amber-200 rounded-lg overflow-hidden shadow-lg aspect-video">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-orange-50/30 pointer-events-none z-10" />

          {/* Image */}
          <div className="relative w-full h-full">
            <img
              src={imageUrl || "/placeholder.svg"}
              alt="Generated floor plan"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Border glow */}
          <div className="absolute inset-0 border border-amber-200/50 rounded-lg pointer-events-none z-20" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 justify-center">
          <motion.button
            onClick={handleDownload}
            className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Download Floor Plan
          </motion.button>

          <motion.button
            onClick={onReset}
            className="px-8 py-3 bg-white border border-amber-300 text-amber-950 font-semibold text-sm rounded-lg hover:bg-amber-50 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Create Another
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
