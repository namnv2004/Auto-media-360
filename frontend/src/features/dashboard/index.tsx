import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

export function Dashboard() {
  return (
    <>
      <Header>
        <TopNav links={topNav} className='me-auto' />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className='h-[calc(100vh-4rem)] p-0 m-0'>
        <div className="grid grid-cols-1 md:grid-cols-3 h-full divide-x">
          {/* Panel Trái: Chatbox, Tệp nguồn */}
          <div className="flex flex-col h-full bg-muted/20">
            <div className="p-4 border-b font-semibold">Tệp nguồn & Chatbox</div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div className="p-3 bg-card rounded border text-sm shadow-sm">
                  (Dữ liệu dự án, file nguồn sẽ nằm đây)
                </div>
              </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <Input placeholder="Gõ yêu cầu vào chatbox..." />
            </div>
          </div>

          {/* Panel Giữa: Danh sách Media */}
          <div className="flex flex-col h-full bg-background">
            <div className="p-4 border-b font-semibold flex justify-between items-center">
              <span>Danh sách Media</span>
              <Button size="sm">Export Video</Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Demo 1 câu thoại */}
                <div className="flex items-start gap-4 p-3 border rounded shadow-sm">
                  <div className="w-24 h-24 bg-muted flex items-center justify-center rounded">
                    Media
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">1. Lời thoại câu 1...</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline">Tìm Source Khác</Button>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Panel Phải: AI Script Rewrite */}
          <div className="flex flex-col h-full bg-muted/10">
            <div className="p-4 border-b font-semibold">Kịch bản AI</div>
            <div className="p-4 border-b">
              <div className="flex gap-2">
                <Input placeholder="Nhập Link bài báo / Từ khóa" />
                <Button>Rewrite</Button>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              <Textarea 
                className="min-h-[400px] h-full w-full resize-none" 
                placeholder="Kịch bản AI sẽ hiển thị ở đây..."
              />
            </ScrollArea>
          </div>
        </div>
      </Main>
    </>
  )
}

const topNav = [
  {
    title: 'Studio',
    href: '/',
    isActive: true,
    disabled: false,
  }
]
