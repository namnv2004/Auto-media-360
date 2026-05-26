import { createFileRoute } from '@tanstack/react-router'
import { YouTubeResearch } from '@/features/youtube-research'

export const Route = createFileRoute('/_authenticated/youtube-research/')({
  component: YouTubeResearch,
})
