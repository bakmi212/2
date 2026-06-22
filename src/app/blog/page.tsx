import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createServerClient } from '@/lib/supabase/server'

export default async function BlogPage() {
  const supabase = await createServerClient()
  const { data: posts } = await supabase.from('blog_posts').select('*').eq('status', 'published').order('published_at', { ascending: false })

  return (
    <div className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Blog</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Latest news, tutorials, and insights from our team</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(posts || []).map((post: any) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group">
              <Card className="h-full hover:shadow-lg transition-all border-muted/60">
                <CardContent className="p-0">
                  <div className="aspect-[16/9] relative bg-muted rounded-t-lg overflow-hidden">
                    {post.featured_image ? (
                      <img src={post.featured_image} alt={post.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                        <span className="text-slate-300 font-semibold text-lg">Blog</span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <Badge variant="secondary" className="mb-2">{new Date(post.published_at || post.created_at).toLocaleDateString()}</Badge>
                    <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{post.title}</h2>
                    <p className="text-muted-foreground text-sm line-clamp-3">{post.excerpt || post.content.slice(0, 200)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        {(posts || []).length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p>No blog posts yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  )
}
