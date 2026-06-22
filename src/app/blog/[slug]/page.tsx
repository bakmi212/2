import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { createServerClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerClient()
  const { data: post } = await supabase.from('blog_posts').select('title, seo_title, seo_description').eq('slug', slug).eq('status', 'published').single()
  if (!post) return {}
  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.title,
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerClient()
  const { data: post } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('status', 'published').single()
  if (!post) notFound()

  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <Link href="/blog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>

        {post.featured_image && (
          <div className="aspect-[16/9] rounded-xl overflow-hidden mb-8">
            <img src={post.featured_image} alt={post.title} className="object-cover w-full h-full" />
          </div>
        )}

        <Badge variant="secondary" className="mb-4">
          {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </Badge>

        <h1 className="text-3xl md:text-4xl font-bold mb-6">{post.title}</h1>

        <div className="prose prose-slate max-w-none">
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="mt-8 pt-8 border-t flex flex-wrap gap-2">
            {post.tags.map((tag: string) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
