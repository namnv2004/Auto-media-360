import React from 'react'
import {
  Settings,
  Users,
  Command,
  Clapperboard,
} from 'lucide-react'
import { type SidebarData } from '../types'

// Custom brand icons
function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return React.createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className: props.className,
      width: '1em',
      height: '1em',
      ...props,
    },
    React.createElement('path', {
      d: 'M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z',
    }),
    React.createElement('polygon', {
      points: '10 15 15 12 10 9',
      fill: 'currentColor',
    })
  )
}

function TiktokIcon(props: React.SVGProps<SVGSVGElement>) {
  return React.createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className: props.className,
      width: '1em',
      height: '1em',
      ...props,
    },
    React.createElement('path', {
      d: 'M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5',
    })
  )
}

export const sidebarData: SidebarData = {
  user: {
    name: 'Admin',
    email: 'admin@smedia360.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Auto Media 360',
      logo: Command,
      plan: 'Enterprise',
    },
  ],
  navGroups: [
    {
      title: 'Nghiên cứu thị trường',
      items: [
        {
          title: 'YouTube Research',
          url: '/youtube-research',
          icon: YoutubeIcon,
        },
        {
          title: 'TikTok Research',
          url: '/tiktok-research',
          icon: TiktokIcon,
        },
        {
          title: 'Script & Asset Engine',
          url: '/video-engine',
          icon: Clapperboard,
        },
      ],
    },
    {
      title: 'Hệ thống',
      items: [
        {
          title: 'Users',
          url: '/users',
          icon: Users,
        },
        {
          title: 'Settings',
          url: '/settings',
          icon: Settings,
        },
      ],
    },
  ],
}


