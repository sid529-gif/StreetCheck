import { useState, useEffect, useRef } from 'react'
import { useMapStore } from '../../store/mapStore.js'
import { api } from '../../services/api.js'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
}

interface AssistantPanelProps {
  isOpen: boolean
  onClose: () => void
}

const STARTER_PROMPTS = [
  'Is it safe to walk here at night?',
  'Which route has better lighting?',
  'Are there any flood-prone roads nearby?',
]

export function AssistantPanel({ isOpen, onClose }: AssistantPanelProps) {
  const viewport = useMapStore((state) => state.viewport)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi! I am your StreetCheck road safety assistant. Ask me about lighting, flood risks, surface conditions, or route safety in Hyderabad.',
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isPending, setIsPending] = useState(false)
  const threadEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom when messages change
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending])

  if (!isOpen) return null

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isPending) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsPending(true)

    // Build bounding box coordinates payload from mapStore
    let bbox: [number, number, number, number] | undefined
    if (viewport) {
      bbox = [viewport.minLng, viewport.minLat, viewport.maxLng, viewport.maxLat]
    }

    try {
      const answer = await api.getAssistantResponse(userMessage.text, bbox)

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: answer,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        'I am currently offline or unable to reach the Claude AI service. Please check your connection and try again.'
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: `Error: ${errorMsg}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-24 md:right-4 w-full h-full md:w-[400px] md:h-[480px] bg-[#111827] border border-[#1f2937] md:border rounded-none md:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50 md:z-[997] transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-[#1f2937] bg-[#0a0f1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f59e0b] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f59e0b]"></span>
          </div>
          <h3 className="text-xs font-black text-white uppercase tracking-wider ml-1">
            StreetCheck Assistant
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0f1a]/40">
        {messages.map((msg) => {
          const isAssistant = msg.role === 'assistant'
          return (
            <div key={msg.id} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
              {isAssistant ? (
                <div className="flex gap-2 max-w-[85%]">
                  <div className="bg-[#f59e0b] text-[#0a0f1a] h-6 w-6 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-[9px] shadow-sm">
                    SC
                  </div>
                  <div className="bg-[#1f2937] text-slate-100 rounded-2xl rounded-tl-none border border-[#2e3a52]/40 px-4 py-2.5 text-xs leading-relaxed shadow-md">
                    {msg.text}
                    <div className="text-[8px] mt-1 text-right text-gray-500 font-semibold uppercase tracking-wider">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-[85%] bg-[#f59e0b] text-[#0a0f1a] rounded-2xl rounded-tr-none px-4 py-2.5 text-xs shadow-md leading-relaxed font-bold">
                  {msg.text}
                  <div className="text-[8px] mt-1 text-right text-[#0a0f1a]/60 uppercase tracking-wider">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {isPending && (
          <div className="flex justify-start">
            <div className="flex gap-2 max-w-[85%]">
              <div className="bg-[#f59e0b] text-[#0a0f1a] h-6 w-6 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-[9px] shadow-sm">
                SC
              </div>
              <div className="bg-[#1f2937] text-gray-400 rounded-2xl rounded-tl-none border border-[#2e3a52]/40 px-4 py-2.5 text-xs flex items-center gap-1.5 shadow-md">
                <span className="font-bold uppercase tracking-wider text-[9px]">
                  Claude is typing
                </span>
                <span className="flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b] animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b] animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b] animate-bounce" />
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Input container + Quick Pills */}
      <div className="p-4 bg-[#111827] border-t border-[#1f2937] space-y-3">
        {/* Quick Pills */}
        <div className="flex flex-wrap gap-2">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              disabled={isPending}
              className="text-[10px] font-bold bg-gray-800 hover:bg-[#f59e0b]/20 hover:text-[#f59e0b] hover:border-[#f59e0b]/40 disabled:opacity-50 text-gray-300 border border-gray-600 px-3 py-1.5 rounded-full transition-colors cursor-pointer text-left leading-normal"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage(inputValue)
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isPending}
            placeholder="Ask safety helper..."
            className="flex-1 bg-[#0a0f1a] text-xs text-white placeholder-gray-500 rounded-xl border border-[#2e3a52] px-3.5 py-2.5 focus:outline-none focus:border-[#f59e0b] disabled:opacity-55"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isPending}
            className={`px-4 rounded-xl flex items-center justify-center shadow-lg transition-colors cursor-pointer ${
              !inputValue.trim() || isPending
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-[#1f2937]'
                : 'bg-[#f59e0b] hover:bg-[#d97706] text-[#0a0f1a]'
            }`}
            aria-label="Send message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
export default AssistantPanel
