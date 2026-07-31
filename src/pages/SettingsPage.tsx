import { AIProviderSection } from '@/components/settings/AIProviderSection'

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="font-display text-xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Configure your workspace.</p>

      <div className="mt-8 space-y-10">
        <AIProviderSection />
        {/* Future sections: notifications, job agent schedule, account… */}
      </div>
    </div>
  )
}
