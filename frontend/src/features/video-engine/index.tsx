import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import {
  Video, MessageSquare, Send, Trash2, Loader2, Sparkles,
  RefreshCw, Plus, Image, FileText, ExternalLink
} from 'lucide-react'
import { videoEngineApi, VideoJob } from './data/api'
import { tiktokResearchApi, ProjectResponse as TikTokProj, TikTokTrendResult } from '../tiktok-research/data/api'
import { youtubeResearchApi, ProjectResponse as YouTubeProj, VideoResultSchema } from '../youtube-research/data/api'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function VideoEngine() {
  const [jobs, setJobs] = useState<VideoJob[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<VideoJob | null>(null)
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null)

  // Mobile layout tab state
  const [activeTab, setActiveTab] = useState<'left' | 'middle' | 'right'>('right')

  // Source selection states
  const [sourceType, setSourceType] = useState<'tiktok' | 'youtube' | 'keyword'>('keyword')
  
  // TikTok projects & trends
  const [tiktokProjects, setTiktokProjects] = useState<TikTokProj[]>([])
  const [selectedTiktokProjId, setSelectedTiktokProjId] = useState<string>('')
  const [tiktokTrends, setTiktokTrends] = useState<TikTokTrendResult[]>([])
  const [selectedTrendId, setSelectedTrendId] = useState<string>('')
  const [isLoadingTiktok, setIsLoadingTiktok] = useState(false)

  // YouTube projects & videos
  const [youtubeProjects, setYoutubeProjects] = useState<YouTubeProj[]>([])
  const [selectedYoutubeProjId, setSelectedYoutubeProjId] = useState<string>('')
  const [youtubeVideos, setYoutubeVideos] = useState<VideoResultSchema[]>([])
  const [selectedVideoId, setSelectedVideoId] = useState<string>('')
  const [isLoadingYoutube, setIsLoadingYoutube] = useState(false)

  // Custom keyword state
  const [customKeyword, setCustomKeyword] = useState('')

  // UI state
  const [isCreatingJob, setIsCreatingJob] = useState(false)
  const [isLoadingJobs, setIsLoadingJobs] = useState(false)
  const [isLoadingJobDetails, setIsLoadingJobDetails] = useState(false)

  // Image keyword edit states (mapped by segment ID)
  const [editKeywords, setEditKeywords] = useState<{ [segmentId: string]: string }>({})
  const [isRegeneratingSegment, setIsRegeneratingSegment] = useState<{ [segmentId: string]: boolean }>({})

  // AI Chatbox state
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Chào bạn! Hãy chọn một kịch bản, tôi sẽ giúp bạn biên tập hoặc viết lại các câu thoại theo yêu cầu.' }
  ])

  const pollingIntervalRef = useRef<any>(null)

  // Load history list
  const fetchJobs = async (selectFirst = false) => {
    setIsLoadingJobs(true)
    try {
      const data = await videoEngineApi.getJobs()
      setJobs(data)
      if (selectFirst && data.length > 0) {
        setSelectedJobId(data[0].id)
      }
    } catch (err: any) {
      toast.error('Lỗi khi tải lịch sử kịch bản: ' + (err.message || ''))
    } finally {
      setIsLoadingJobs(false)
    }
  }

  // Load job details
  const fetchJobDetails = async (jobId: string, silent = false) => {
    if (!silent) setIsLoadingJobDetails(true)
    try {
      const data = await videoEngineApi.getJobDetails(jobId)
      setSelectedJob(data)
      // Initialize edit keywords
      const kwMap: { [id: string]: string } = {}
      data.segments.forEach(s => {
        kwMap[s.id] = s.keyword || ''
      })
      setEditKeywords(prev => ({ ...prev, ...kwMap }))
      return data
    } catch (err: any) {
      if (!silent) toast.error('Không thể lấy chi tiết kịch bản: ' + (err.message || ''))
      return null
    } finally {
      if (!silent) setIsLoadingJobDetails(false)
    }
  }

  // Fetch initial source research lists
  const loadSourceData = async () => {
    try {
      const ttProjs = await tiktokResearchApi.getProjects()
      setTiktokProjects(ttProjs)
      const ytProjs = await youtubeResearchApi.getProjects()
      setYoutubeProjects(ytProjs)
    } catch (err) {
      console.error('Error loading research lists:', err)
    }
  }

  useEffect(() => {
    fetchJobs(true)
    loadSourceData()
  }, [])

  // Auto load trends when selected TikTok project changes
  useEffect(() => {
    if (selectedTiktokProjId) {
      setIsLoadingTiktok(true)
      tiktokResearchApi.getProjectResults(selectedTiktokProjId)
        .then(trends => {
          setTiktokTrends(trends)
          if (trends.length > 0) setSelectedTrendId(trends[0].id)
        })
        .catch(err => toast.error('Lỗi khi tải xu hướng TikTok: ' + err.message))
        .finally(() => setIsLoadingTiktok(false))
    } else {
      setTiktokTrends([])
      setSelectedTrendId('')
    }
  }, [selectedTiktokProjId])

  // Auto load videos when selected YouTube project changes
  useEffect(() => {
    if (selectedYoutubeProjId) {
      setIsLoadingYoutube(true)
      youtubeResearchApi.getProjectResults(selectedYoutubeProjId)
        .then(videos => {
          setYoutubeVideos(videos)
          if (videos.length > 0) setSelectedVideoId(videos[0].id)
        })
        .catch(err => toast.error('Lỗi khi tải video YouTube: ' + err.message))
        .finally(() => setIsLoadingYoutube(false))
    } else {
      setYoutubeVideos([])
      setSelectedVideoId('')
    }
  }, [selectedYoutubeProjId])

  // Fetch details when selectedJobId changes
  useEffect(() => {
    if (selectedJobId) {
      fetchJobDetails(selectedJobId)
    } else {
      setSelectedJob(null)
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      setIsCreatingJob(false)
    }
  }, [selectedJobId])

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }, [])

  // Create new script rewrite job
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    let sourceId = ''
    if (sourceType === 'tiktok') {
      if (!selectedTrendId) {
        toast.warning('Vui lòng chọn một Xu hướng TikTok làm nguồn!')
        return
      }
      sourceId = selectedTrendId
    } else if (sourceType === 'youtube') {
      if (!selectedVideoId) {
        toast.warning('Vui lòng chọn một Video Youtube làm nguồn!')
        return
      }
      sourceId = selectedVideoId
    } else {
      if (!customKeyword.trim()) {
        toast.warning('Vui lòng nhập từ khóa/chủ đề!')
        return
      }
    }

    setIsCreatingJob(true)
    setActiveTab('middle') // Switch tab to show progress on mobile

    try {
      const res = await videoEngineApi.createScriptJob({
        source_type: sourceType,
        source_id: sourceType !== 'keyword' ? sourceId : undefined,
        custom_keyword: sourceType === 'keyword' ? customKeyword : undefined
      })

      toast.success('Đã bắt đầu tác vụ phân tích và khớp hình ảnh!')
      fetchJobs()
      setSelectedJobId(res.job_id)

      // Start polling for job completion
      let attempts = 0
      pollingIntervalRef.current = setInterval(async () => {
        attempts++
        const jobDetail = await fetchJobDetails(res.job_id, true)
        if (jobDetail && (jobDetail.status === 'completed' || jobDetail.status === 'failed')) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
          setIsCreatingJob(false)
          if (jobDetail.status === 'completed') {
            toast.success('Kịch bản và hình ảnh đã sẵn sàng!')
            setCustomKeyword('')
          } else {
            toast.error('Quá trình tạo kịch bản thất bại.')
          }
        } else if (attempts >= 15) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
          setIsCreatingJob(false)
          toast.error('Quá thời gian chờ phản hồi từ hệ thống.')
        }
      }, 2500)

    } catch (err: any) {
      toast.error('Lỗi khi kích hoạt công cụ: ' + (err.response?.data?.detail || err.message))
      setIsCreatingJob(false)
    }
  }

  // Delete video job
  const handleDeleteJob = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteJobId(jobId)
  }

  const executeDeleteJob = async (jobId: string) => {
    try {
      await videoEngineApi.deleteJob(jobId)
      toast.success('Đã xóa kịch bản thành công.')
      if (selectedJobId === jobId) {
        setSelectedJobId(null)
      }
      fetchJobs()
    } catch (err: any) {
      toast.error('Lỗi khi xóa kịch bản: ' + err.message)
    }
  }

  // Regenerate segment image
  const handleRegenerateImage = async (segmentId: string) => {
    const kw = editKeywords[segmentId]?.trim()
    if (!kw) {
      toast.warning('Vui lòng nhập từ khóa tìm kiếm!')
      return
    }

    setIsRegeneratingSegment(prev => ({ ...prev, [segmentId]: true }))
    try {
      const res = await videoEngineApi.regenerateSegmentImage(segmentId, kw)
      toast.success('Đã cập nhật hình ảnh thành công!')
      // Update local segment URL
      if (selectedJob) {
        const updatedSegments = selectedJob.segments.map(s => {
          if (s.id === segmentId) {
            return { ...s, image_url: res.image_url, keyword: res.keyword }
          }
          return s
        })
        setSelectedJob({ ...selectedJob, segments: updatedSegments })
      }
    } catch (err: any) {
      toast.error('Lỗi khi cập nhật ảnh: ' + (err.response?.data?.detail || err.message))
    } finally {
      setIsRegeneratingSegment(prev => ({ ...prev, [segmentId]: false }))
    }
  }

  // Send message to AI Chatbox
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim()) return

    const userMsg = chatMessage.trim()
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }])
    setChatMessage('')

    // Simulate AI response for script refinement
    setTimeout(() => {
      setChatHistory(prev => [
        ...prev,
        {
          role: 'ai',
          text: `Tôi đã nhận được yêu cầu tinh chỉnh kịch bản: "${userMsg}". Trong phiên bản hiện tại, bạn có thể chỉnh sửa trực tiếp nội dung từng đoạn thoại bên Panel Giữa, hoặc cập nhật từ khóa để tìm ảnh minh họa phù hợp hơn nhé!`
        }
      ])
    }, 1200)
  }

  return (
    <>
      <Header fixed className="border-b bg-background/95 backdrop-blur-md">
        <div className="flex items-center gap-2 font-bold text-lg text-primary me-auto">
          <Video className="w-6 h-6 text-indigo-500" />
          <span className="hidden sm:inline">Script & Asset Matching Engine</span>
          <span className="sm:hidden text-base">Asset Engine</span>
        </div>
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main fixed fluid className="p-0 overflow-hidden">
        {/* Mobile Tabs Switcher */}
        <div className="flex border-b border-border md:hidden bg-card sticky top-0 z-10 shrink-0">
          <button
            onClick={() => setActiveTab('left')}
            className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all duration-200 ${
              activeTab === 'left'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Lịch sử & Chat
          </button>
          <button
            onClick={() => setActiveTab('middle')}
            className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all duration-200 ${
              activeTab === 'middle'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Phân đoạn & Ảnh
          </button>
          <button
            onClick={() => setActiveTab('right')}
            className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all duration-200 ${
              activeTab === 'right'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Tạo mới & Kịch bản
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 h-full divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">

          {/* ================= PANEL TRÁI: HISTORY & AI CHATBOT ================= */}
          <div className={cn("flex flex-col h-full bg-muted/10 md:col-span-3 overflow-hidden", activeTab === 'left' ? 'flex' : 'hidden md:flex')}>
            <div className="p-4 border-b font-bold flex items-center gap-2 text-foreground shrink-0 bg-background/50">
              <Plus className="w-4 h-4 text-primary" />
              <span>Dự án kịch bản</span>
            </div>

            {/* List of projects */}
            <div className="h-1/2 border-b overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 p-3">
                {isLoadingJobs ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="text-center p-6 text-xs text-muted-foreground">Chưa có dự án kịch bản nào được tạo.</div>
                ) : (
                  <div className="space-y-2">
                    {jobs.map((j) => (
                      <div
                        key={j.id}
                        onClick={() => setSelectedJobId(j.id)}
                        className={`flex justify-between items-center p-3 rounded-lg border text-sm cursor-pointer transition-all duration-200 ${
                          selectedJobId === j.id
                            ? 'bg-primary/10 border-primary text-primary font-medium'
                            : 'bg-card hover:bg-muted/50 border-border text-foreground'
                        }`}
                      >
                        <div className="truncate flex-1 pr-2">
                          <div className="truncate font-semibold">{j.keyword}</div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                              j.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                              j.status === 'pending' || j.status === 'rewriting' ? 'bg-amber-500/10 text-amber-600 animate-pulse' :
                              'bg-rose-500/10 text-rose-600'
                            )}>
                              {j.status === 'completed' ? 'Đã khớp' : j.status === 'rewriting' ? 'Đang viết' : j.status}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {new Date(j.created_at).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => handleDeleteJob(j.id, e)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* AI Chatbox */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b text-xs font-bold text-muted-foreground flex items-center gap-1.5 bg-background/50">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span>AI CHATBOX - TINH CHỈNH KỊCH BẢN</span>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3 pb-2">
                  {chatHistory.map((chat, i) => (
                    <div key={i} className={cn("flex flex-col max-w-[85%] rounded-lg p-2.5 text-xs leading-relaxed",
                      chat.role === 'user'
                        ? 'bg-primary text-primary-foreground ms-auto'
                        : 'bg-muted border text-foreground'
                    )}>
                      {chat.text}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <form onSubmit={handleSendChatMessage} className="p-3 border-t flex gap-2 bg-card">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Yêu cầu AI viết lại, đổi giọng điệu..."
                  className="h-9 text-xs"
                />
                <Button type="submit" size="icon" className="h-9 w-9 shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>
          </div>

          {/* ================= PANEL GIỮA: SCRIPT SENTENCES & MATCHED IMAGES ================= */}
          <div className={cn("flex flex-col h-full bg-background md:col-span-4 overflow-hidden", activeTab === 'middle' ? 'flex' : 'hidden md:flex')}>
            <div className="p-4 border-b font-bold flex items-center justify-between text-foreground shrink-0">
              <span className="flex items-center gap-2">
                <Image className="w-4 h-4 text-primary" />
                <span>Danh sách Phân đoạn & Hình ảnh</span>
              </span>
            </div>

            {isCreatingJob ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-2.5">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm font-bold text-foreground">Đang xử lý kịch bản...</span>
                <span className="text-xs text-muted-foreground max-w-xs leading-normal">
                  Celery worker đang gọi Gemini AI để bóc tách câu thoại, tạo từ khóa và khớp hình ảnh từ Unsplash. Vui lòng đợi trong giây lát.
                </span>
              </div>
            ) : !selectedJobId ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center max-w-sm bg-card shadow-sm">
                  <Image className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <span className="text-sm font-bold text-foreground">Chưa chọn dự án kịch bản</span>
                  <span className="text-xs mt-1 leading-normal text-muted-foreground">
                    Chọn dự án hiện có từ Panel Trái hoặc thiết lập tạo mới một kịch bản từ các kết quả nghiên cứu ở Panel Phải.
                  </span>
                </div>
              </div>
            ) : isLoadingJobDetails ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !selectedJob || selectedJob.segments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center max-w-sm bg-card">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                  <span className="text-sm font-bold text-foreground">Đang cập nhật phân đoạn thoại...</span>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 pb-6">
                  {selectedJob.segments.map((seg) => (
                    <Card key={seg.id} className="p-4 bg-card border hover:shadow-md transition-shadow duration-300 relative overflow-hidden">
                      <div className="flex items-start gap-4">
                        {/* Segment Index */}
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {seg.order_index}
                        </div>

                        {/* Segment Content */}
                        <div className="flex-1 min-w-0 space-y-3">
                          {/* Spoken Text */}
                          <p className="text-xs font-semibold text-foreground leading-relaxed">
                            {seg.text}
                          </p>

                          {/* Image preview & change asset */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                            {/* Stock Image Card */}
                            <div className="sm:col-span-5 aspect-video bg-muted rounded-lg overflow-hidden relative border border-border/50 shrink-0">
                              {seg.image_url ? (
                                <img
                                  src={seg.image_url}
                                  alt={seg.keyword || `Segment ${seg.order_index}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400'
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                                  Không có ảnh
                                </div>
                              )}
                              {isRegeneratingSegment[seg.id] && (
                                <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
                                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                </div>
                              )}
                            </div>

                            {/* Keywords and regenerate action */}
                            <div className="sm:col-span-7 flex flex-col justify-between space-y-2">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Từ khóa cào ảnh</label>
                                <Input
                                  value={editKeywords[seg.id] || ''}
                                  onChange={(e) => setEditKeywords({ ...editKeywords, [seg.id]: e.target.value })}
                                  placeholder="Nhập từ khóa tiếng Anh để ảnh chính xác hơn..."
                                  className="h-8 text-xs font-mono"
                                  disabled={isRegeneratingSegment[seg.id]}
                                />
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRegenerateImage(seg.id)}
                                disabled={isRegeneratingSegment[seg.id] || !editKeywords[seg.id]?.trim()}
                                className="h-8 gap-1.5 text-[10px] font-bold self-start mt-1 border-primary/20 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                              >
                                <RefreshCw className={cn("w-3 h-3 text-primary", isRegeneratingSegment[seg.id] && "animate-spin")} />
                                <span>Tìm Source Khác</span>
                              </Button>
                            </div>
                          </div>

                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* ================= PANEL PHẢI: NEW JOB FORM & FULL SCRIPT ================= */}
          <div className={cn("flex flex-col h-full bg-muted/5 md:col-span-5 overflow-hidden", activeTab === 'right' ? 'flex' : 'hidden md:flex')}>
            <div className="p-4 border-b font-bold flex items-center gap-2 text-foreground shrink-0 bg-background/50">
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Thiết lập Nguồn & Biên tập Kịch bản</span>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-5 pb-6">
                
                {/* Form to submit new script job */}
                <Card className="p-4 border bg-card shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Tạo dự án kịch bản mới</h3>
                  
                  <form onSubmit={handleCreateJob} className="space-y-4">
                    
                    {/* Source type selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Nguồn dữ liệu đầu vào</label>
                      <Select
                        value={sourceType}
                        onValueChange={(val: 'tiktok' | 'youtube' | 'keyword') => setSourceType(val)}
                        disabled={isCreatingJob}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Chọn nguồn dữ liệu" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keyword">Chủ đề / Từ khóa (Tự viết mới)</SelectItem>
                          <SelectItem value="tiktok">Dữ liệu cào TikTok Research (Database)</SelectItem>
                          <SelectItem value="youtube">Dữ liệu cào YouTube Research (Database)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Source: TikTok selector */}
                    {sourceType === 'tiktok' && (
                      <div className="space-y-3 pt-1 border-t border-dashed">
                        {/* Choose project */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Chọn dự án TikTok</label>
                          <Select
                            value={selectedTiktokProjId}
                            onValueChange={setSelectedTiktokProjId}
                            disabled={isCreatingJob}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Chọn dự án nghiên cứu" />
                            </SelectTrigger>
                            <SelectContent>
                              {tiktokProjects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name.replace('TikTok Research: ', '')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Choose specific trend */}
                        {selectedTiktokProjId && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Chọn kịch bản xu hướng</label>
                            {isLoadingTiktok ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải xu hướng...
                              </div>
                            ) : tiktokTrends.length === 0 ? (
                              <div className="text-xs text-rose-500 p-2">Không có kết quả xu hướng nào trong dự án này.</div>
                            ) : (
                              <Select
                                value={selectedTrendId}
                                onValueChange={setSelectedTrendId}
                                disabled={isCreatingJob}
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Chọn chủ đề xu hướng" />
                                </SelectTrigger>
                                <SelectContent>
                                  {tiktokTrends.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Source: YouTube selector */}
                    {sourceType === 'youtube' && (
                      <div className="space-y-3 pt-1 border-t border-dashed">
                        {/* Choose project */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Chọn dự án YouTube</label>
                          <Select
                            value={selectedYoutubeProjId}
                            onValueChange={setSelectedYoutubeProjId}
                            disabled={isCreatingJob}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Chọn dự án nghiên cứu" />
                            </SelectTrigger>
                            <SelectContent>
                              {youtubeProjects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name.replace('Research: ', '')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Choose specific video */}
                        {selectedYoutubeProjId && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Chọn video đối thủ</label>
                            {isLoadingYoutube ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải danh sách video...
                              </div>
                            ) : youtubeVideos.length === 0 ? (
                              <div className="text-xs text-rose-500 p-2">Không tìm thấy video nào trong dự án này.</div>
                            ) : (
                              <Select
                                value={selectedVideoId}
                                onValueChange={setSelectedVideoId}
                                disabled={isCreatingJob}
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Chọn video để làm lại" />
                                </SelectTrigger>
                                <SelectContent>
                                  {youtubeVideos.map(v => (
                                    <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Source: Keyword text input */}
                    {sourceType === 'keyword' && (
                      <div className="space-y-1 pt-1 border-t border-dashed">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Ý tưởng / Từ khóa viết kịch bản</label>
                        <Input
                          value={customKeyword}
                          onChange={(e) => setCustomKeyword(e.target.value)}
                          placeholder="Ví dụ: 3 cách dùng ChatGPT x10 hiệu suất..."
                          className="h-9 text-xs"
                          disabled={isCreatingJob}
                        />
                      </div>
                    )}

                    <Button type="submit" disabled={isCreatingJob} className="w-full h-9 gap-2 font-bold text-xs">
                      {isCreatingJob ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang viết kịch bản...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                          <span>Tạo Kịch bản & Khớp Hình ảnh</span>
                        </>
                      )}
                    </Button>
                  </form>
                </Card>

                {/* Script details display */}
                {selectedJob && (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" />
                      <span>Kịch bản đầy đủ (AI Rewrite)</span>
                    </div>

                    <Card className="p-4 bg-card border shadow-sm space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-border/60">
                        <span className="text-xs font-bold text-primary truncate max-w-[200px]">
                          Dự án: {selectedJob.keyword}
                        </span>
                        {selectedJob.source_url && (
                          <a
                            href={selectedJob.source_url.startsWith('http') ? selectedJob.source_url : '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Xem nguồn</span>
                          </a>
                        )}
                      </div>

                      {selectedJob.full_script ? (
                        <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                          {selectedJob.full_script}
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-500 italic">
                          Không có kịch bản tổng quát. Các phân đoạn thoại chi tiết được liệt kê ở Panel Giữa.
                        </div>
                      )}
                    </Card>
                  </div>
                )}

              </div>
            </ScrollArea>
          </div>

        </div>
      </Main>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteJobId !== null} onOpenChange={(open) => { if (!open) setDeleteJobId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa dự án kịch bản</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa dự án kịch bản này? Tất cả các phân đoạn thoại và liên kết hình ảnh liên quan sẽ bị xóa vĩnh viễn khỏi PostgreSQL database. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteJobId) {
                  executeDeleteJob(deleteJobId)
                  setDeleteJobId(null)
                }
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Xóa dự án
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
