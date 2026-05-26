import axios from 'axios'

const API_BASE_URL = 'http://localhost:8080/api/v1/tiktok-research'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface TikTokResearchRequest {
  keyword: string
  market: string
  language: string
  gemini_api_key?: string
  tiktok_api_key?: string
}

export interface TikTokResearchResponse {
  project_id: string
  job_id: string
  status: string
  message: string
}

export interface ProjectResponse {
  id: string
  name: string
  keyword: string
  created_at: string
  updated_at: string
}

export interface TikTokTrendResult {
  id: string
  project_id: string
  title: string
  views?: string
  likes?: string
  comments?: string
  engagement?: string
  age_group?: string
  
  script_hook?: string
  script_body?: string
  script_cta?: string
  hashtags?: string
  music?: string
  created_at: string
}

export const tiktokResearchApi = {
  crawl: async (data: TikTokResearchRequest): Promise<TikTokResearchResponse> => {
    const payload = {
      ...data,
      gemini_api_key: localStorage.getItem('gemini_api_key') || undefined,
      tiktok_api_key: localStorage.getItem('tiktok_api_key') || undefined,
    }
    const res = await api.post<TikTokResearchResponse>('/crawl', payload)
    return res.data
  },

  getProjects: async (): Promise<ProjectResponse[]> => {
    const res = await api.get<ProjectResponse[]>('/projects')
    return res.data
  },

  getProjectResults: async (projectId: string): Promise<TikTokTrendResult[]> => {
    const res = await api.get<TikTokTrendResult[]>(`/projects/${projectId}/results`)
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
