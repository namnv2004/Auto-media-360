import { createFileRoute } from '@tanstack/react-router'
import { TikTokResearch } from '@/features/tiktok-research'

export const Route = createFileRoute('/_authenticated/tiktok-research/')({
  component: TikTokResearch,
})
