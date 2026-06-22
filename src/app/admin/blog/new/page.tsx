'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Save, Globe, FileText } from 'lucide-react'

export default function NewBlogPostPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    status: 'draft' as 'draft' | 'published',
  })
  const supabase = createBrowserClient()

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleSave = async (publish = false) => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    const slug = form.slug || generateSlug(form.title)
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase.from('blog_posts').insert({
      title: form.title,
      slug,
      excerpt: form.excerpt || null,
      content: form.content,
      featured_image: form.featured_image || null,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
      seo_keywords: form.seo_keywords || null,
      status: publish ? 'published' : 'draft',
      published_at: publish ? new Date().toISOString() : null,
      author_id: user?.id || null,
    }).select().single()

    if (error) toast.error(error.message)
    else {
      toast.success(publish ? 'Post published!' : 'Draft saved!')
      router.push('/admin/blog')
    }
    setSaving(false)
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">New Blog Post</h1>
          <p className="text-muted-foreground">Create a new blog post</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Globe className="h-4 w-4 mr-2" />Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || generateSlug(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" />
          </div>
          <div className="space-y-2">
            <Label>Excerpt</Label>
            <textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Short summary..." />
          </div>
          <div className="space-y-2">
            <Label>Content *</Label>
            <textarea className="w-full min-h-[400px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write your post content here... (supports HTML)" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-muted/30 rounded-lg space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />SEO Settings</h3>
            <div className="space-y-2">
              <Label>SEO Title</Label>
              <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>SEO Description</Label>
              <textarea className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>SEO Keywords</Label>
              <Input value={form.seo_keywords} onChange={(e) => setForm({ ...form, seo_keywords: e.target.value })} placeholder="comma, separated" />
            </div>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg space-y-4">
            <h3 className="font-semibold">Featured Image</h3>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={form.featured_image} onChange={(e) => setForm({ ...form, featured_image: e.target.value })} placeholder="https://..." />
            </div>
            {form.featured_image && <img src={form.featured_image} className="w-full h-32 object-cover rounded-lg" />}
          </div>
        </div>
      </div>
    </div>
  )
}
