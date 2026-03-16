"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import InputPanel from "@/components/input-panel"
import LoadingState from "@/components/loading-state"
import { LayoutGrid, Download } from "lucide-react"
import Link from "next/link"

export default function ManualPage() {
  const [state, setState] = useState<"idle" | "loading" | "result">("idle")
  const [formData, setFormData] = useState({
    sq_ft: 2500,
    bedrooms: 3,
    bathrooms: 2,
    garage: 2,
  })
  const [imageUrl, setImageUrl] = useState<string>("")

  const handleSubmit = async (data: any) => {
    setFormData(data)
    setState("loading")

    try {
      const response = await fetch("http://127.0.0.1:5001/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Generation failed")

      const result = await response.json()
      setImageUrl(result.image_url)

      // Simulate loading time for visual effect
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setState("result")
    } catch (error) {
      console.error("Error:", error)
      setState("idle")
    }
  }

  const handleReset = () => {
    setState("idle")
    setImageUrl("")
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#fdfaf6] text-amber-950 font-sans overflow-hidden">
      {/* Top Navbar Studio Style */}
      <header className="h-[60px] border-b border-amber-200 bg-white flex items-center justify-between px-6 shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center gap-3">
          <div className="bg-[#f2f0eb] p-2 rounded-lg text-amber-700">
            <LayoutGrid size={20} />
          </div>
          <h1 className="font-semibold text-[15px] tracking-tight text-gray-800">Make My Home Studio — Manual Mode</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {state === "result" && (
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 rounded-full transition-colors shadow-sm">
              <Download size={16} />
              Export
            </button>
          )}
          <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            Exit Studio
          </Link>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Left Sidebar - Tools */}
        <aside className="w-[380px] xl:w-[420px] bg-white border-r border-[#e8e6e1] flex flex-col shrink-0 z-10">
          <div className="flex-1 overflow-hidden relative flex flex-col">
            <div className="p-6 h-full overflow-y-auto">
               <InputPanel onSubmit={handleSubmit} />
            </div>
          </div>
        </aside>

        {/* Center Canvas Area */}
        <section className="flex-1 bg-[#f9f8f5] flex flex-col relative overflow-hidden items-center justify-center">
          {/* subtle dots pattern */}
          <div className="absolute inset-0 opacity-[0.4] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#d1cfc7 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
          </div>

          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0 }}
                className="text-center z-10 flex flex-col items-center bg-white/70 backdrop-blur-md p-10 rounded-3xl border border-gray-200/50 shadow-sm"
              >
                 <div className="w-16 h-16 bg-[#f4f2ed] rounded-full flex items-center justify-center mb-5 text-gray-400">
                    <LayoutGrid size={28} />
                 </div>
                 <h2 className="text-xl font-bold text-gray-800 mb-2">Canvas Empty</h2>
                 <p className="text-sm text-gray-500 max-w-[280px] leading-relaxed">
                   Enter your constraints on the left to generate a layout.
                 </p>
              </motion.div>
            )}

            {state === "loading" && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="z-10 w-full max-w-2xl px-8"
              >
                <LoadingState />
              </motion.div>
            )}

            {state === "result" && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="z-10 w-full h-full p-12 flex items-center justify-center"
              >
                <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#e8e6e1] overflow-hidden flex flex-col p-6">
                  <div className="flex justify-between items-center mb-6 px-2">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Generated Floor Plan</h3>
                      <p className="text-xs text-gray-500 font-medium mt-1">
                        Based on {formData.sq_ft} sq ft • {formData.bedrooms} Beds • {formData.bathrooms} Baths
                      </p>
                    </div>
                    <button onClick={handleReset} className="text-sm font-medium text-gray-500 hover:text-gray-900 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all">
                      Clear Canvas
                    </button>
                  </div>
                  <div className="flex-1 bg-[#fbfaf8] border border-gray-100 rounded-lg p-2 flex items-center justify-center min-h-[500px]">
                    <img
                      src={imageUrl || "/placeholder.svg"}
                      alt="Generated floor plan"
                      className="max-w-full max-h-full object-contain mix-blend-multiply"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  )
}