'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Shield } from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profile, setProfile] = useState({ full_name: '', email: '' })
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' })
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).single()
      setProfile({ full_name: data?.full_name || '', email: user.email || '' })
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update({ full_name: profile.full_name }).eq('user_id', user.id)
    if (error) toast.error('Failed to save profile')
    else toast.success('Profile updated')
    setSavingProfile(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwords.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.newPassword })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated successfully')
      setPasswords({ newPassword: '', confirmPassword: '' })
    }
    setSavingPassword(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Settings</h1><p className="text-muted-foreground">Manage your account settings</p></div>

      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Update your profile information</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="full_name">Full Name</Label><Input id="full_name" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} disabled={savingProfile} /></div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" value={profile.email} disabled /></div>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>{savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Profile</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" placeholder="Enter new password (min 8 characters)" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} disabled={savingPassword} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" placeholder="Confirm your new password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} disabled={savingPassword} />
              </div>
              <Button type="submit" disabled={savingPassword}>{savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Password</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
