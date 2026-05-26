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
  Music, Terminal, FileText, Search, Copy, Users, MessageSquare, Heart,
  Loader2, Trash2, Download, Sparkles, ChevronRight, Cpu, Database, PlayCircle,
  AlertCircle
} from 'lucide-react'
import { tiktokResearchApi, TikTokTrendResult, ProjectResponse } from './data/api'
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

export function TikTokResearch() {
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [trends, setTrends] = useState<TikTokTrendResult[]>([])
  const [selectedTrend, setSelectedTrend] = useState<TikTokTrendResult | null>(null)
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  
  // Mobile responsive tab state
  const [activeTab, setActiveTab] = useState<'control' | 'results' | 'analysis'>('control')
  
  // Form states
  const [keyword, setKeyword] = useState('')
  const [market, setMarket] = useState('VN')
  const [language, setLanguage] = useState('vi')
  
  const [isCrawling, setIsCrawling] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingTrends, setIsLoadingTrends] = useState(false)
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

  // Load projects list
  const fetchProjects = async (selectFirst = false) => {
    setIsLoadingProjects(true)
    try {
      const data = await tiktokResearchApi.getProjects()
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

  // Load results for selected project
  const fetchTrends = async (projectId: string, silent = false) => {
    if (!silent) setIsLoadingTrends(true)
    try {
      const data = await tiktokResearchApi.getProjectResults(projectId)
      setTrends(data)
      if (data.length > 0) {
        // Find the selected trend or default to the first one
        if (!selectedTrend || !data.some(t => t.id === selectedTrend.id)) {
          setSelectedTrend(data[0])
        } else {
          // Update selected trend data
          const updated = data.find(t => t.id === selectedTrend.id)
          if (updated) setSelectedTrend(updated)
        }
      } else {
        setSelectedTrend(null)
      }
      return data
    } catch (err: any) {
      if (!silent) toast.error('Lỗi khi tải kết quả TikTok: ' + (err.message || ''))
      return []
    } finally {
      if (!silent) setIsLoadingTrends(false)
    }
  }

  useEffect(() => {
    fetchProjects(true)
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      fetchTrends(selectedProjectId)
    } else {
      setTrends([])
      setSelectedTrend(null)
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
  const handleStartCrawl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) {
      toast.warning('Vui lòng nhập từ khóa nghiên cứu TikTok')
      return
    }

    setIsCrawling(true)
    setActiveTab('results') // Switch to results/terminal tab on mobile
    setTerminalLogs([])
    setTrends([])
    setSelectedTrend(null)

    await writeLog(`Khởi chạy Crawler TikTok cho từ khóa: "${keyword}"...`, 50)
    await writeLog(`Thị trường mục tiêu: ${market} | Ngôn ngữ: ${language}`, 150)
    await writeLog(`Đang kết nối API Gateway và khởi động tác vụ ngầm Celery...`, 300)
    
    try {
      const res = await tiktokResearchApi.crawl({
        keyword,
        market,
        language
      })
      
      await writeLog(`[Celery] Tác vụ đã được lên lịch thành công. Job ID: ${res.job_id}`, 200)
      await writeLog(`[Database] Đã tạo dự án nghiên cứu mới (ID: ${res.project_id}).`, 200)
      await writeLog(`[System] Đang chờ Celery worker gọi Gemini AI để cào dữ liệu và sinh kịch bản...`, 300)
      
      // Update projects list
      fetchProjects()
      setSelectedProjectId(res.project_id)
      
      // Start polling for results
      let pollCount = 0
      pollingIntervalRef.current = setInterval(async () => {
        pollCount++
        await writeLog(`[System] Đang thăm dò kết quả từ cơ sở dữ liệu PostgreSQL (Lần thứ ${pollCount})...`)
        
        const currentResults = await fetchTrends(res.project_id, true)
        if (currentResults.length > 0) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          await writeLog(`[System] Đã nhận được ${currentResults.length} kịch bản xu hướng từ Gemini AI!`, 100)
          await writeLog(`[Database] Đồng bộ hóa dữ liệu thành công vào bảng PostgreSQL.`, 100)
          await writeLog(`[System] Hoàn tất quét! Dữ liệu đã sẵn sàng hiển thị.`, 100)
          setIsCrawling(false)
          toast.success('Nghiên cứu TikTok đã hoàn thành!')
          setKeyword('')
        } else if (pollCount >= 15) {
          // Timeout after 30 seconds
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          await writeLog(`[Error] Quá thời gian chờ phản hồi từ Gemini AI. Vui lòng kiểm tra lại log của Celery worker!`, 100)
          setIsCrawling(false)
          toast.error('Tác vụ nghiên cứu TikTok bị quá giờ.')
        }
      }, 2500)

    } catch (err: any) {
      await writeLog(`[Error] Lỗi khi kích hoạt nghiên cứu: ${err.message}`, 100)
      toast.error('Lỗi khi kích hoạt cào TikTok: ' + err.message)
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
      await tiktokResearchApi.deleteProject(projectId)
      toast.success('Đã xóa dự án thành công.')
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null)
      }
      fetchProjects()
    } catch (err: any) {
      toast.error('Lỗi khi xóa dự án: ' + err.message)
    }
  }

  const handleCopyScript = (scriptText: string) => {
    navigator.clipboard.writeText(scriptText)
    toast.success('Đã copy kịch bản vào clipboard!')
  }

  return (
    <>
      <Header fixed className='border-b bg-background/95 backdrop-blur-md'>
        <div className="flex items-center gap-2 font-bold text-lg text-primary me-auto">
          <Music className="w-6 h-6 text-pink-500" />
          <span className="hidden sm:inline">TikTok News & Script Generator (Database-backed)</span>
          <span className="sm:hidden text-base">TikTok Research</span>
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
            Kịch bản AI
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 h-full divide-y md:divide-y-0 md:divide-x divide-border overflow-hidden">
          
          {/* ================= PANEL TRÁI: ĐIỀU KHIỂN & LỊCH SỬ ================= */}
          <div className={cn("flex flex-col h-full bg-muted/10 md:col-span-3 overflow-hidden", activeTab === 'control' ? 'flex' : 'hidden md:flex')}>
            <div className="p-4 border-b font-bold flex items-center gap-2 text-foreground shrink-0">
              <Search className="w-4 h-4 text-primary" />
              <span>Cài đặt từ khóa</span>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <form onSubmit={handleStartCrawl} className="space-y-4 mb-6">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Từ khóa tìm kiếm xu hướng</label>
                  <Input 
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Ví dụ: AI, ChatGPT, Đầu tư..." 
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
                        <SelectItem value="JP">Nhật Bản</SelectItem>
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
                
                <Button type="submit" disabled={isCrawling} className="w-full h-9 gap-2">
                  {isCrawling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang phân tích...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>Tìm xu hướng TikTok</span>
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
                          <div className="truncate">{p.name.replace('TikTok Research: ', '')}</div>
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

          {/* ================= PANEL GIỮA: TERMINAL & KẾT QUẢ ================= */}
          <div className={cn("flex flex-col h-full bg-background md:col-span-4 overflow-hidden", activeTab === 'results' ? 'flex' : 'hidden md:flex')}>
            <div className="p-4 border-b font-bold flex justify-between items-center text-foreground shrink-0">
              <span className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <span>Tiến trình Crawler & Chủ đề Xu hướng</span>
              </span>
              {selectedProjectId && trends.length > 0 && (
                <a 
                  href={tiktokResearchApi.getExportCsvUrl(selectedProjectId)}
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
            
            {isLoadingTrends ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground font-medium">Đang lấy xu hướng TikTok từ database...</span>
              </div>
            ) : !selectedProjectId ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center max-w-sm bg-card shadow-sm">
                  <Music className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <span className="text-sm font-bold text-foreground">Chưa chọn dự án nghiên cứu TikTok</span>
                  <span className="text-xs mt-1 leading-normal text-muted-foreground">Chọn dự án ở Panel Trái hoặc nhập từ khóa quét mới để chạy real-time.</span>
                </div>
              </div>
            ) : trends.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center max-w-sm bg-card shadow-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <span className="text-sm font-bold text-foreground">Đang sinh xu hướng từ Gemini AI...</span>
                  <span className="text-xs mt-1 leading-normal text-muted-foreground">Celery worker đang gọi API. Vui lòng xem tiến trình trong console log trên.</span>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Xu hướng nổi bật cào được ({trends.length})
                  </div>
                  
                  {trends.map((t) => (
                    <div 
                      key={t.id}
                      onClick={() => {
                        setSelectedTrend(t)
                        setActiveTab('analysis') // Auto switch tab to AI script details on mobile
                      }}
                      className={`p-4 border rounded-xl cursor-pointer transition-all duration-300 hover:shadow-md ${
                        selectedTrend?.id === t.id 
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      <h4 className="text-sm font-semibold text-foreground leading-snug hover:text-primary transition-colors duration-200">
                        {t.title}
                      </h4>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/10 font-medium">
                          <Users className="w-3.5 h-3.5 text-sky-500" /> {t.views} lượt xem
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/10 font-medium">
                          <Heart className="w-3.5 h-3.5 text-rose-500" /> {t.likes} lượt thích
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/10 font-medium">
                          <MessageSquare className="w-3.5 h-3.5 text-purple-500" /> Tương tác: <span className="font-bold">{t.engagement}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4 pt-2 border-t border-border/40">
                        <div className="text-[11px] text-muted-foreground">
                          {t.age_group && (
                            <span>Khán giả chính: <span className="font-semibold text-foreground">{t.age_group}</span></span>
                          )}
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[10px] font-bold gap-1 border-primary/20 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation()
                            const textToCopy = `Dự án TikTok: ${projects.find(p => p.id === selectedProjectId)?.name.replace('TikTok Research: ', '') || ''}\nChủ đề xu hướng: ${t.title}\nLượt xem: ${t.views} | Lượt thích: ${t.likes}\nTỷ lệ tương tác: ${t.engagement}\nKhán giả chính: ${t.age_group || 'Chưa rõ'}\nNhạc đề xuất: ${t.music || 'Không'}\nKịch bản Hook: ${t.script_hook || ''}\nKịch bản Body: ${t.script_body || ''}\nKịch bản CTA: ${t.script_cta || ''}`;
                            navigator.clipboard.writeText(textToCopy)
                            toast.success('Đã sao chép kịch bản & thông tin tổng hợp xu hướng!')
                          }}
                          title="Sao chép kịch bản & thông tin tổng hợp"
                        >
                          <Copy className="w-3 h-3 text-primary" />
                          <span>Tổng hợp</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* ================= PANEL PHẢI: KỊCH BẢN AI ================= */}
          <div className={cn("flex flex-col h-full bg-muted/5 md:col-span-5 overflow-hidden", activeTab === 'analysis' ? 'flex' : 'hidden md:flex')}>
            <div className="p-4 border-b font-bold flex items-center gap-2 text-foreground shrink-0">
              <FileText className="w-4 h-4 text-primary" />
              <span>Kịch bản video ngắn (AI)</span>
            </div>
            
            {!selectedTrend ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center max-w-sm bg-card shadow-sm">
                  <FileText className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <span className="text-sm font-bold text-foreground">Chưa chọn xu hướng</span>
                  <span className="text-xs mt-1 leading-normal text-muted-foreground">Chọn một chủ đề xu hướng ở Panel Giữa để xem kịch bản video AI chi tiết.</span>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 pb-6">
                  
                  {/* Music recommendation */}
                  {selectedTrend.music && (
                    <Card className="p-3 bg-card border shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-1">
                        <Music className="w-4 h-4 text-pink-500" />
                        <span>Nhạc đề xuất (Trending)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {selectedTrend.music}
                      </p>
                    </Card>
                  )}

                  {/* Hook */}
                  {selectedTrend.script_hook && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-primary uppercase">1. Tiêu đề gây chú ý (Hook - 3 giây đầu)</span>
                        <Button size="sm" variant="ghost" onClick={() => handleCopyScript(selectedTrend.script_hook || '')} className="h-6 w-6 p-0">
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs font-bold text-foreground p-3 rounded-lg bg-card border leading-relaxed">
                        {selectedTrend.script_hook}
                      </p>
                    </div>
                  )}

                  {/* Body */}
                  {selectedTrend.script_body && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-primary uppercase">2. Nội dung chính (Body - 30 giây tiếp)</span>
                        <Button size="sm" variant="ghost" onClick={() => handleCopyScript(selectedTrend.script_body || '')} className="h-6 w-6 p-0">
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-foreground p-3 rounded-lg bg-card border leading-relaxed">
                        {selectedTrend.script_body}
                      </p>
                    </div>
                  )}

                  {/* CTA */}
                  {selectedTrend.script_cta && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-primary uppercase">3. Kêu gọi hành động (CTA - 5 giây cuối)</span>
                        <Button size="sm" variant="ghost" onClick={() => handleCopyScript(selectedTrend.script_cta || '')} className="h-6 w-6 p-0">
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-foreground p-3 rounded-lg bg-card border leading-relaxed">
                        {selectedTrend.script_cta}
                      </p>
                    </div>
                  )}

                  {/* Hashtags */}
                  {selectedTrend.hashtags && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Hashtags đi kèm</span>
                      <pre className="text-[10px] text-primary bg-primary/5 p-2 rounded border font-mono whitespace-pre-wrap">
                        {selectedTrend.hashtags}
                      </pre>
                    </div>
                  )}

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
              Bạn có chắc chắn muốn xóa dự án TikTok này? Tất cả các kịch bản xu hướng liên quan sẽ bị xóa vĩnh viễn khỏi PostgreSQL database. Hành động này không thể hoàn tác.
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
