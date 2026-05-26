import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Eye, EyeOff, Key } from 'lucide-react'

export function APIKeysForm() {
  const [geminiKey, setGeminiKey] = useState('')
  const [youtubeKey, setYoutubeKey] = useState('')
  const [tiktokKey, setTiktokKey] = useState('')

  const [showGemini, setShowGemini] = useState(false)
  const [showYoutube, setShowYoutube] = useState(false)
  const [showTiktok, setShowTiktok] = useState(false)

  // Load API Keys from localStorage on mount
  useEffect(() => {
    setGeminiKey(localStorage.getItem('gemini_api_key') || '')
    setYoutubeKey(localStorage.getItem('youtube_api_key') || '')
    setTiktokKey(localStorage.getItem('tiktok_api_key') || '')
  }, [])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Save to localStorage
    localStorage.setItem('gemini_api_key', geminiKey.trim())
    localStorage.setItem('youtube_api_key', youtubeKey.trim())
    localStorage.setItem('tiktok_api_key', tiktokKey.trim())
    
    toast.success('Cấu hình API Keys của bạn đã được cập nhật thành công!')
  }

  const handleClear = () => {
    setGeminiKey('')
    setYoutubeKey('')
    setTiktokKey('')
    localStorage.removeItem('gemini_api_key')
    localStorage.removeItem('youtube_api_key')
    localStorage.removeItem('tiktok_api_key')
    toast.success('Đã xóa tất cả API Keys cá nhân. Hệ thống sẽ sử dụng các Keys mặc định từ backend.')
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-xl">
      <div className="space-y-5">
        
        {/* Gemini API Key */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Key className="w-4 h-4 text-primary" />
            <span>Gemini API Key</span>
          </label>
          <div className="relative">
            <Input
              type={showGemini ? 'text' : 'password'}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Nhập Gemini API Key của bạn (ví dụ: AIzaSy...)"
              className="pr-10 h-10 border-border bg-card"
            />
            <button
              type="button"
              onClick={() => setShowGemini(!showGemini)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Sử dụng cho tính năng viết lại kịch bản, phân tích nội dung đối thủ cạnh tranh bằng AI.
          </p>
        </div>

        {/* YouTube API Key */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Key className="w-4 h-4 text-primary" />
            <span>YouTube Data API Key</span>
          </label>
          <div className="relative">
            <Input
              type={showYoutube ? 'text' : 'password'}
              value={youtubeKey}
              onChange={(e) => setYoutubeKey(e.target.value)}
              placeholder="Nhập YouTube API Key của bạn"
              className="pr-10 h-10 border-border bg-card"
            />
            <button
              type="button"
              onClick={() => setShowYoutube(!showYoutube)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              {showYoutube ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Sử dụng cho tính năng cào dữ liệu danh sách video, kênh từ YouTube Data v3 API.
          </p>
        </div>

        {/* TikTok API Key */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Key className="w-4 h-4 text-primary" />
            <span>TikTok API Key (Tùy chọn)</span>
          </label>
          <div className="relative">
            <Input
              type={showTiktok ? 'text' : 'password'}
              value={tiktokKey}
              onChange={(e) => setTiktokKey(e.target.value)}
              placeholder="Nhập TikTok API Key nếu có"
              className="pr-10 h-10 border-border bg-card"
            />
            <button
              type="button"
              onClick={() => setShowTiktok(!showTiktok)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              {showTiktok ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Sử dụng cho các chức năng nghiên cứu TikTok nâng cao.
          </p>
        </div>

      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="bg-primary hover:bg-primary-hover text-primary-foreground">
          Lưu cấu hình
        </Button>
        <Button type="button" variant="outline" onClick={handleClear} className="border-border text-foreground hover:bg-muted/50">
          Xóa cấu hình cá nhân
        </Button>
      </div>
    </form>
  )
}
