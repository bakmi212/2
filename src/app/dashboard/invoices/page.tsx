'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2, FileText, Download } from 'lucide-react'

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<{ id: string; invoice_number: string; total_amount: number; status: string; created_at: string }[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('invoices').select('id, invoice_number, total_amount, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false })
      setInvoices(data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/10 text-green-500'
      case 'draft': return 'bg-gray-500/10 text-gray-500'
      case 'sent': return 'bg-blue-500/10 text-blue-500'
      default: return 'bg-gray-500/10 text-gray-500'
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Invoices</h1><p className="text-muted-foreground">{invoices.length} invoices</p></div>

      {invoices.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><h3 className="font-semibold mb-2">No invoices yet</h3><p className="text-muted-foreground mb-4">Invoices will appear here after purchase</p><Link href="/products" className="text-primary hover:underline">Browse Products</Link></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead><tr className="border-b"><th className="text-left py-3 px-4">Invoice</th><th className="text-left py-3 px-4">Amount</th><th className="text-left py-3 px-4">Status</th><th className="text-left py-3 px-4">Date</th></tr></thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-mono text-sm">{invoice.invoice_number}</td>
                    <td className="py-3 px-4 font-semibold">${invoice.total_amount}</td>
                    <td className="py-3 px-4"><Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge></td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{new Date(invoice.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
