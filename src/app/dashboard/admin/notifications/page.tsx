'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Notification { id: string; title: string; message: string; type: string; read: boolean; created_at: string; user: { email: string } | null }
interface NotificationRow { id: string; title: string; message: string; type: string; read: boolean; created_at: string; user: { email: string }[] }

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('notifications').select('id, title, message, type, read, created_at, user:profiles(email)').order('created_at', { ascending: false }).limit(100)
      const formatted: Notification[] = (data as NotificationRow[])?.map(row => ({
        id: row.id, title: row.title, message: row.message, type: row.type, read: row.read, created_at: row.created_at,
        user: row.user?.[0] || null
      })) || []
      setNotifications(formatted)
      setLoading(false)
    }
    fetchData()
  }, [])

  const sendBroadcast = async () => { toast.success('Broadcast feature coming soon!') }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div>
      <div className="mb-8 flex items-center justify-between"><div><h1 className="text-3xl font-bold">Notifications</h1><p className="text-muted-foreground">{unreadCount} unread notifications</p></div><Button onClick={sendBroadcast}>Send Broadcast</Button></div>
      <Card>
        <CardHeader><CardTitle>All Notifications ({notifications.length})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full"><thead><tr className="border-b"><th className="text-left py-3 px-2">User</th><th className="text-left py-3 px-2">Title</th><th className="text-left py-3 px-2">Type</th><th className="text-left py-3 px-2">Status</th><th className="text-left py-3 px-2">Date</th></tr></thead><tbody>
            {notifications.map((notif) => (<tr key={notif.id} className="border-b"><td className="py-3 px-2">{notif.user?.email || '-'}</td><td className="py-3 px-2"><span className="font-medium">{notif.title}</span><br /><span className="text-xs text-muted-foreground">{notif.message}</span></td><td className="py-3 px-2"><Badge variant="outline">{notif.type}</Badge></td><td className="py-3 px-2"><Badge variant={notif.read ? 'secondary' : 'default'}>{notif.read ? 'Read' : 'Unread'}</Badge></td><td className="py-3 px-2 text-sm text-muted-foreground">{new Date(notif.created_at).toLocaleString()}</td></tr>))}
          </tbody></table>
        </CardContent>
      </Card>
    </div>
  )
}
