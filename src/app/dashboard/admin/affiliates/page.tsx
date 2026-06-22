'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface Referral { id: string; status: string; commission: number; created_at: string; referrer: { email: string } | null; referee: { email: string } | null }
interface ReferralRow { id: string; status: string; commission: number; created_at: string; referrer: { email: string }[]; referee: { email: string }[] }

export default function AdminAffiliatesPage() {
  const [loading, setLoading] = useState(true)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('referrals').select('id, status, commission, created_at, referrer:profiles!referrals_referrer_id_fkey(email), referee:profiles!referrals_referee_id_fkey(email)').order('created_at', { ascending: false })
      const formatted: Referral[] = (data as ReferralRow[])?.map(row => ({
        id: row.id, status: row.status, commission: row.commission, created_at: row.created_at,
        referrer: row.referrer?.[0] || null, referee: row.referee?.[0] || null
      })) || []
      setReferrals(formatted)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  const totalCommission = referrals.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.commission || 0), 0)

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Affiliates</h1><p className="text-muted-foreground">Manage referral program</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card><CardHeader><CardTitle className="text-sm">Total Referrals</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{referrals.length}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Completed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{referrals.filter(r => r.status === 'completed').length}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Total Payouts</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${totalCommission}</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>All Referrals</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full"><thead><tr className="border-b"><th className="text-left py-3 px-2">Referrer</th><th className="text-left py-3 px-2">Referee</th><th className="text-left py-3 px-2">Commission</th><th className="text-left py-3 px-2">Status</th><th className="text-left py-3 px-2">Date</th></tr></thead><tbody>
            {referrals.map((ref) => (<tr key={ref.id} className="border-b"><td className="py-3 px-2">{ref.referrer?.email || '-'}</td><td className="py-3 px-2">{ref.referee?.email || '-'}</td><td className="py-3 px-2">${ref.commission}</td><td className="py-3 px-2"><Badge variant={ref.status === 'completed' ? 'default' : 'secondary'}>{ref.status}</Badge></td><td className="py-3 px-2 text-sm text-muted-foreground">{new Date(ref.created_at).toLocaleDateString()}</td></tr>))}
          </tbody></table>
        </CardContent>
      </Card>
    </div>
  )
}
