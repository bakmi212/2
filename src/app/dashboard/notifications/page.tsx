'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/client'
import { Bell, Loader2 } from 'lucide-react'

interface Notification { id: string; title: string; message: string; type: string; read: boolean; created_at: string }

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
      setNotifications((data as Notification[]) || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Notifications</h1><p className="text-muted-foreground">{unreadCount} unread</p></div>
        {unreadCount > 0 && <Button variant="outline" onClick={markAllAsRead}>Mark all as read</Button>}
      </div>
      {notifications.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><h3 className="font-semibold mb-2">No notifications</h3><p className="text-muted-foreground">You are all caught up!</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card key={notification.id} className={notification.read ? 'opacity-60' : ''}>
              <CardContent className="p-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1"><span className="font-semibold">{notification.title}</span>{!notification.read && <Badge>New</Badge>}</div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(notification.created_at).toLocaleString()}</p>
                </div>
                {!notification.read && <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>Mark read</Button>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
