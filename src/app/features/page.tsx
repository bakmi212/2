import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Zap, Shield, Clock, Users, BarChart3, Lock, Globe, Headphones } from 'lucide-react'

export default function FeaturesPage() {
  const features = [
    { icon: Zap, title: 'Lightning Fast Delivery', desc: 'Instant access to all digital products with automated delivery systems.' },
    { icon: Shield, title: 'Enterprise Security', desc: 'Bank-grade encryption and security protocols protect your data.' },
    { icon: Clock, title: '24/7 Availability', desc: 'Access your products and licenses anytime, anywhere.' },
    { icon: Users, title: 'Team Management', desc: 'Collaborate with your team using advanced permission controls.' },
    { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Track usage, revenue, and performance with detailed insights.' },
    { icon: Lock, title: 'License Management', desc: 'Generate, track, and manage software licenses effortlessly.' },
    { icon: Globe, title: 'Global Access', desc: 'Support for multiple regions and payment methods worldwide.' },
    { icon: Headphones, title: 'Premium Support', desc: 'Dedicated support team ready to help you succeed.' },
  ]

  return (
    <div className="py-20">
      <section className="container mx-auto px-4 mb-20">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">Platform Features</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Everything you need to succeed</h1>
          <p className="text-lg text-muted-foreground">Our platform provides all the tools and features you need to manage, distribute, and monetize your digital products.</p>
        </div>
      </section>
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
