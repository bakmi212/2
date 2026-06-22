'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2, Plus } from 'lucide-react'

interface Category { id: string; name: string; slug: string; is_active: boolean; description: string | null }

export default function AdminCategoriesPage() {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('categories').select('*').order('name')
      setCategories((data as Category[]) || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div>
      <div className="mb-8 flex items-center justify-between"><div><h1 className="text-3xl font-bold">Categories</h1><p className="text-muted-foreground">Manage product categories</p></div><Button><Plus className="h-4 w-4 mr-2" />Add Category</Button></div>
      <Card>
        <CardHeader><CardTitle>All Categories ({categories.length})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full"><thead><tr className="border-b"><th className="text-left py-3 px-2">Name</th><th className="text-left py-3 px-2">Slug</th><th className="text-left py-3 px-2">Description</th><th className="text-left py-3 px-2">Status</th></tr></thead><tbody>
            {categories.map((cat) => (<tr key={cat.id} className="border-b"><td className="py-3 px-2 font-medium">{cat.name}</td><td className="py-3 px-2 text-muted-foreground">{cat.slug}</td><td className="py-3 px-2 text-sm text-muted-foreground">{cat.description || '-'}</td><td className="py-3 px-2"><Badge variant={cat.is_active ? 'default' : 'secondary'}>{cat.is_active ? 'Active' : 'Inactive'}</Badge></td></tr>))}
          </tbody></table>
        </CardContent>
      </Card>
    </div>
  )
}
