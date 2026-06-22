'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2, Receipt } from 'lucide-react'

interface Transaction {
  id: string
  amount: number
  payment_method: string | null
  status: string
  created_at: string
  transaction_id: string | null
  product: { name: string } | null
}
interface TransactionRow {
  id: string
  amount: number
  payment_method: string | null
  status: string
  created_at: string
  transaction_id: string | null
  product: { name: string }[]
}

export default function TransactionsPage() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('transactions').select('id, amount, payment_method, status, created_at, transaction_id, product:products(name)').eq('user_id', user.id).order('created_at', { ascending: false })
      const formatted: Transaction[] = (data as TransactionRow[])?.map(row => ({
        id: row.id, amount: row.amount, payment_method: row.payment_method, status: row.status, created_at: row.created_at, transaction_id: row.transaction_id,
        product: row.product?.[0] || null
      })) || []
      setTransactions(formatted)
      setLoading(false)
    }
    fetchData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/10 text-green-500'
      case 'pending': return 'bg-yellow-500/10 text-yellow-500'
      case 'failed': return 'bg-red-500/10 text-red-500'
      default: return 'bg-gray-500/10 text-gray-500'
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Transactions</h1><p className="text-muted-foreground">{transactions.length} transactions</p></div>

      {transactions.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><h3 className="font-semibold mb-2">No transactions yet</h3><p className="text-muted-foreground mb-4">Your transaction history will appear here</p><Link href="/products" className="text-primary hover:underline">Browse Products</Link></CardContent></Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b"><th className="text-left py-3 px-4 text-sm font-medium">Transaction ID</th><th className="text-left py-3 px-4 text-sm font-medium">Product</th><th className="text-left py-3 px-4 text-sm font-medium">Amount</th><th className="text-left py-3 px-4 text-sm font-medium">Payment Method</th><th className="text-left py-3 px-4 text-sm font-medium">Status</th><th className="text-left py-3 px-4 text-sm font-medium">Date</th></tr></thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-mono text-sm">{tx.transaction_id || tx.id.slice(0, 8)}</td>
                      <td className="py-3 px-4">{tx.product?.name || '-'}</td>
                      <td className="py-3 px-4 font-semibold">${tx.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-muted-foreground">{tx.payment_method || '-'}</td>
                      <td className="py-3 px-4"><Badge className={getStatusColor(tx.status)}>{tx.status}</Badge></td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
