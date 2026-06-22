'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, CreditCard, ArrowRight } from 'lucide-react'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('key, value')
      const settingsMap: Record<string, string> = {}
      data?.forEach(s => { settingsMap[s.key] = s.value || '' })
      setSettings(settingsMap)
      setLoading(false)
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' })
    }
    toast.success('Settings saved')
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Configure platform settings</p>
      </div>

      {/* Quick Nav */}
      <Link href="/admin/settings/payment">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-100 bg-blue-50/40">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Payment Settings</p>
              <p className="text-sm text-slate-500">Kelola metode pembayaran, rekening bank, e-wallet & QRIS</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </CardContent>
        </Card>
      </Link>

      <Card>
        <CardHeader><CardTitle>General Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Site Name</Label>
            <Input value={settings.site_name || ''} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Site Description</Label>
            <Input value={settings.site_description || ''} onChange={(e) => setSettings({ ...settings, site_description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input value={settings.contact_email || ''} onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Currency Symbol</Label>
            <Input value={settings.currency_symbol || '$'} onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })} />
          </div>
          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  )
}
