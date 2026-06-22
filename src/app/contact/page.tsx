'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Mail, MapPin, Phone } from 'lucide-react'

export default function ContactPage() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success("Message sent successfully! We'll get back to you soon.")
    setFormData({ name: '', email: '', subject: '', message: '' })
    setLoading(false)
  }

  return (
    <div className="py-20">
      <section className="container mx-auto px-4 mb-16">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">Contact Us</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Get in touch</h1>
          <p className="text-lg text-muted-foreground">Have a question or need help? We are here to assist you.</p>
        </div>
      </section>
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="h-fit">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4"><Mail className="h-5 w-5 text-primary" /></div>
              <CardTitle className="text-lg">Email</CardTitle>
              <CardDescription>support@saasplatform.com</CardDescription>
            </CardHeader>
          </Card>
          <Card className="h-fit">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4"><Phone className="h-5 w-5 text-primary" /></div>
              <CardTitle className="text-lg">Phone</CardTitle>
              <CardDescription>+1 (555) 123-4567</CardDescription>
            </CardHeader>
          </Card>
          <Card className="h-fit">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4"><MapPin className="h-5 w-5 text-primary" /></div>
              <CardTitle className="text-lg">Location</CardTitle>
              <CardDescription>San Francisco, CA</CardDescription>
            </CardHeader>
          </Card>
        </div>
        <Card className="max-w-2xl mx-auto mt-12">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
              <CardDescription>Fill out the form below and we will respond within 24 hours.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" placeholder="Your name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={loading} /></div>
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="your@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required disabled={loading} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="subject">Subject</Label><Input id="subject" placeholder="How can we help?" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required disabled={loading} /></div>
              <div className="space-y-2"><Label htmlFor="message">Message</Label><textarea id="message" className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Tell us more about your inquiry..." value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required disabled={loading} /></div>
            </CardContent>
            <CardFooter><Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send Message</Button></CardFooter>
          </form>
        </Card>
      </section>
    </div>
  )
}
