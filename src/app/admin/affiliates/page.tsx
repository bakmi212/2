'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface Affiliate { id: string; referral_code: string; total_earnings: number; total_referrals: number; status: string; user: { email: string } | null }
interface AffiliateRow { id: string; referral_code: string; total_earnings: number; total_referrals: number; status: string; user: { email: string }[] }

export default function AdminAffiliatesPage() {
  const [loading, setLoading] = useState(true)
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchAffiliates = async () => {
      const { data } = await supabase.from('affiliates').select('id, referral_code, total_earnings, total_referrals, status, user:profiles(email)').order('created_at', { ascending: false })
      const formatted: Affiliate[] = (data as AffiliateRow[])?.map(row => ({
        id: row.id, referral_code: row.referral_code, total_earnings: row.total_earnings, total_referrals: row.total_referrals, status: row.status,
        user: row.user?.[0] || null
      })) || []
      setAffiliates(formatted)
      setLoading(false)
    }
    fetchAffiliates()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Affiliates</h1><p className="text-muted-foreground">{affiliates.length} affiliates</p></div>

      <Card>
        <CardHeader><CardTitle>All Affiliates</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead><tr className="border-b"><th className="text-left py-3 px-4">User</th><th className="text-left py-3 px-4">Referral Code</th><th className="text-left py-3 px-4">Referrals</th><th className="text-left py-3 px-4">Earnings</th><th className="text-left py-3 px-4">Status</th></tr></thead>
            <tbody>
              {affiliates.map((affiliate) => (
                <tr key={affiliate.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4">{affiliate.user?.email || '-'}</td>
                  <td className="py-3 px-4 font-mono">{affiliate.referral_code}</td>
                  <td className="py-3 px-4">{affiliate.total_referrals}</td>
                  <td className="py-3 px-4 font-semibold">${affiliate.total_earnings?.toFixed(2) || '0.00'}</td>
                  <td className="py-3 px-4"><Badge variant={affiliate.status === 'active' ? 'default' : 'secondary'}>{affiliate.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
