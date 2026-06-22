'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createBrowserClient } from '@/lib/supabase/client'
import { Gift, Loader2, Users, DollarSign } from 'lucide-react'

export default function ReferralsPage() {
  const [loading, setLoading] = useState(true)
  const [referralCode, setReferralCode] = useState('')
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, earnings: 0 })
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('referral_code').eq('user_id', user.id).single()
      if (profile?.referral_code) setReferralCode(profile.referral_code)
      else {
        const code = `REF-${user.id.slice(0, 8).toUpperCase()}`
        await supabase.from('profiles').update({ referral_code: code }).eq('user_id', user.id)
        setReferralCode(code)
      }
      const { data: referrals } = await supabase.from('referrals').select('id, status, commission').eq('referrer_id', user.id)
      if (referrals) {
        setStats({
          total: referrals.length,
          completed: referrals.filter(r => r.status === 'completed').length,
          pending: referrals.filter(r => r.status === 'pending').length,
          earnings: referrals.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.commission || 0), 0),
        })
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${referralCode}`

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Referrals</h1><p className="text-muted-foreground">Invite friends and earn rewards</p></div>
      <Card className="mb-8">
        <CardHeader><CardTitle>Your Referral Link</CardTitle><CardDescription>Share this link with friends to earn commissions</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <input readOnly value={referralLink} className="flex-1 bg-muted px-4 py-2 rounded-md text-sm" />
            <button onClick={() => { navigator.clipboard.writeText(referralLink); alert('Link copied!') }} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Copy</button>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Total Referrals</span></div><div className="text-2xl font-bold mt-2">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Gift className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Completed</span></div><div className="text-2xl font-bold mt-2">{stats.completed}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Loader2 className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Pending</span></div><div className="text-2xl font-bold mt-2">{stats.pending}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Earnings</span></div><div className="text-2xl font-bold mt-2">${stats.earnings}</div></CardContent></Card>
      </div>
    </div>
  )
}
