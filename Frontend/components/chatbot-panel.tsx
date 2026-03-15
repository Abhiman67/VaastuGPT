"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Bot, CheckCircle2 } from "lucide-react"

interface ChatbotPanelProps {
  onSubmit: (data: {
    sq_ft: number
    bedrooms: number
    bathrooms: number
    garage: number
  }) => void
}

type Message = { role: "user" | "assistant"; content: string }

export default function ChatbotPanel({ onSubmit }: ChatbotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am VaastuGPT. Let's design your ideal home. About what size home are you looking for in square feet?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: input.trim() }
    const newHistory = [...messages, userMessage]
    
    setMessages(newHistory)
    setInput("")
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to communicate with AI")
      }

      const replyText = data.text

      if (replyText.includes(`"COMPLETE":`) || replyText.includes(`"COMPLETE": true`)) {
        try {
          const cleanJsonString = replyText.replace(/```json/g, "").replace(/```/g, "").trim()
          const parsed = JSON.parse(cleanJsonString)
          
          if (parsed.COMPLETE) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: "Got it! Generating your layout on the canvas..." }
            ])
            
            setTimeout(() => {
              onSubmit({
                sq_ft: parsed.sq_ft || 2000,
                bedrooms: parsed.bedrooms || 3,
                bathrooms: parsed.bathrooms || 2,
                garage: parsed.garage || 1,
              })
            }, 1000)
            return
          }
        } catch (e) {
          console.error("Failed to parse", replyText)
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: replyText }])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              key={idx} 
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex max-w-[88%] gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                  msg.role === "user" 
                    ? "bg-gray-900 text-white" 
                    : "bg-[#eaeaec] text-gray-700"
                }`}>
                  {msg.role === "user" ? <span className="text-xs font-semibold">U</span> : <Bot size={16} />}
                </div>
                
                <div className={`px-4 py-3 text-[14px] leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-gray-100 text-gray-900 rounded-2xl rounded-tr-sm" 
                    : "bg-white border border-[#e8e6e1] text-gray-800 rounded-2xl rounded-tl-sm shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                }`}>
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="flex max-w-[80%] gap-3 flex-row">
                 <div className="w-8 h-8 rounded-full bg-[#eaeaec] text-gray-700 flex items-center justify-center mt-0.5">
                   <Bot size={16} />
                 </div>
                 <div className="px-4 py-4 rounded-2xl bg-white border border-[#e8e6e1] flex items-center gap-1.5 rounded-tl-sm shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                   <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                   <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                   <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="px-5 py-3 bg-red-50 text-red-600 text-xs font-medium border-t border-red-100 shrink-0">
          Error: {error}
        </div>
      )}

      {/* Input Box Fixed at Bottom */}
      <div className="p-5 bg-white border-t border-[#e8e6e1] shrink-0 pb-8">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="w-full pl-4 pr-12 py-3.5 bg-[#fbfbfb] border border-[#e8e6e1] rounded-2xl text-[14px] text-gray-900 focus:outline-none focus:bg-white focus:border-gray-400 focus:ring-4 focus:ring-gray-100/50 disabled:opacity-50 transition-all placeholder:text-gray-400 shadow-inner shadow-gray-50/50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2.5 w-9 h-9 flex items-center justify-center bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white rounded-xl transition-all shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
          >
            <Send size={15} className="-ml-0.5" />
          </button>
        </form>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium">
          <Bot size={12} />
          Powered by Gemini AI (Maket clone)
        </div>
      </div>
    </div>
  )
}
