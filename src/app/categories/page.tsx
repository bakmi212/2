import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Folder } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'

export default async function CategoriesPage() {
  const supabase = await createServerClient()
  const { data: categories } = await supabase.from('categories').select('*').eq('is_active', true).order('name')

  return (
    <div className="py-20">
      <section className="container mx-auto px-4 mb-16">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">Categories</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Browse by Category</h1>
          <p className="text-lg text-muted-foreground">Explore our curated collection of digital products organized by category.</p>
        </div>
      </section>
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {(categories || []).map((category: { id: string; slug: string; name: string; description: string | null }) => (
            <Link key={category.id} href={`/categories/${category.slug}`}>
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardContent className="pt-6 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Folder className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 hover:text-primary transition-colors">{category.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{category.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
