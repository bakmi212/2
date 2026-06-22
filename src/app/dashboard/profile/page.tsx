'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, User, Mail, Calendar } from 'lucide-react'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({ full_name: '', email: '', phone: '', created_at: '', role: '' })
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('full_name, email, phone, created_at, role').eq('user_id', user.id).single()
      setProfile({ full_name: data?.full_name || '', email: user.email || '', phone: data?.phone || '', created_at: data?.created_at || '', role: data?.role || 'member' })
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update({ full_name: profile.full_name, phone: profile.phone }).eq('user_id', user.id)
    if (error) toast.error('Failed to save profile')
    else toast.success('Profile updated successfully')
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Profile</h1><p className="text-muted-foreground">Manage your personal information</p></div>

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Personal Information</CardTitle><CardDescription>Update your profile details</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center"><User className="h-8 w-8 text-muted-foreground" /></div>
            <div><p className="font-semibold">{profile.full_name || 'User'}</p><p className="text-sm text-muted-foreground">{profile.email}</p></div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="full_name">Full Name</Label><Input id="full_name" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} disabled={saving} /></div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><Input id="email" value={profile.email} disabled /></div></div>
            <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} disabled={saving} placeholder="Enter your phone number" /></div>
            <div className="space-y-2"><Label>Member Since</Label><div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /><span>{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</span></div></div>
            <div className="space-y-2"><Label>Role</Label><div className="text-sm font-medium capitalize text-primary">{profile.role}</div></div>
          </div>

          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  )
}
