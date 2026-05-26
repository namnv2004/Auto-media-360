import { ContentSection } from '../components/content-section'
import { APIKeysForm } from './profile-form'

export function SettingsProfile() {
  return (
    <ContentSection
      title='API Keys Configuration'
      desc='Cấu hình các API Key cá nhân của bạn để sử dụng trực tiếp cho các tác vụ nghiên cứu thị trường và viết kịch bản AI.'
    >
      <APIKeysForm />
    </ContentSection>
  )
}
