"use client"

import { useState } from "react"

interface InputPanelProps {
  onSubmit: (data: {
    sq_ft: number
    bedrooms: number
    bathrooms: number
    garage: number
  }) => void
}

export default function InputPanel({ onSubmit }: InputPanelProps) {
  const [sqFt, setSqFt] = useState(2500)
  const [bedrooms, setBedrooms] = useState(3)
  const [bathrooms, setBathrooms] = useState(2)
  const [garage, setGarage] = useState(2)

  const handleSubmit = () => {
    onSubmit({ sq_ft: sqFt, bedrooms, bathrooms, garage })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 pb-2">
        <h3 className="font-semibold text-gray-900 text-sm">Dimension Controls</h3>
        <p className="text-xs text-gray-500">Fine tune your layout parameters manually.</p>
      </div>

      {/* Square Footage Slider */}
      <div className="space-y-4">
        <div className="flex justify-between items-center text-[13px]">
          <label className="font-medium text-gray-700">Floor Area</label>
          <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">{sqFt.toLocaleString()} ft²</span>
        </div>
        <div className="space-y-2">
          <input
            type="range"
            min="500"
            max="8000"
            value={sqFt}
            onChange={(e) => setSqFt(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
          />
        </div>
      </div>

      <div className="h-px bg-[#e8e6e1] w-full" />

      {/* Selects */}
      <div className="space-y-5">
        <div className="flex justify-between items-center text-[13px]">
          <label className="font-medium text-gray-700">Bedrooms</label>
          <div className="flex bg-gray-100 rounded-md p-0.5 border border-gray-200">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => setBedrooms(num)}
                className={`w-8 h-7 text-xs font-semibold rounded ${bedrooms === num ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center text-[13px]">
          <label className="font-medium text-gray-700">Bathrooms</label>
          <div className="flex bg-gray-100 rounded-md p-0.5 border border-gray-200">
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => setBathrooms(num)}
                className={`w-8 h-7 text-xs font-semibold rounded ${bathrooms === num ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center text-[13px]">
          <label className="font-medium text-gray-700">Garages</label>
          <div className="flex bg-gray-100 rounded-md p-0.5 border border-gray-200">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => setGarage(num)}
                className={`w-8 h-7 text-xs font-semibold rounded ${garage === num ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6 mt-6 border-t border-[#e8e6e1]">
        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-gray-900 hover:bg-black text-white font-medium text-[14px] rounded-xl transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex items-center justify-center gap-2"
        >
          Generate Layout
        </button>
      </div>
    </div>
  )
}
