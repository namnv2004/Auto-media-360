import { createFileRoute } from '@tanstack/react-router'
import { VideoEngine } from '@/features/video-engine'

export const Route = createFileRoute('/_authenticated/video-engine/')({
  component: VideoEngine,
})
