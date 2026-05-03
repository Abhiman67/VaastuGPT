"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import ChatbotPanel from "@/components/chatbot-panel"
import LoadingState from "@/components/loading-state"
import { LayoutGrid, Download } from "lucide-react"
import Link from "next/link"

export default function ChatPage() {
  const [state, setState] = useState<"idle" | "loading" | "options" | "result">("idle")
  const [formData, setFormData] = useState({
    sq_ft: 2500,
    bedrooms: 3,
    bathrooms: 2,
    garage: 2,
  })
  const [imageUrl, setImageUrl] = useState<string>("")
  const [options, setOptions] = useState<any[]>([])
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0)
  const [refinePrompt, setRefinePrompt] = useState<string>("")
  const [isRefining, setIsRefining] = useState(false)
  const [refineError, setRefineError] = useState<string | null>(null)

  const handleSubmit = async (data: any) => {
    setFormData(data)
    setState("loading")

    try {
      const response = await fetch("http://127.0.0.1:5001/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, strategy: "knn", count: 4 }),
      })

      if (!response.ok) throw new Error("Generation failed")

      const result = await response.json()
      const knnOptions = Array.isArray(result.options) ? result.options : []
      setOptions(knnOptions)
      setSelectedOptionIndex(0)
      setImageUrl(knnOptions[0]?.image_url || result.image_url || "")

      // Simulate loading time for visual effect
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setState(knnOptions.length > 0 ? "options" : "result")
    } catch (error) {
      console.error("Error:", error)
      setState("idle")
    }
  }

  const handleReset = () => {
    setState("idle")
    setImageUrl("")
    setOptions([])
    setSelectedOptionIndex(0)
    setRefinePrompt("")
    setRefineError(null)
    setIsRefining(false)
  }

  const selectedOption = options[selectedOptionIndex]

  const handlePickOption = (option: any, index: number) => {
    setSelectedOptionIndex(index)
    setImageUrl(option?.image_url || "")
    setRefinePrompt("")
    setRefineError(null)
    setState("result")
  }

  const handleRefine = async () => {
    if (!imageUrl) return
    if (!refinePrompt.trim()) {
      setRefineError("Enter a refinement prompt.")
      return
    }

    setIsRefining(true)
    setRefineError(null)

    try {
      const response = await fetch("http://127.0.0.1:5001/refine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: imageUrl,
          prompt: refinePrompt,
        }),
      })

      const json = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(json?.error || "Refine failed")
      }

      if (json?.image_url) setImageUrl(json.image_url)
    } catch (error: any) {
      console.error("Refine error:", error)
      setRefineError(error?.message || "Refine failed")
    } finally {
      setIsRefining(false)
    }
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#fdfaf6] text-amber-950 font-sans overflow-hidden">
      {/* Top Navbar Studio Style */}
      <header className="h-[60px] border-b border-amber-200 bg-white flex items-center justify-between px-6 shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center gap-3">
          <div className="bg-[#f2f0eb] p-2 rounded-lg text-amber-700">
            <LayoutGrid size={20} />
          </div>
          <h1 className="font-semibold text-[15px] tracking-tight text-gray-800">Make My Home Studio — Chat Mode</h1>
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
        
        {/* Left Sidebar - Chat & Tools */}
        <aside className="w-[380px] xl:w-[420px] bg-white border-r border-[#e8e6e1] flex flex-col shrink-0 z-10">
          <div className="flex-1 overflow-hidden relative flex flex-col">
            <div className="h-full w-full">
               <ChatbotPanel onSubmit={handleSubmit} />
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
                   Use the AI Chat on the left to describe your floor plan layout.
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

            {state === "options" && (
              <motion.div
                key="options"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="z-10 w-full h-full p-10 flex items-center justify-center"
              >
                <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#e8e6e1] overflow-hidden flex flex-col p-6">
                  <div className="flex justify-between items-center mb-6 px-2">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Pick a KNN Candidate</h3>
                      <p className="text-xs text-gray-500 font-medium mt-1">
                        Based on {formData.sq_ft} sq ft • {formData.bedrooms} Beds • {formData.bathrooms} Baths
                      </p>
                    </div>
                    <button onClick={handleReset} className="text-sm font-medium text-gray-500 hover:text-gray-900 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all">
                      Clear Canvas
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-y-auto pr-1">
                    {options.map((option, index) => (
                      <button
                        key={`${option?.details?.filename || index}-${index}`}
                        onClick={() => handlePickOption(option, index)}
                        className={`text-left rounded-xl border p-3 transition-all ${selectedOptionIndex === index ? "border-gray-900 shadow-md" : "border-gray-200 hover:border-gray-400"}`}
                      >
                        <div className="aspect-[4/3] bg-[#fbfaf8] rounded-lg border border-gray-100 overflow-hidden flex items-center justify-center">
                          <img
                            src={option?.image_url || "/placeholder.svg"}
                            alt={`KNN option ${index + 1}`}
                            className="w-full h-full object-contain mix-blend-multiply"
                          />
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-800">Option {index + 1}</h4>
                            <span className="text-[11px] text-gray-500">Dist {option?.details?.distance?.toFixed?.(3) ?? "-"}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {option?.details?.sq_ft} sq ft • {option?.details?.bedrooms} Beds • {option?.details?.bathrooms} Baths
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1 break-all">{option?.details?.filename}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
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
                      <h3 className="text-lg font-bold text-gray-800">Refine Selected Plan</h3>
                      <p className="text-xs text-gray-500 font-medium mt-1">
                        {selectedOption?.details?.filename ? `Selected ${selectedOption.details.filename} • now describe the redesign you want` : `Based on ${formData.sq_ft} sq ft • ${formData.bedrooms} Beds • ${formData.bathrooms} Baths`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setState("options")}
                        className="text-sm font-medium text-gray-500 hover:text-gray-900 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all"
                      >
                        Back to Options
                      </button>
                      <button onClick={handleReset} className="text-sm font-medium text-gray-500 hover:text-gray-900 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all">
                        Clear Canvas
                      </button>
                    </div>
                  </div>

                  <div className="mx-2 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Picked a KNN option. Now enter a refinement prompt and send it to Nano Banana to redesign this layout.
                  </div>

                  <div className="mb-4 px-2">
                    <div className="flex items-start gap-3">
                      <textarea
                        value={refinePrompt}
                        onChange={(e) => setRefinePrompt(e.target.value)}
                        placeholder='Describe the redesign (e.g., "Make it cleaner, add labels, keep the room positions the same")'
                        className="w-full min-h-[44px] max-h-[120px] resize-y text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      />
                      <button
                        onClick={handleRefine}
                        disabled={isRefining || !refinePrompt.trim()}
                        className="shrink-0 h-[44px] px-4 text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-900 rounded-lg transition-colors"
                      >
                        {isRefining ? "Redesigning…" : "Send to Nano Banana"}
                      </button>
                    </div>
                    {refineError && <p className="text-xs text-red-600 mt-2">{refineError}</p>}
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