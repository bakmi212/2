'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface SiteSetting { key: string; value: string }

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('site_settings').select('key, value')
      if (data) { const map: Record<string, string> = {}; data.forEach((s: SiteSetting) => { map[s.key] = s.value }); setSettings(map) }
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    for (const [key, value] of Object.entries(settings)) { await supabase.from('site_settings').update({ value }).eq('key', key) }
    toast.success('Settings saved')
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Settings</h1><p className="text-muted-foreground">Configure platform settings</p></div>
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Site Settings</CardTitle><CardDescription>General platform configuration</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Site Name</Label><Input value={settings.site_name || ''} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} disabled={saving} /></div>
          <div className="space-y-2"><Label>Site Description</Label><Input value={settings.site_description || ''} onChange={(e) => setSettings({ ...settings, site_description: e.target.value })} disabled={saving} /></div>
          <div className="space-y-2"><Label>Contact Email</Label><Input value={settings.contact_email || ''} onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })} disabled={saving} /></div>
          <div className="space-y-2"><Label>Referral Commission (%)</Label><Input type="number" value={settings.referral_commission_percent || '10'} onChange={(e) => setSettings({ ...settings, referral_commission_percent: e.target.value })} disabled={saving} /></div>
          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  )
}
