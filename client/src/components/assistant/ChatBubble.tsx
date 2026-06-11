interface ChatBubbleProps {
  isOpen: boolean
  onClick: () => void
}

export function ChatBubble({ isOpen, onClick }: ChatBubbleProps) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 h-14 w-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer z-[998] ${
        isOpen
          ? 'bg-[#ef4444] text-white rotate-90'
          : 'bg-[#f59e0b] text-slate-900 animate-bounce hover:animate-none'
      }`}
      aria-label={isOpen ? 'Close assistant' : 'Open AI assistant'}
      style={{
        animationDuration: '3s',
      }}
    >
      {isOpen ? (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ) : (
        <div className="relative">
          {/* Pulsing outer ring */}
          <span className="absolute -inset-1 rounded-full bg-[#f59e0b]/40 animate-ping opacity-75"></span>
          <svg
            className="w-6 h-6 relative z-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
      )}
    </button>
  )
}
export default ChatBubble
