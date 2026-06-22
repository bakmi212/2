import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'

export default function PricingPage() {
  const plans = [
    { name: 'Starter', price: 29, desc: 'Perfect for individuals and small projects', features: ['5 Products', '1,000 Licenses', 'Basic Analytics', 'Email Support', '1 Team Member'], popular: false },
    { name: 'Professional', price: 79, desc: 'Ideal for growing businesses', features: ['25 Products', '10,000 Licenses', 'Advanced Analytics', 'Priority Support', '5 Team Members', 'API Access', 'Custom Branding'], popular: true },
    { name: 'Enterprise', price: 199, desc: 'For large organizations with custom needs', features: ['Unlimited Products', 'Unlimited Licenses', 'Custom Analytics', 'Dedicated Support', 'Unlimited Team Members', 'Full API Access', 'Custom Branding', 'SLA Guarantee'], popular: false },
  ]

  return (
    <div className="py-20">
      <section className="container mx-auto px-4 mb-16">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">Pricing Plans</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Simple, transparent pricing</h1>
          <p className="text-lg text-muted-foreground">Choose the plan that fits your needs. All plans include a 14-day free trial.</p>
        </div>
      </section>
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.name} className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
              {plan.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.desc}</CardDescription>
                <div className="mt-4"><span className="text-4xl font-bold">${plan.price}</span><span className="text-muted-foreground">/month</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /><span className="text-sm">{feature}</span></li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={plan.popular ? 'default' : 'outline'} asChild><Link href="/auth/register">Get Started</Link></Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
