'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface User { id: string; email: string; full_name: string | null; role: { name: string } | null; created_at: string }
interface UserRow { id: string; email: string; full_name: string | null; created_at: string; user_roles: { role: { name: string }[] }[] }

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('profiles').select('id, email, full_name, created_at, user_roles(role:roles(name))').order('created_at', { ascending: false })
      const formatted: User[] = (data as UserRow[])?.map(u => ({
        id: u.id, email: u.email, full_name: u.full_name, created_at: u.created_at,
        role: u.user_roles?.[0]?.role?.[0] || null
      })) || []
      setUsers(formatted)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8"><h1 className="text-3xl font-bold">Users</h1><p className="text-muted-foreground">Manage platform users</p></div>
      <Card>
        <CardHeader><CardTitle>All Users ({users.length})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full"><thead><tr className="border-b"><th className="text-left py-3 px-2">Name</th><th className="text-left py-3 px-2">Email</th><th className="text-left py-3 px-2">Role</th><th className="text-left py-3 px-2">Joined</th></tr></thead><tbody>
            {users.map((user) => (<tr key={user.id} className="border-b"><td className="py-3 px-2">{user.full_name || '-'}</td><td className="py-3 px-2">{user.email}</td><td className="py-3 px-2"><Badge variant={user.role?.name === 'admin' ? 'default' : 'secondary'}>{user.role?.name || 'member'}</Badge></td><td className="py-3 px-2 text-sm text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</td></tr>))}
          </tbody></table>
        </CardContent>
      </Card>
    </div>
  )
}
