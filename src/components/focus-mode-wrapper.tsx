'use client'

import { useFocusMode } from './focus-mode-provider'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from './ui/button'

interface FocusModeWrapperProps {
  children: React.ReactNode
  onSave?: () => void
  saving?: boolean
}

export function FocusModeWrapper({ children, onSave, saving }: FocusModeWrapperProps) {
  const { isFocusMode, hasUnsavedChanges, backPath } = useFocusMode()

  if (!isFocusMode) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Focus Mode Header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-background border-b z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {backPath && (
            <Link
              href={backPath}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          )}
          {hasUnsavedChanges && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
              Unsaved changes
            </span>
          )}
        </div>
        {onSave && (
          <Button size="sm" onClick={onSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>
      {/* Content */}
      <div className="pt-14">
        {children}
      </div>
    </div>
  )
}
