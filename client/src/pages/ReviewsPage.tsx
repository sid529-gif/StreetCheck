import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Navbar from '../components/navigation/Navbar.js'
import { api } from '../services/api.js'
import type { Review } from '../services/api.js'

export default function ReviewsPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // Fetch reviews
  const {
    data: reviews = [],
    isLoading,
    error,
  } = useQuery<Review[]>({
    queryKey: ['reviews'],
    queryFn: () => api.getReviews(),
  })

  // Submit review mutation
  const submitMutation = useMutation({
    mutationFn: (newReview: { name: string; rating: number; comment: string; email?: string }) =>
      api.submitReview(newReview),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      setModalOpen(false)
      setName('')
      setRating(5)
      setComment('')
      setEmail('')
      setFormError(null)
    },
    onError: (err: any) => {
      setFormError(err.message || 'An error occurred. Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!name.trim()) {
      setFormError('Please enter your name.')
      return
    }
    if (!comment.trim()) {
      setFormError('Please write a comment.')
      return
    }

    const payload: { name: string; rating: number; comment: string; email?: string } = {
      name,
      rating,
      comment,
    }
    const trimmedEmail = email.trim()
    if (trimmedEmail) {
      payload.email = trimmedEmail
    }
    submitMutation.mutate(payload)
  }

  // Calculate dynamic stats
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : '4.8' // default baseline

  const starCounts = [0, 0, 0, 0, 0] // index 0 is 5-star, index 4 is 1-star
  reviews.forEach((r) => {
    const idx = 5 - r.rating
    if (idx >= 0 && idx < 5) {
      const val = starCounts[idx]
      if (val !== undefined) {
        starCounts[idx] = val + 1
      }
    }
  })

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0f1a] text-white font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full space-y-12">
        {/* SaaS Hero Section */}
        <section className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] text-[10px] font-black uppercase tracking-wider">
            ⭐ Community Feedback
          </div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-none">
            What Citizens Think <br /> About <span className="text-[#f59e0b]">StreetCheck</span>
          </h1>
          <p className="text-sm text-gray-400">
            Help us improve Hyderabad&apos;s street safety platform. Your reviews directly
            contribute to municipal awareness and safety mapping.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setModalOpen(true)}
              className="px-6 py-3 bg-[#f59e0b] hover:bg-[#d97706] text-[#0a0f1a] font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 shadow-lg cursor-pointer"
              type="button"
            >
              Leave Feedback
            </button>
          </div>
        </section>

        {/* Rating Summary Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#111827]/40 border border-[#1f2937] p-6 rounded-2xl">
          {/* Average Score */}
          <div className="flex flex-col items-center justify-center text-center p-4 border-r border-[#1f2937]/50">
            <span className="text-5xl font-black tracking-tight text-white">{averageRating}</span>
            <div className="flex text-[#f59e0b] text-lg mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i}>★</span>
              ))}
            </div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-2">
              Based on {reviews.length} reviews
            </span>
          </div>

          {/* Star progress bars */}
          <div className="md:col-span-2 flex flex-col justify-center gap-2.5 p-4">
            {[5, 4, 3, 2, 1].map((stars, idx) => {
              const count = starCounts[idx] || 0
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
              return (
                <div
                  key={stars}
                  className="flex items-center gap-3 text-xs font-semibold text-gray-400"
                >
                  <span className="w-12 text-right">{stars} star</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#f59e0b] rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono">{count}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Testimonials List */}
        <section className="space-y-6">
          <h2 className="text-sm font-black uppercase text-gray-400 tracking-wider">
            Latest Reviews
          </h2>

          {isLoading && (
            <div className="text-center py-12 flex flex-col items-center justify-center gap-2.5">
              <div className="w-6 h-6 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                Loading reviews...
              </span>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-rose-400 font-bold text-xs uppercase">
              Failed to load reviews. Please try again later.
            </div>
          )}

          {!isLoading && !error && reviews.length === 0 && (
            <div className="text-center py-16 bg-[#111827]/20 border border-[#1f2937] rounded-2xl flex flex-col items-center gap-2">
              <span className="text-3xl text-gray-600">💬</span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                No reviews yet
              </span>
              <p className="text-[10px] text-gray-500 max-w-xs leading-normal">
                Be the first citizen to leave feedback and help shape our safety intelligence
                mapping.
              </p>
            </div>
          )}

          {!isLoading && !error && reviews.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-[#111827]/40 border border-[#1f2937] p-5 rounded-2xl flex flex-col justify-between hover:border-[#f59e0b]/20 transition-all duration-300"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-extrabold text-sm text-white">{review.name}</h3>
                      <div className="text-[#f59e0b] text-xs font-mono">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed italic">
                      &quot;{review.comment}&quot;
                    </p>
                  </div>
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mt-4">
                    {new Date(review.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Leave Feedback Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-[#1f2937] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1f2937] flex justify-between items-center bg-[#0a0f1a]">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-[#f59e0b]">
                  Leave Feedback
                </h3>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                  Your voice matters
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-all cursor-pointer"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-xl bg-[#1f2937] border border-[#2e3a52] px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[#f59e0b] focus:outline-none transition-colors"
                  maxLength={50}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Rating (1-5 Stars)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-2xl cursor-pointer hover:scale-110 transition-transform ${
                        star <= rating ? 'text-[#f59e0b]' : 'text-gray-600'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Comments
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your thoughts about StreetCheck..."
                  rows={4}
                  className="w-full rounded-xl bg-[#1f2937] border border-[#2e3a52] px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[#f59e0b] focus:outline-none transition-colors resize-none"
                  maxLength={500}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full rounded-xl bg-[#1f2937] border border-[#2e3a52] px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[#f59e0b] focus:outline-none transition-colors"
                />
              </div>

              {formError && (
                <div className="text-[10px] text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 p-2.5 rounded-lg font-medium">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full py-3 bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-[#f59e0b]/40 disabled:cursor-not-allowed text-[#0a0f1a] font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
