import axios from 'axios'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface PhotoUploaderProps {
  onUploadSuccess: (url: string) => void
  onUploadStart?: () => void
  onUploadError?: (error: string) => void
}

export function PhotoUploader({
  onUploadSuccess,
  onUploadStart,
  onUploadError,
}: PhotoUploaderProps) {
  const { t } = useTranslation()
  const [progress, setProgress] = useState<number>(0)
  const [uploading, setUploading] = useState<boolean>(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const metaEnv = (import.meta as unknown as { env: Record<string, string | undefined> }).env
  const cloudName = metaEnv['VITE_CLOUDINARY_CLOUD_NAME']
  const uploadPreset = metaEnv['VITE_CLOUDINARY_UPLOAD_PRESET']

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit to image formats
    if (!file.type.startsWith('image/')) {
      const errMsg = t('map.photoUploader.errFormat', {
        defaultValue: 'Only image files are allowed.',
      })
      setErrorMsg(errMsg)
      onUploadError?.(errMsg)
      return
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      const errMsg = t('map.photoUploader.errSize', {
        defaultValue: 'File size exceeds 5MB limit.',
      })
      setErrorMsg(errMsg)
      onUploadError?.(errMsg)
      return
    }

    // Generate local Object URL for instant thumbnail preview
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setErrorMsg(null)

    onUploadStart?.()
    setUploading(true)
    setProgress(0)

    // Check if Cloudinary is configured
    if (!cloudName || !uploadPreset) {
      console.warn('Cloudinary env vars not set. Simulating upload...')
      // Simulate progress upload for demo/hackathon scope
      let currentProgress = 0
      const interval = setInterval(() => {
        currentProgress += 10
        setProgress(currentProgress)
        if (currentProgress >= 100) {
          clearInterval(interval)
          setUploading(false)
          // Use standard unsplash street hazard image as placeholder mock
          const mockUrl =
            'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=400#' +
            encodeURIComponent(file.name)
          onUploadSuccess(mockUrl)
        }
      }, 150)
      return
    }

    // Real Cloudinary Upload
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', uploadPreset)

      const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
      const { data } = await axios.post<{ secure_url: string }>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
          setProgress(percent)
        },
      })

      setUploading(false)
      onUploadSuccess(data.secure_url)
    } catch (err: any) {
      setUploading(false)
      setPreviewUrl(null)
      const errDetail =
        err.response?.data?.error?.message ||
        t('map.photoUploader.errCloudinary', { defaultValue: 'Cloudinary upload failed.' })
      console.error('Cloudinary Upload Error:', err)
      setErrorMsg(errDetail)
      onUploadError?.(errDetail)
    }
  }

  const triggerInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
        {t('map.photoUploader.title', { defaultValue: 'Upload Evidence Photo' })}
      </label>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <div className="flex gap-4 items-center">
        <button
          type="button"
          onClick={triggerInput}
          disabled={uploading}
          className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-[#2e3a52] bg-[#1a1f2e] text-center hover:border-amber-500/50 cursor-pointer transition-colors ${
            uploading ? 'opacity-55 cursor-not-allowed' : ''
          }`}
        >
          <svg
            className="w-8 h-8 text-[#94a3b8] mb-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs font-medium text-white">
            {uploading
              ? t('map.photoUploader.uploading')
              : t('map.photoUploader.tapToUpload', { defaultValue: 'Tap to Upload Photo' })}
          </span>
          <span className="text-[10px] text-[#94a3b8] mt-0.5">
            {t('map.photoUploader.limitNotes', { defaultValue: 'JPEG, PNG, WebP up to 5MB' })}
          </span>
        </button>

        {previewUrl && (
          <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#2e3a52] flex-shrink-0 bg-[#252d3d]">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                {/* Clean loading spinner */}
                <div className="h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-[#cbd5e1]">
            <span>
              {t('map.photoUploader.cloudProgress', {
                defaultValue: 'Uploading to cloud storage...',
              })}
            </span>
            <span className="font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-[#1a1f2e] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#f59e0b] h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="text-xs text-[#ef4444] bg-[#ef4444]/15 border border-[#ef4444]/45 rounded-lg p-2.5">
          {errorMsg}
        </div>
      )}
    </div>
  )
}
export default PhotoUploader
