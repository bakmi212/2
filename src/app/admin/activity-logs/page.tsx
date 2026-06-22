'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface Log { id: string; action: string; entity_type: string; details: any; created_at: string; user: { email: string } | null }
interface LogRow { id: string; action: string; entity_type: string; details: any; created_at: string; user: { email: string }[] }

export default function AdminActivityLogsPage() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<Log[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase.from('activity_logs').select('id, action, entity_type, details, created_at, user:profiles(email)').order('created_at', { ascending: false }).limit(100)
      const formatted: Log[] = (data as LogRow[])?.map(row => ({
        id: row.id, action: row.action, entity_type: row.entity_type, details: row.details, created_at: row.created_at,
        user: row.user?.[0] || null
      })) || []
      setLogs(formatted)
      setLoading(false)
    }
    fetchLogs()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Activity Logs</h1><p className="text-muted-foreground">{logs.length} recent activities</p></div>

      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead><tr className="border-b"><th className="text-left py-3 px-4">Action</th><th className="text-left py-3 px-4">Entity</th><th className="text-left py-3 px-4">User</th><th className="text-left py-3 px-4">Date</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium">{log.action}</td>
                  <td className="py-3 px-4 text-muted-foreground">{log.entity_type || '-'}</td>
                  <td className="py-3 px-4">{log.user?.email || 'System'}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
