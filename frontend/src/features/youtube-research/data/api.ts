import axios from 'axios'

// API base URL for FastAPI backend
const API_BASE_URL = 'http://localhost:8080/api/v1/youtube-research'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface YouTubeResearchRequest {
  keyword: string
  market: string
  language: string
  max_results: number
  order: string
  video_duration: string
  main_topic?: string
  gemini_api_key?: string
  youtube_api_key?: string
}


export interface YouTubeResearchResponse {
  project_id: string
  job_id: string
  status: string
  message: string
}

export interface ProjectResponse {
  id: string
  name: string
  market?: string
  language?: string
  main_topic?: string
  created_at: string
  updated_at: string
}

export interface AIAnalysisSchema {
  topic_summary?: string
  viewer_insight?: string
  title_analysis?: string
  thumbnail_analysis?: string
  reason_for_success?: string
  remake_advice?: string
  suggested_title?: string
  suggested_thumbnail_text?: string
  suggested_outline?: string
  suggested_prompt?: string
  conclusion?: string
}

export interface VideoResultSchema {
  id: string
  channel_id: string
  title?: string
  url?: string
  description?: string
  published_at?: string
  duration?: string
  view_count: number
  like_count: number
  comment_count: number
  thumbnail_url?: string
  keyword_source?: string
  channel_title?: string
  channel_subscribers: number
  performance_score: number
  title_score: number
  thumbnail_score: number
  remake_score: number
  production_difficulty: number
  opportunity_score: number
  vph: number
  ai_analysis?: AIAnalysisSchema
}

export const youtubeResearchApi = {
  crawl: async (data: YouTubeResearchRequest): Promise<YouTubeResearchResponse> => {
    const payload = {
      ...data,
      gemini_api_key: localStorage.getItem('gemini_api_key') || undefined,
      youtube_api_key: localStorage.getItem('youtube_api_key') || undefined,
    }
    const res = await api.post<YouTubeResearchResponse>('/crawl', payload)
    return res.data
  },

  getProjects: async (): Promise<ProjectResponse[]> => {
    const res = await api.get<ProjectResponse[]>('/projects')
    return res.data
  },

  getProjectResults: async (projectId: string): Promise<VideoResultSchema[]> => {
    const res = await api.get<VideoResultSchema[]>(`/projects/${projectId}/results`)
    return res.data
  },

  deleteProject: async (projectId: string): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/projects/${projectId}`)
    return res.data
  },

  getExportCsvUrl: (projectId: string): string => {
    return `${API_BASE_URL}/projects/${projectId}/export/csv`
  },
}
