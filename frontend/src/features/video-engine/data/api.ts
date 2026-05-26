import axios from 'axios'

const API_BASE_URL = 'http://localhost:8080/api/v1/video'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface ScriptSegment {
  id: string
  job_id: string
  order_index: number
  text: string
  keyword?: string
  image_url?: string
}

export interface VideoJob {
  id: string
  keyword?: string
  source_url?: string
  status: string
  job_type: string
  full_script?: string
  created_at: string
  updated_at?: string
  segments: ScriptSegment[]
}

export interface CreateJobRequest {
  source_type: string
  source_id?: string
  custom_keyword?: string
  gemini_api_key?: string
}

export interface CreateJobResponse {
  job_id: string
  message: string
  status: string
}

export interface RegenerateResponse {
  id: string
  job_id: string
  order_index: number
  text: string
  keyword: string
  image_url?: string
  message: string
}

export const videoEngineApi = {
  getJobs: async (): Promise<VideoJob[]> => {
    const res = await api.get<VideoJob[]>('/jobs')
    return res.data
  },

  getJobDetails: async (jobId: string): Promise<VideoJob> => {
    const res = await api.get<VideoJob>(`/jobs/${jobId}`)
    return res.data
  },

  createScriptJob: async (data: CreateJobRequest): Promise<CreateJobResponse> => {
    const payload = {
      ...data,
      gemini_api_key: localStorage.getItem('gemini_api_key') || undefined,
    }
    const res = await api.post<CreateJobResponse>('/rewrite-script', payload)
    return res.data
  },

  regenerateSegmentImage: async (segmentId: string, keyword: string): Promise<RegenerateResponse> => {
    const res = await api.post<RegenerateResponse>(`/segments/${segmentId}/regenerate`, { keyword })
    return res.data
  },

  deleteJob: async (jobId: string): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/jobs/${jobId}`)
    return res.data
  },
}
