export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-transparent">
      <div className="container mx-auto px-4 py-3">
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} SaaS Platform. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
