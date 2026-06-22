'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { createBrowserClient } from '@/lib/supabase/client'
import {
  Loader2, Search, Edit, Trash2, Eye,
  Mail, Phone, MapPin, Building2, Globe, Calendar, Hash
} from 'lucide-react'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string | null
  postal_code: string | null
  bio: string | null
  website: string | null
  company: string | null
  role: string
  language: string | null
  referral_code: string | null
  created_at: string
}

type EditForm = {
  full_name: string
  email: string
  phone: string
  company: string
  city: string
  country: string
  postal_code: string
  address: string
  bio: string
  website: string
  role: string
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [search, setSearch] = useState('')
  const [editUser, setEditUser] = useState<UserProfile | null>(null)
  const [viewUser, setViewUser] = useState<UserProfile | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState<EditForm>({
    full_name: '', email: '', phone: '', company: '',
    city: '', country: '', postal_code: '', address: '', bio: '', website: '', role: 'member',
  })

  const supabase = createBrowserClient()

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, user_id, email, full_name, avatar_url, phone, address, city, country, postal_code, bio, website, company, role, language, referral_code, created_at')
      .order('created_at', { ascending: false })
    setUsers((data as UserProfile[]) || [])
    setLoading(false)
  }

  const openEdit = (user: UserProfile) => {
    setEditUser(user)
    setForm({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      company: user.company || '',
      city: user.city || '',
      country: user.country || '',
      postal_code: user.postal_code || '',
      address: user.address || '',
      bio: user.bio || '',
      website: user.website || '',
      role: user.role || 'member',
    })
  }

  const handleSave = async () => {
    if (!editUser) return
    if (!form.full_name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name || null,
      phone: form.phone || null,
      company: form.company || null,
      city: form.city || null,
      country: form.country || null,
      postal_code: form.postal_code || null,
      address: form.address || null,
      bio: form.bio || null,
      website: form.website || null,
      role: form.role,
      updated_at: new Date().toISOString(),
    }).eq('id', editUser.id)
    if (error) {
      toast.error('Failed to update user')
    } else {
      toast.success('User updated successfully')
      setEditUser(null)
      fetchUsers()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteUser) return
    setDeleting(true)
    const { error } = await supabase.from('profiles').delete().eq('id', deleteUser.id)
    if (error) {
      toast.error('Failed to delete user')
    } else {
      toast.success('User deleted')
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id))
      setDeleteUser(null)
    }
    setDeleting(false)
  }

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.company?.toLowerCase().includes(search.toLowerCase())
  )

  const roleColor = (role: string) => role === 'admin' ? 'default' : 'secondary'
  const initials = (user: UserProfile) => {
    if (user.full_name) return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    return user.email?.[0]?.toUpperCase() || '?'
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">{users.length} registered users</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Badge variant="default" className="text-xs">admin</Badge> {users.filter(u => u.role === 'admin').length}</span>
            <span className="flex items-center gap-1"><Badge variant="secondary" className="text-xs">member</Badge> {users.filter(u => u.role !== 'admin').length}</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Manage Users</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 text-sm font-medium">User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Company</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Joined</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No users found</td></tr>
                )}
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                          {initials(user)}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{user.full_name || <span className="text-muted-foreground italic">No name</span>}</div>
                          {user.city && <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{user.city}{user.country ? `, ${user.country}` : ''}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{user.email}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{user.company || '-'}</td>
                    <td className="py-3 px-4">
                      <Badge variant={roleColor(user.role)} className="capitalize">{user.role || 'member'}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewUser(user)} title="View details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(user)} title="Edit user">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteUser(user)} title="Delete user">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update user profile data and role</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} disabled className="bg-muted" placeholder="Email (read-only)" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+62..." />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City" />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="Country" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Postal Code</Label>
              <Input value={form.postal_code} onChange={e => setForm({ ...form, postal_code: e.target.value })} placeholder="Postal code" />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Input value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Short bio" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditUser(null)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewUser} onOpenChange={(open) => !open && setViewUser(null)}>
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>Full profile information</DialogDescription>
        </DialogHeader>
        {viewUser && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                {initials(viewUser)}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{viewUser.full_name || 'No name'}</h3>
                <Badge variant={roleColor(viewUser.role)} className="capitalize">{viewUser.role || 'member'}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground"><Mail className="h-4 w-4 flex-shrink-0" /><span>{viewUser.email}</span></div>
              {viewUser.phone && <div className="flex items-center gap-3 text-muted-foreground"><Phone className="h-4 w-4 flex-shrink-0" /><span>{viewUser.phone}</span></div>}
              {viewUser.company && <div className="flex items-center gap-3 text-muted-foreground"><Building2 className="h-4 w-4 flex-shrink-0" /><span>{viewUser.company}</span></div>}
              {(viewUser.city || viewUser.country) && <div className="flex items-center gap-3 text-muted-foreground"><MapPin className="h-4 w-4 flex-shrink-0" /><span>{[viewUser.city, viewUser.country].filter(Boolean).join(', ')}</span></div>}
              {viewUser.address && <div className="flex items-center gap-3 text-muted-foreground"><MapPin className="h-4 w-4 flex-shrink-0" /><span>{viewUser.address}</span></div>}
              {viewUser.website && <div className="flex items-center gap-3 text-muted-foreground"><Globe className="h-4 w-4 flex-shrink-0" /><span>{viewUser.website}</span></div>}
              {viewUser.referral_code && <div className="flex items-center gap-3 text-muted-foreground"><Hash className="h-4 w-4 flex-shrink-0" /><span>Referral: {viewUser.referral_code}</span></div>}
              <div className="flex items-center gap-3 text-muted-foreground"><Calendar className="h-4 w-4 flex-shrink-0" /><span>Joined {new Date(viewUser.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
              {viewUser.bio && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p className="text-xs font-medium mb-1">Bio</p>
                  <p className="text-muted-foreground">{viewUser.bio}</p>
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setViewUser(null)}>Close</Button>
          <Button onClick={() => { setViewUser(null); openEdit(viewUser!) }}>
            <Edit className="mr-2 h-4 w-4" />Edit User
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{deleteUser?.full_name || deleteUser?.email}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteUser(null)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete User
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
