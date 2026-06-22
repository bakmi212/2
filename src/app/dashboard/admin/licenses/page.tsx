'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface License { id: string; license_key: string; status: string; expires_at: string | null; user: { email: string } | null; product: { name: string } | null }
interface LicenseRow { id: string; license_key: string; status: string; expires_at: string | null; user: { email: string }[]; product: { name: string }[] }

export default function AdminLicensesPage() {
  const [loading, setLoading] = useState(true)
  const [licenses, setLicenses] = useState<License[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('user_licenses').select('id, license_key, status, expires_at, user:profiles(email), product:products(name)').order('created_at', { ascending: false })
      const formatted: License[] = (data as LicenseRow[])?.map(row => ({
        id: row.id, license_key: row.license_key, status: row.status, expires_at: row.expires_at,
        user: row.user?.[0] || null, product: row.product?.[0] || null
      })) || []
      setLicenses(formatted)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Licenses</h1><p className="text-muted-foreground">Manage software licenses</p></div>
      <Card>
        <CardHeader><CardTitle>All Licenses ({licenses.length})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full"><thead><tr className="border-b"><th className="text-left py-3 px-2">User</th><th className="text-left py-3 px-2">Product</th><th className="text-left py-3 px-2">License Key</th><th className="text-left py-3 px-2">Status</th><th className="text-left py-3 px-2">Expires</th></tr></thead><tbody>
            {licenses.map((lic) => (<tr key={lic.id} className="border-b"><td className="py-3 px-2">{lic.user?.email || '-'}</td><td className="py-3 px-2">{lic.product?.name || '-'}</td><td className="py-3 px-2 font-mono text-sm">{lic.license_key.slice(0, 8)}...{lic.license_key.slice(-8)}</td><td className="py-3 px-2"><Badge variant={lic.status === 'active' ? 'default' : 'secondary'}>{lic.status}</Badge></td><td className="py-3 px-2 text-sm text-muted-foreground">{lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : 'Never'}</td></tr>))}
          </tbody></table>
        </CardContent>
      </Card>
    </div>
  )
}
