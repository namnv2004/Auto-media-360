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
  Video, Search, Download, Trash2, Loader2, Sparkles, 
  TrendingUp, ThumbsUp, AlertCircle, FileText, CheckCircle, Terminal, Copy,
  ChevronRight, Cpu, Database, PlayCircle
} from 'lucide-react'
import { youtubeResearchApi, ProjectResponse, VideoResultSchema } from './data/api'
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

const parseLogLine = (logLine: string) => {
  const timeMatch = logLine.match(/^\[([^\]]+)\]/);
  const time = timeMatch ? timeMatch[1] : '';
  
  let content = logLine.replace(/^\[[^\]]+\]\s*/, '');
  
  let category: 'system' | 'celery' | 'database' | 'error' | 'info' = 'info';
  let label = 'Trợ lý AI';
  
  if (content.startsWith('[Celery]')) {
    category = 'celery';
    content = content.replace(/^\[Celery\]\s*/, '');
    label = 'Celery Task';
  } else if (content.startsWith('[Database]')) {
    category = 'database';
    content = content.replace(/^\[Database\]\s*/, '');
    label = 'Cơ sở dữ liệu';
  } else if (content.startsWith('[System]')) {
    category = 'system';
    content = content.replace(/^\[System\]\s*/, '');
    label = 'Hệ thống';
  } else if (content.startsWith('[Error]')) {
    category = 'error';
    content = content.replace(/^\[Error\]\s*/, '');
    label = 'Lỗi hệ thống';
  } else {
    category = 'info';
    label = 'Trình cào dữ liệu';
  }
  
  return { time, category, label, content };
};

export function YouTubeResearch() {
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [videos, setVideos] = useState<VideoResultSchema[]>([])
  const [selectedVideo, setSelectedVideo] = useState<VideoResultSchema | null>(null)
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  
  // Mobile responsive active tab
  const [activeTab, setActiveTab] = useState<'control' | 'results' | 'analysis'>('control')
  
  // Form states
  const [keyword, setKeyword] = useState('')
  const [market, setMarket] = useState('VN')
  const [language, setLanguage] = useState('vi')
  const [maxResults, setMaxResults] = useState(10)
  const [order, setOrder] = useState('relevance')
  const [duration, setDuration] = useState('any')
  
  const [isCrawling, setIsCrawling] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingVideos, setIsLoadingVideos] = useState(false)
  
  const [terminalLogs, setTerminalLogs] = useState<string[]>([])
  const terminalEndRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<any>(null)

  // Helper to determine progress state and percentage
  const getProgressState = () => {
    if (terminalLogs.length === 0) return { percent: 0, step: 0, text: 'Hệ thống đang rảnh. Nhập từ khóa để bắt đầu quét...' }
    
    const logsStr = terminalLogs.join('\n')
    let percent = 10
    let step = 1
    let text = 'Khởi tạo tác vụ...'

    if (logsStr.includes('API Gateway')) {
      percent = 25
      step = 1
      text = 'Đang kết nối API Gateway...'
    }
    if (logsStr.includes('[Celery]')) {
      percent = 40
      step = 2
      text = 'Đã lên lịch tác vụ Celery...'
    }
    if (logsStr.includes('[System] Đang chờ Celery worker')) {
      percent = 60
      step = 3
      text = 'Đang cào dữ liệu & Phân tích AI...'
    }
    if (logsStr.includes('Đang thăm dò kết quả')) {
      const match = logsStr.match(/Lần thứ (\d+)/g)
      const count = match ? match.length : 1
      percent = Math.min(60 + count * 2, 90)
      step = 3
      text = `Đang xử lý kết quả (Đang đồng bộ lần thứ ${count})...`
    }
    if (logsStr.includes('Đồng bộ hóa dữ liệu')) {
      percent = 95
      step = 4
      text = 'Đang lưu trữ PostgreSQL...'
    }
    if (logsStr.includes('Hoàn tất quét!')) {
      percent = 100
      step = 4
      text = 'Quét dữ liệu hoàn tất!'
    }
    if (logsStr.includes('[Error]')) {
      percent = 100
      step = 5
      text = 'Lỗi trong quá trình quét dữ liệu!'
    }

    return { percent, step, text }
  }

  // Load projects list
  const fetchProjects = async (selectFirst = false) => {
    setIsLoadingProjects(true)
    try {
      const data = await youtubeResearchApi.getProjects()
      setProjects(data)
      if (selectFirst && data.length > 0) {
        setSelectedProjectId(data[0].id)
      }
    } catch (err: any) {
      toast.error('Không thể lấy danh sách dự án: ' + (err.message || 'Lỗi kết nối'))
    } finally {
      setIsLoadingProjects(false)
    }
  }

  // Load videos for selected project
  const fetchVideos = async (projectId: string, silent = false) => {
    if (!silent) setIsLoadingVideos(true)
    try {
      const data = await youtubeResearchApi.getProjectResults(projectId)
      setVideos(data)
      if (data.length > 0) {
        if (!selectedVideo || !data.some(v => v.id === selectedVideo.id)) {
          setSelectedVideo(data[0]) // Select the top opportunity video by default
        } else {
          const updated = data.find(v => v.id === selectedVideo.id)
          if (updated) setSelectedVideo(updated)
        }
      } else {
        setSelectedVideo(null)
      }
      return data
    } catch (err: any) {
      if (!silent) toast.error('Lỗi khi tải kết quả video: ' + (err.message || ''))
      return []
    } finally {
      if (!silent) setIsLoadingVideos(false)
    }
  }

  // Auto scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [terminalLogs])

  const writeLog = (msg: string, delay = 0): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setTerminalLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
        resolve()
      }, delay)
    })
  }

  useEffect(() => {
    fetchProjects(true)
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      fetchVideos(selectedProjectId)
    } else {
      setVideos([])
      setSelectedVideo(null)
    }

    // Clear any active polling when switching projects
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      setIsCrawling(false)
    }
  }, [selectedProjectId])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  // Start crawling task
  const handleCrawl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) {
      toast.warning('Vui lòng nhập từ khóa nghiên cứu')
      return
    }
    
    setIsCrawling(true)
    setActiveTab('results') // Switch to results/terminal tab on mobile
    setTerminalLogs([])
    setVideos([])
    setSelectedVideo(null)

    await writeLog(`Khởi chạy Crawler YouTube cho từ khóa: "${keyword}"...`, 50)
    await writeLog(`Thị trường mục tiêu: ${market} | Ngôn ngữ: ${language}`, 150)
    await writeLog(`Đang kết nối API Gateway và khởi động tác vụ ngầm Celery...`, 300)

    try {
      const res = await youtubeResearchApi.crawl({
        keyword,
        market,
        language,
        max_results: maxResults,
        order,
        video_duration: duration
      })
      
      await writeLog(`[Celery] Tác vụ đã được lên lịch thành công. Job ID: ${res.job_id}`, 200)
      await writeLog(`[Database] Đã tạo dự án nghiên cứu mới (ID: ${res.project_id}).`, 200)
      await writeLog(`[System] Đang chờ Celery worker gọi YouTube API & Gemini AI để tính điểm cơ hội...`, 300)
      
      // Update projects list
      fetchProjects()
      setSelectedProjectId(res.project_id)
      
      // Start polling for results
      let pollCount = 0
      pollingIntervalRef.current = setInterval(async () => {
        pollCount++
        await writeLog(`[System] Đang thăm dò kết quả từ cơ sở dữ liệu PostgreSQL (Lần thứ ${pollCount})...`)
        
        const currentResults = await fetchVideos(res.project_id, true)
        if (currentResults.length > 0) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          await writeLog(`[System] Đã nhận được ${currentResults.length} kết quả video đã được tính điểm từ Gemini AI!`, 100)
          await writeLog(`[Database] Đồng bộ hóa dữ liệu thành công vào bảng PostgreSQL.`, 100)
          await writeLog(`[System] Hoàn tất quét! Dữ liệu đã sẵn sàng hiển thị.`, 100)
          setIsCrawling(false)
          toast.success('Nghiên cứu YouTube đã hoàn thành!')
          setKeyword('')
        } else if (pollCount >= 15) {
          // Timeout after 37 seconds
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          await writeLog(`[Error] Quá thời gian chờ phản hồi từ Gemini AI. Vui lòng kiểm tra lại log của Celery worker!`, 100)
          setIsCrawling(false)
          toast.error('Tác vụ nghiên cứu YouTube bị quá giờ.')
        }
      }, 2500)
    } catch (err: any) {
      await writeLog(`[Error] Lỗi khi kích hoạt nghiên cứu: ${err.message}`, 100)
      toast.error('Lỗi khi kích hoạt cào: ' + (err.response?.data?.detail || err.message))
      setIsCrawling(false)
    }
  }

  // Delete project
  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteProjectId(projectId)
  }

  const executeDeleteProject = async (projectId: string) => {
    try {
      await youtubeResearchApi.deleteProject(projectId)
      toast.success('Đã xóa dự án thành công.')
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null)
      }
      fetchProjects()
    } catch (err: any) {
      toast.error('Lỗi khi xóa dự án: ' + err.message)
    }
  }

  const getScoreCircleClass = (score: number) => {
    if (score >= 70) return 'border-emerald-500 text-emerald-500 bg-emerald-500/5'
    if (score >= 40) return 'border-amber-500 text-amber-500 bg-amber-500/5'
    return 'border-rose-500 text-rose-500 bg-rose-500/5'
  }

  // Score badge formatter
  const renderScoreBadge = (score: number, label: string) => {
    return (
      <div className='flex flex-col items-center p-1.5 sm:p-2 rounded-lg bg-muted/30 border text-center flex-1 min-w-0'>
        <span className='text-[9px] sm:text-[10px] text-muted-foreground uppercase font-semibold truncate w-full'>{label}</span>
        <span className={`text-xs sm:text-sm font-bold mt-1 ${score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>
          {Math.round(score)}
        </span>
      </div>
    )
  }

  return (
    <>
      <Header fixed className='border-b bg-background/95 backdrop-blur-md'>
        <div className="flex items-center gap-2 font-bold text-lg text-primary me-auto">
          <Video className="w-6 h-6 text-red-500" />
          <span className="hidden sm:inline">YouTube Competitor & Opportunity Research</span>
          <span className="sm:hidden text-base">YouTube Research</span>
        </div>
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main fixed fluid className='p-0 overflow-hidden'>
        {/* Mobile Tabs Switcher */}
        <div className="flex border-b border-border md:hidden bg-card sticky top-0 z-10 shrink-0">
          <button 
            onClick={() => setActiveTab('control')} 
            className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all duration-200 ${
              activeTab === 'control' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Thiết lập
          </button>
          <button 
            onClick={() => setActiveTab('results')} 
            className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all duration-200 ${
              activeTab === 'results' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Kết quả
          </button>
          <button 
            onClick={() => setActiveTab('analysis')} 
            className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all duration-200 ${
              activeTab === 'analysis' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Chi tiết AI
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 h-full divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
          
          {/* ================= PANEL TRÁI: ĐIỀU KHIỂN & LỊCH SỬ ================= */}
          <div className={cn("flex flex-col h-full bg-muted/10 md:col-span-3 overflow-hidden", activeTab === 'control' ? 'flex' : 'hidden md:flex')}>
            <div className="p-4 border-b font-bold flex items-center gap-2 text-foreground shrink-0">
              <Search className="w-4 h-4 text-primary" />
              <span>Thiết lập Nghiên cứu</span>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <form onSubmit={handleCrawl} className="space-y-4 mb-6">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Từ khóa tìm kiếm</label>
                  <Input 
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Ví dụ: psychology, tài chính..." 
                    className="h-9"
                    disabled={isCrawling}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Thị trường</label>
                    <Select value={market} onValueChange={setMarket} disabled={isCrawling}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Thị trường" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VN">Việt Nam</SelectItem>
                        <SelectItem value="US">Mỹ (US)</SelectItem>
                        <SelectItem value="UK">Anh (UK)</SelectItem>
                        <SelectItem value="JP">Nhật Bản</SelectItem>
                        <SelectItem value="KR">Hàn Quốc</SelectItem>
                        <SelectItem value="TH">Thái Lan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Ngôn ngữ</label>
                    <Select value={language} onValueChange={setLanguage} disabled={isCrawling}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Ngôn ngữ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vi">Tiếng Việt</SelectItem>
                        <SelectItem value="en">Tiếng Anh</SelectItem>
                        <SelectItem value="ja">Tiếng Nhật</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Lượng kết quả</label>
                    <Select value={String(maxResults)} onValueChange={(val) => setMaxResults(Number(val))} disabled={isCrawling}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Số lượng" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 video</SelectItem>
                        <SelectItem value="10">10 video</SelectItem>
                        <SelectItem value="20">20 video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Thời lượng</label>
                    <Select value={duration} onValueChange={setDuration} disabled={isCrawling}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Thời lượng" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Bất kỳ</SelectItem>
                        <SelectItem value="short">Ngắn (&lt; 4p)</SelectItem>
                        <SelectItem value="medium">Vừa (4p - 20p)</SelectItem>
                        <SelectItem value="long">Dài (&gt; 20p)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Sắp xếp theo</label>
                  <Select value={order} onValueChange={setOrder} disabled={isCrawling}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sắp xếp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Độ liên quan</SelectItem>
                      <SelectItem value="date">Ngày đăng</SelectItem>
                      <SelectItem value="viewCount">Lượt xem</SelectItem>
                      <SelectItem value="rating">Đánh giá</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={isCrawling} className="w-full h-9 gap-2">
                  {isCrawling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang phân tích...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>Chạy Nghiên Cứu</span>
                    </>
                  )}
                </Button>
              </form>

              <div className="border-t pt-4">
                <div className="text-xs font-bold text-muted-foreground uppercase mb-3 tracking-wider">Lịch sử nghiên cứu</div>
                
                {isLoadingProjects ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center p-4 text-xs text-muted-foreground">Chưa có dự án nào được tạo.</div>
                ) : (
                  <div className="space-y-2">
                    {projects.map((p) => (
                      <div 
                        key={p.id}
                        onClick={() => setSelectedProjectId(p.id)}
                        className={`flex justify-between items-center p-3 rounded-lg border text-sm cursor-pointer transition-all duration-200 ${
                          selectedProjectId === p.id 
                            ? 'bg-primary/10 border-primary text-primary font-medium' 
                            : 'bg-card hover:bg-muted/50 border-border text-foreground'
                        }`}
                      >
                        <div className="truncate flex-1 pr-2">
                          <div className="truncate">{p.name.replace('Research: ', '')}</div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {new Date(p.created_at).toLocaleDateString('vi-VN')} {new Date(p.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={(e) => handleDeleteProject(p.id, e)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ================= PANEL GIỮA: DANH SÁCH VIDEO & SCORE ================= */}
          <div className={cn("flex flex-col h-full bg-background md:col-span-4 overflow-hidden", activeTab === 'results' ? 'flex' : 'hidden md:flex')}>
            <div className="p-4 border-b font-bold flex justify-between items-center text-foreground shrink-0">
              <span className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <span>Tiến trình Crawler & Danh sách Video</span>
              </span>
              {selectedProjectId && videos.length > 0 && (
                <a 
                  href={youtubeResearchApi.getExportCsvUrl(selectedProjectId)}
                  download
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow transition-all duration-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất CSV</span>
                </a>
              )}
            </div>

            {/* Visual Progress Stepper & Collapsible Logs */}
            {terminalLogs.length > 0 && (() => {
              const { percent, step, text } = getProgressState()
              return (
                <div className="p-4 border-b border-border bg-card shrink-0 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      {isCrawling ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      ) : step === 5 ? (
                        <span className="w-2 h-2 rounded-full bg-destructive" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                      <span>{text}</span>
                    </span>
                    <span className="font-mono text-muted-foreground font-semibold">{percent}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500 rounded-full",
                        step === 5 ? "bg-destructive" : "bg-primary"
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* Milestones Stepper */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[
                      { label: 'Khởi tạo', num: 1 },
                      { label: 'Cào dữ liệu', num: 2 },
                      { label: 'Gemini AI', num: 3 },
                      { label: 'Lưu trữ', num: 4 },
                    ].map((s) => {
                      const isSuccess = step > s.num && step !== 5
                      const isActive = step === s.num
                      const isFailed = step === 5 && s.num >= 3
                      return (
                        <div key={s.num} className="flex flex-col items-center text-center space-y-1">
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-300",
                            isSuccess ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" :
                            isActive ? "bg-primary border-primary text-primary-foreground scale-110 shadow-sm shadow-primary/25" :
                            isFailed ? "bg-destructive/10 border-destructive text-destructive" :
                            "bg-muted border-muted text-muted-foreground"
                          )}>
                            {isSuccess ? '✓' : s.num}
                          </div>
                          <span className={cn(
                            "text-[9px] font-semibold tracking-wide uppercase",
                            isActive ? "text-primary font-bold" : "text-muted-foreground"
                          )}>
                            {s.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Chatbot-style agent logs */}
                  <div className="space-y-2 text-left">
                    <span className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider block">
                      Nhật ký hoạt động của Trợ lý AI
                    </span>
                    <div className="max-h-52 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin scrollbar-thumb-hairline scrollbar-track-transparent">
                      {terminalLogs.map((log, i) => {
                        const parsed = parseLogLine(log);
                        
                        let IconComponent = Sparkles;
                        let iconColor = "text-sky-400 bg-sky-400/10";
                        
                        if (parsed.category === 'celery') {
                          IconComponent = Cpu;
                          iconColor = "text-indigo-400 bg-indigo-400/10";
                        } else if (parsed.category === 'database') {
                          IconComponent = Database;
                          iconColor = "text-amber-400 bg-amber-400/10";
                        } else if (parsed.category === 'error') {
                          IconComponent = AlertCircle;
                          iconColor = "text-destructive bg-destructive/10 animate-bounce";
                        } else if (parsed.category === 'info' && log.includes('Khởi chạy')) {
                          IconComponent = PlayCircle;
                          iconColor = "text-emerald-400 bg-emerald-400/10";
                        }
                        
                        return (
                          <div key={i} className="flex gap-2.5 items-start animate-in fade-in duration-300">
                            <div className={cn("p-1.5 rounded-lg shrink-0 border border-hairline", iconColor)}>
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 bg-surface-2 border border-hairline/80 rounded-xl px-3 py-2 text-xs text-ink-muted shadow-sm hover:border-hairline transition-all duration-200">
                              <div className="flex justify-between items-center gap-2 mb-0.5">
                                <span className="font-bold text-[10px] text-ink-subtle">{parsed.label}</span>
                                {parsed.time && (
                                  <span className="font-mono text-[9px] text-ink-tertiary">{parsed.time}</span>
                                )}
                              </div>
                              <p className="leading-relaxed text-ink-muted text-[11px] whitespace-pre-line">{parsed.content}</p>
                            </div>
                          </div>
                        )
                      })}
                      {isCrawling && (
                        <div className="flex gap-2.5 items-start">
                          <div className="p-1.5 rounded-lg shrink-0 border border-hairline text-primary bg-primary/10 animate-pulse">
                            <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                          </div>
                          <div className="flex-1 bg-surface-2/40 border border-dashed border-hairline/80 rounded-xl px-3 py-2 text-xs text-ink-subtle italic flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin text-primary" />
                            <span className="text-[11px]">Trợ lý đang phân tích & cào dữ liệu...</span>
                          </div>
                        </div>
                      )}
                      <div ref={terminalEndRef} />
                    </div>
                  </div>

                  {/* Collapsible raw logs for development/debugging */}
                  <details className="group mt-1 pt-1 border-t border-hairline/50 text-left">
                    <summary className="list-none flex items-center gap-1 text-[9px] font-semibold text-ink-tertiary hover:text-ink-subtle cursor-pointer select-none">
                      <ChevronRight className="w-2.5 h-2.5 transition-transform duration-200 group-open:rotate-90" />
                      <span>Xem nhật ký hệ thống đầy đủ (Developer Logs)</span>
                    </summary>
                    <div className="mt-1.5 max-h-24 bg-canvas text-emerald-400 p-2 font-mono text-[9px] overflow-y-auto border border-hairline rounded-lg select-text">
                      <div className="space-y-0.5">
                        {terminalLogs.map((log, i) => (
                          <div key={i}>{log}</div>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
              )
            })()}
            
            {isLoadingVideos ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground font-medium">Đang tải và tính điểm video...</span>
              </div>
            ) : !selectedProjectId ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center max-w-sm bg-card shadow-sm">
                  <Video className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <span className="text-sm font-bold text-foreground">Chưa chọn dự án nghiên cứu</span>
                  <span className="text-xs mt-1 leading-normal text-muted-foreground">Chọn một dự án ở Panel Trái hoặc nhập từ khóa để quét mới.</span>
                </div>
              </div>
            ) : videos.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center max-w-sm bg-card shadow-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <span className="text-sm font-bold text-foreground">Đang cào dữ liệu từ YouTube API...</span>
                  <span className="text-xs mt-1 leading-normal text-muted-foreground">Hệ thống đang gọi API và tính điểm, vui lòng đợi trong giây lát.</span>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {videos.map((v) => (
                    <div 
                      key={v.id}
                      onClick={() => {
                        setSelectedVideo(v)
                        setActiveTab('analysis') // Auto switch tab to AI details on mobile
                      }}
                      className={`flex flex-col sm:flex-row items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-300 hover:shadow-md ${
                        selectedVideo?.id === v.id 
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      {/* Thumbnail with aspect ratio */}
                      <div className="w-full sm:w-36 aspect-video bg-muted rounded-lg overflow-hidden relative flex-shrink-0 shadow-sm border border-border/50">
                        <img 
                          src={v.thumbnail_url} 
                          alt={v.title}
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://img.youtube.com/vi/placeholder/0.jpg'
                          }}
                        />
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug hover:text-primary transition-colors duration-200">
                            {v.title}
                          </h4>
                          <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            <span>Kênh: <span className="font-medium text-foreground">{v.channel_title}</span> ({Math.round(v.channel_subscribers / 1000)}k subs)</span>
                          </div>
                        </div>
                        
                        {/* Statistics with colored visual layout */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/10">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {v.view_count >= 1000000 ? `${(v.view_count / 1000000).toFixed(1)}M` : `${Math.round(v.view_count / 1000)}k`} lượt xem
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/10">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            {v.like_count >= 1000 ? `${(v.like_count / 1000).toFixed(1)}k` : v.like_count} thích
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/10">
                            VPH: {Math.round(v.vph)}
                          </span>
                        </div>
                      </div>

                      {/* Score indicator & copy action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto gap-2.5 sm:gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 flex-shrink-0">
                        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 shadow-sm transition-transform duration-300 hover:scale-105", getScoreCircleClass(v.opportunity_score))}>
                            {Math.round(v.opportunity_score)}
                          </div>
                          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:inline">Cơ hội</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-[10px] font-bold gap-1 border-primary/20 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation()
                              const textToCopy = `Dự án: ${projects.find(p => p.id === selectedProjectId)?.name.replace('Research: ', '') || ''}\nTiêu đề: ${v.title}\nKênh: ${v.channel_title}\nLượt xem: ${v.view_count.toLocaleString()} | Lượt thích: ${v.like_count.toLocaleString()} | VPH: ${Math.round(v.vph)}\nĐiểm cơ hội: ${Math.round(v.opportunity_score)}\nĐường dẫn: ${v.url}\nKết luận AI: ${v.ai_analysis?.conclusion || 'Chưa có phân tích'}`;
                              navigator.clipboard.writeText(textToCopy)
                              toast.success('Đã sao chép thông tin tổng hợp video!')
                            }}
                            title="Sao chép thông tin tổng hợp vào Clipboard"
                          >
                            <Copy className="w-3 h-3 text-primary" />
                            <span>Tổng hợp</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* ================= PANEL PHẢI: KỊCH BẢN & PHÂN TÍCH AI (GEMINI) ================= */}
          <div className={cn("flex flex-col h-full bg-muted/5 md:col-span-5 overflow-hidden", activeTab === 'analysis' ? 'flex' : 'hidden md:flex')}>
            <div className="p-4 border-b font-bold flex items-center gap-2 text-foreground shrink-0">
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Phân Tích Đối Thủ & Kịch Bản AI</span>
            </div>
            
            {!selectedVideo ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center max-w-sm bg-card shadow-sm">
                  <FileText className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <span className="text-sm font-bold text-foreground">Chưa có phân tích</span>
                  <span className="text-xs mt-1 leading-normal text-muted-foreground">Chọn một video ở Panel Giữa để xem phân tích và kịch bản AI chi tiết.</span>
                </div>
              </div>
            ) : !selectedVideo.ai_analysis ? (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 p-2">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2 text-xs text-amber-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Chưa có Phân tích AI</p>
                      <p className="mt-1 leading-normal">
                        Gemini AI chỉ phân tích video có **Điểm cơ hội cao nhất** trong đợt quét. Video này không có sẵn phân tích AI.
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-3 border rounded-lg bg-card space-y-2">
                    <h4 className="text-xs font-bold text-foreground">Thông tin video</h4>
                    <p className="text-xs text-muted-foreground leading-normal line-clamp-4">{selectedVideo.description}</p>
                    <a 
                      href={selectedVideo.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-block text-xs text-primary font-semibold hover:underline mt-1"
                    >
                      Xem video gốc trên YouTube &rarr;
                    </a>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-5 pb-6">
                  {/* AI Conclusion Header */}
                  <Card className="p-4 border-amber-500/20 bg-amber-500/5 shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-xs text-amber-600 mb-2">
                      <Sparkles className="w-3.5 h-3.5 fill-amber-600" />
                      <span>KẾT LUẬN CỦA GEMINI AI</span>
                    </div>
                    <p className="text-sm font-bold text-foreground leading-tight">
                      {selectedVideo.ai_analysis.conclusion}
                    </p>
                  </Card>

                  {/* 5 Scoring Metrics */}
                  <div className="grid grid-cols-5 gap-1">
                    {renderScoreBadge(selectedVideo.performance_score, "View/Sub")}
                    {renderScoreBadge(selectedVideo.title_score, "Tiêu đề")}
                    {renderScoreBadge(selectedVideo.thumbnail_score, "Thumb")}
                    {renderScoreBadge(selectedVideo.remake_score, "Làm lại")}
                    {renderScoreBadge(selectedVideo.opportunity_score, "Cơ Hội")}
                  </div>

                  {/* Section: Tại sao video thành công */}
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      Yếu tố Triệu View
                    </h5>
                    <p className="text-xs text-foreground leading-relaxed p-3 rounded-lg bg-card border">
                      {selectedVideo.ai_analysis.reason_for_success}
                    </p>
                  </div>

                  {/* Section: Format & Insights */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-bold text-foreground">Định dạng & Chủ đề</h5>
                      <p className="text-[11px] text-muted-foreground leading-relaxed p-3 rounded-lg bg-card border">
                        {selectedVideo.ai_analysis.topic_summary}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-bold text-foreground">Insight Người Xem</h5>
                      <p className="text-[11px] text-muted-foreground leading-relaxed p-3 rounded-lg bg-card border">
                        {selectedVideo.ai_analysis.viewer_insight}
                      </p>
                    </div>
                  </div>

                  {/* Section: Lời khuyên làm lại */}
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-foreground">Lời khuyên remake tốt hơn</h5>
                    <p className="text-xs text-foreground leading-relaxed p-3 rounded-lg bg-card border">
                      {selectedVideo.ai_analysis.remake_advice}
                    </p>
                  </div>

                  {/* Section: Tiêu đề gợi ý */}
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-foreground">Gợi ý 3 tiêu đề hấp dẫn hơn</h5>
                    <div className="text-xs text-foreground leading-relaxed p-3 rounded-lg bg-card border divide-y divide-border space-y-2">
                      {selectedVideo.ai_analysis.suggested_title?.split('\n').map((title, i) => (
                        <div key={i} className="pt-2 first:pt-0 font-medium text-foreground">{title}</div>
                      ))}
                    </div>
                  </div>

                  {/* Section: Thumbnail Text */}
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-foreground">Text đưa lên Thumbnail</h5>
                    <p className="text-xs font-bold text-amber-500 bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-lg text-center">
                      "{selectedVideo.ai_analysis.suggested_thumbnail_text}"
                    </p>
                  </div>

                  {/* Section: Cấu trúc kịch bản 3 hồi */}
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-foreground">Cấu trúc kịch bản gợi ý</h5>
                    <pre className="text-[11px] text-foreground leading-relaxed p-3 rounded-lg bg-card border whitespace-pre-wrap font-sans">
                      {selectedVideo.ai_analysis.suggested_outline}
                    </pre>
                  </div>

                  {/* Section: Prompt AI */}
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-foreground">AI Prompt viết kịch bản chi tiết</h5>
                    <div className="relative group">
                      <pre className="text-[11px] text-muted-foreground leading-relaxed p-3 rounded-lg bg-muted border whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                        {selectedVideo.ai_analysis.suggested_prompt}
                      </pre>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedVideo.ai_analysis?.suggested_prompt || '')
                          toast.success('Đã copy Prompt AI vào clipboard!')
                        }}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        Copy
                      </Button>

                    </div>
                  </div>

                </div>
              </ScrollArea>
            )}
          </div>

        </div>
      </Main>

      <AlertDialog open={deleteProjectId !== null} onOpenChange={(open) => { if (!open) setDeleteProjectId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa dự án</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa dự án nghiên cứu này? Tất cả các video, kênh và phân tích AI liên quan sẽ bị xóa vĩnh viễn khỏi PostgreSQL database. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteProjectId) {
                  executeDeleteProject(deleteProjectId)
                  setDeleteProjectId(null)
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
